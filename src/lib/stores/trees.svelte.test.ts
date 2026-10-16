import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ASSESSMENT } from '$lib/types/tree';
import type { NewTree, Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import {
	addTree,
	addVisit,
	applyTreeEnrichment,
	buildTreesPersistPayload,
	clearAllLocationLabels,
	ensureTreeHydrated,
	isTreeStoreFullyMediaHydrated,
	mergeDiskTreeWithCurrent,
	applyThumbsBootTrees,
	mergeTreesFromBackup,
	runPersistBatch,
	sortedTrees,
	toggleFavorite,
	updateTree,
	flushTreesPersist,
	treeStore,
	__resetTreesStoreForTests
} from './trees.svelte';

const mockGetTreeStorageVersion = vi.fn();
const mockPersistDirtyTrees = vi.fn();
const mockReplaceAllTreesInStorage = vi.fn();
const mockLoadTreesFromStorage = vi.fn();
const mockEnsureTreeStorageMigrated = vi.fn();
const mockHydrateTreeMedia = vi.fn();

vi.mock('$lib/utils/tree-storage/repository', () => ({
	getTreeStorageVersion: (...args: unknown[]) => mockGetTreeStorageVersion(...args),
	persistDirtyTrees: (...args: unknown[]) => mockPersistDirtyTrees(...args),
	replaceAllTreesInStorage: (...args: unknown[]) => mockReplaceAllTreesInStorage(...args),
	loadTreesFromStorage: (...args: unknown[]) => mockLoadTreesFromStorage(...args),
	loadTreesBootPhaseA: (...args: unknown[]) => mockLoadTreesFromStorage(...args),
	ensureTreeStorageMigrated: (...args: unknown[]) => mockEnsureTreeStorageMigrated(...args),
	hydrateTreeMedia: (...args: unknown[]) => mockHydrateTreeMedia(...args)
}));

vi.mock('$lib/utils/secure-idb', () => ({
	secureIdbGet: vi.fn().mockResolvedValue([]),
	secureIdbSet: vi.fn().mockResolvedValue(undefined),
	isMigrationBlockedError: vi.fn().mockReturnValue(false),
	isLocalEncryptionKeyMissingError: vi.fn().mockReturnValue(false)
}));

vi.mock('@capacitor/app', () => ({
	App: {
		addListener: vi.fn().mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) })
	}
}));

function createNewTree(species = 'Oak'): NewTree {
	return {
		species,
		notes: '',
		photos: [],
		voiceNote: null,
		latitude: 48.85,
		longitude: 2.35,
		accuracyMeters: 5,
		altitudeMeters: null,
		frontHeadingDegrees: null,
		isFavorite: false,
		climateHistory: null,
		locationLabel: null,
		cadastreInfo: null,
		harvestEthicsConfirmation: null,
		environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE,
		yrsAtCapture: null,
		assessment: { ...DEFAULT_ASSESSMENT }
	};
}

function createBackupTree(id: string, species: string): Tree {
	const capturedAt = '2026-01-01T12:00:00.000Z';
	return {
		...createNewTree(species),
		id,
		capturedAt,
		visits: [
			{
				id: `${id}-visit`,
				visitedAt: capturedAt,
				note: 'Initial',
				photos: []
			}
		]
	};
}

async function flushDeferredPersist(): Promise<void> {
	await vi.runAllTimersAsync();
}

describe('trees persist scheduling', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		__resetTreesStoreForTests();
		treeStore.loaded = true;
		mockGetTreeStorageVersion.mockResolvedValue(1);
		mockPersistDirtyTrees.mockResolvedValue(undefined);
		mockReplaceAllTreesInStorage.mockResolvedValue(undefined);
		mockHydrateTreeMedia.mockResolvedValue(undefined);
		vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
			callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
			return 1;
		});
	});

	it('flushes immediately after addTree', async () => {
		await addTree(createNewTree());

		expect(treeStore.trees).toHaveLength(1);
		expect(mockPersistDirtyTrees).toHaveBeenCalledTimes(1);
		const [trees, dirty] = mockPersistDirtyTrees.mock.calls[0]!;
		expect(trees).toHaveLength(1);
		expect(dirty.size).toBe(1);
	});

	it('flushes immediately after addTree with photo', async () => {
		const photo = 'data:image/jpeg;base64,QUJD';
		await addTree({ ...createNewTree(), photos: [photo], photoThumbs: [photo] });

		expect(mockPersistDirtyTrees).toHaveBeenCalledTimes(1);
		const [trees] = mockPersistDirtyTrees.mock.calls[0]!;
		expect(trees[0]?.photos[0]).toBe(photo);
		expect(trees[0]?.visits[0]?.photos).toEqual([photo]);
	});

	it('stores up to three photos on addTree initial visit', async () => {
		const photos = [
			'data:image/jpeg;base64,QQ==',
			'data:image/jpeg;base64,Qg==',
			'data:image/jpeg;base64,Qw=='
		];
		await addTree({ ...createNewTree(), photos, photoThumbs: photos });
		expect(treeStore.trees[0]?.visits[0]?.photos).toEqual(photos);
		expect(treeStore.trees[0]?.photos).toEqual(photos);
	});

	it('debounces lightweight tree edits', async () => {
		treeStore.trees = [createBackupTree('tree-1', 'Maple')];
		await toggleFavorite('tree-1');

		expect(mockPersistDirtyTrees).not.toHaveBeenCalled();
		await flushDeferredPersist();
		expect(mockPersistDirtyTrees).toHaveBeenCalledTimes(1);
	});

	it('does not drop notifyOnWindow edited during an in-flight persist', async () => {
		treeStore.trees = [createBackupTree('tree-1', 'Oak')];

		let releasePersist: () => void = () => {};
		mockPersistDirtyTrees.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					releasePersist = resolve;
				})
		);

		try {
			await updateTree('tree-1', { notes: 'first' });
			const inFlight = flushTreesPersist();
			for (let i = 0; i < 12; i += 1) {
				await Promise.resolve();
				if (mockPersistDirtyTrees.mock.calls.length === 1) break;
			}
			expect(mockPersistDirtyTrees).toHaveBeenCalledTimes(1);

			await updateTree('tree-1', { notifyOnWindow: true, windowNotifyArmed: true });
			releasePersist();
			await inFlight;
			await flushDeferredPersist();

			expect(mockPersistDirtyTrees.mock.calls.length).toBeGreaterThanOrEqual(2);
			const lastTrees = mockPersistDirtyTrees.mock.calls.at(-1)![0] as Tree[];
			expect(lastTrees[0]?.notifyOnWindow).toBe(true);
		} finally {
			releasePersist();
		}
	});

	it('flushes immediately when merging backup trees', async () => {
		const mergePromise = mergeTreesFromBackup([createBackupTree('tree-1', 'Maple')]);
		await vi.runAllTimersAsync();
		await mergePromise;

		expect(treeStore.trees).toHaveLength(1);
		expect(mockPersistDirtyTrees).toHaveBeenCalledTimes(1);
	});

	it('batches enrichment updates into one persist flush', async () => {
		treeStore.trees = [createBackupTree('tree-1', 'Maple')];

		await runPersistBatch(async () => {
			await applyTreeEnrichment('tree-1', {
				climateHistory: {
					years: [],
					source: 'test'
				} as never,
				locationLabel: 'Test label',
				cadastreInfo: null
			});
		});

		await vi.runAllTimersAsync();

		expect(mockPersistDirtyTrees).toHaveBeenCalledTimes(1);
	});

	it('omits redundant top-level photos from the persist payload', () => {
		const photo = 'data:image/jpeg;base64,QUJD';
		const tree: Tree = {
			...createBackupTree('tree-2', 'Beech'),
			photos: [photo],
			visits: [
				{
					id: 'visit-photo',
					visitedAt: '2026-01-02T12:00:00.000Z',
					note: 'Photo visit',
					photos: [photo]
				}
			]
		};

		const payload = buildTreesPersistPayload([tree]);

		expect(payload[0].photos).toBeUndefined();
		expect(payload[0].visits?.[0]?.photos[0]).toBe(photo);
	});

	it('reuses sortedTrees cache when tree array reference is unchanged', async () => {
		treeStore.trees = [createBackupTree('tree-a', 'Oak'), createBackupTree('tree-b', 'Beech')];
		const first = sortedTrees();
		const second = sortedTrees();
		expect(second).toBe(first);

		treeStore.trees = [...treeStore.trees];
		const third = sortedTrees();
		expect(third).not.toBe(first);
	});
});

describe('trees hydrate and enrichment no-ops', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		__resetTreesStoreForTests();
		treeStore.loaded = true;
		mockGetTreeStorageVersion.mockResolvedValue(1);
		mockPersistDirtyTrees.mockResolvedValue(undefined);
		mockHydrateTreeMedia.mockResolvedValue(undefined);
	});

	it('does not rewrite the store when hydrate finds no full photos', async () => {
		const tree = createBackupTree('tree-empty', 'Maple');
		tree.photoThumbs = ['data:image/jpeg;base64,thumb'];
		treeStore.trees = [tree];
		const before = treeStore.trees;

		mockHydrateTreeMedia.mockResolvedValue({
			...tree,
			photos: [],
			visits: [{ ...tree.visits[0]!, photos: [] }]
		});

		await ensureTreeHydrated('tree-empty');

		expect(mockHydrateTreeMedia).toHaveBeenCalledTimes(1);
		expect(treeStore.trees).toBe(before);
		expect(treeStore.trees[0]?.photos).toEqual([]);
	});

	it('updates the store when hydrate loads full photos', async () => {
		const tree = createBackupTree('tree-full', 'Oak');
		treeStore.trees = [tree];
		const photo = 'data:image/jpeg;base64,QUJD';

		mockHydrateTreeMedia.mockResolvedValue({
			...tree,
			photos: [photo],
			visits: [{ ...tree.visits[0]!, photos: [photo], photoThumbs: [photo] }]
		});

		await ensureTreeHydrated('tree-full');

		expect(treeStore.trees[0]?.photos[0]).toBe(photo);
	});

	it('preserves in-memory revisit fields while hydrate loads photos', async () => {
		const tree = createBackupTree('tree-1', 'Oak');
		tree.mediaHydration = 'thumbs';
		tree.notifyOnWindow = false;
		treeStore.trees = [tree];
		const photo = 'data:image/jpeg;base64,QUJD';

		let resolveHydrate: (value: Tree) => void = () => {};
		mockHydrateTreeMedia.mockReturnValue(
			new Promise<Tree>((resolve) => {
				resolveHydrate = resolve;
			})
		);

		const hydratePromise = ensureTreeHydrated('tree-1');
		await updateTree('tree-1', {
			notifyOnWindow: true,
			nextRevisitAt: '2026-09-01',
			windowNotifyArmed: true
		});

		resolveHydrate({
			...tree,
			photos: [photo],
			visits: [{ ...tree.visits[0]!, photos: [photo], photoThumbs: [photo] }]
		});

		await hydratePromise;

		expect(treeStore.trees[0]?.notifyOnWindow).toBe(true);
		expect(treeStore.trees[0]?.nextRevisitAt).toBe('2026-09-01');
		expect(treeStore.trees[0]?.windowNotifyArmed).toBe(true);
		expect(treeStore.trees[0]?.photos[0]).toBe(photo);
		expect(treeStore.trees[0]?.mediaHydration).toBe('full');
	});

	it('does not persist when enrichment patch is a no-op null cadastre', async () => {
		const tree = createBackupTree('tree-1', 'Maple');
		tree.cadastreInfo = null;
		tree.locationLabel = 'Already labeled';
		treeStore.trees = [tree];
		const before = treeStore.trees;

		await applyTreeEnrichment('tree-1', {
			cadastreInfo: null,
			locationLabel: 'Already labeled'
		});

		expect(treeStore.trees).toBe(before);
		await flushDeferredPersist();
		expect(mockPersistDirtyTrees).not.toHaveBeenCalled();
	});

	it('persists when enrichment patch changes location label', async () => {
		treeStore.trees = [createBackupTree('tree-1', 'Maple')];

		await applyTreeEnrichment('tree-1', {
			locationLabel: 'New place'
		});

		expect(treeStore.trees[0]?.locationLabel).toBe('New place');
		await flushDeferredPersist();
		expect(mockPersistDirtyTrees).toHaveBeenCalledTimes(1);
	});

	it('hydrates before addVisit so prior visit photos are preserved', async () => {
		const oldPhoto = 'data:image/jpeg;base64,OLD==';
		const oldThumb = 'data:image/jpeg;base64,thumb';
		const newPhoto = 'data:image/jpeg;base64,NEW==';
		const tree = createBackupTree('tree-1', 'Oak');
		tree.mediaHydration = 'thumbs';
		tree.photos = [''];
		tree.photoThumbs = [oldThumb];
		tree.visits = [
			{
				id: 'v-old',
				visitedAt: '2026-01-01T12:00:00.000Z',
				note: 'old',
				photos: [''],
				photoThumbs: [oldThumb]
			}
		];
		treeStore.trees = [tree];

		mockHydrateTreeMedia.mockResolvedValue({
			...tree,
			photos: [oldPhoto],
			photoThumbs: [oldThumb],
			mediaHydration: 'full',
			visits: [
				{
					id: 'v-old',
					visitedAt: '2026-01-01T12:00:00.000Z',
					note: 'old',
					photos: [oldPhoto],
					photoThumbs: [oldThumb]
				}
			]
		});

		await addVisit('tree-1', { note: 'new', photos: [newPhoto], photoThumbs: [newPhoto] });

		expect(mockHydrateTreeMedia).toHaveBeenCalledWith('tree-1');
		const updated = treeStore.trees[0]!;
		expect(updated.visits).toHaveLength(2);
		const oldVisit = updated.visits.find((v) => v.id === 'v-old');
		expect(oldVisit?.photos[0]).toBe(oldPhoto);
		expect(updated.mediaHydration).toBe('full');
	});

	it('clears location labels in memory on thumbs-only trees without scheduling persist', async () => {
		const tree = createBackupTree('tree-thumbs', 'Pine');
		tree.locationLabel = 'Old Town';
		tree.mediaHydration = 'thumbs';
		tree.photos = [''];
		tree.photoThumbs = ['data:image/jpeg;base64,thumb'];
		treeStore.trees = [tree];
		expect(isTreeStoreFullyMediaHydrated()).toBe(false);

		await clearAllLocationLabels();
		await flushDeferredPersist();

		expect(treeStore.trees[0]?.locationLabel).toBeNull();
		expect(mockPersistDirtyTrees).not.toHaveBeenCalled();
	});

	it('persists location label clears only for fully hydrated trees', async () => {
		const full = createBackupTree('tree-full', 'Oak');
		full.locationLabel = 'Full Place';
		full.mediaHydration = 'full';
		full.photos = ['data:image/jpeg;base64,AAA'];

		const thumbs = createBackupTree('tree-thumbs', 'Pine');
		thumbs.locationLabel = 'Thumbs Place';
		thumbs.mediaHydration = 'thumbs';
		thumbs.photos = [''];
		thumbs.photoThumbs = ['data:image/jpeg;base64,thumb'];

		treeStore.trees = [full, thumbs];

		await clearAllLocationLabels();
		await flushDeferredPersist();

		expect(treeStore.trees.map((t) => t.locationLabel)).toEqual([null, null]);
		expect(mockPersistDirtyTrees).toHaveBeenCalledTimes(1);
		const [, dirty] = mockPersistDirtyTrees.mock.calls[0]!;
		expect(dirty).toEqual(new Set(['tree-full']));
	});
});

describe('mergeDiskTreeWithCurrent and thumbs boot', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		__resetTreesStoreForTests();
		treeStore.loaded = true;
		mockGetTreeStorageVersion.mockResolvedValue(1);
		mockPersistDirtyTrees.mockResolvedValue(undefined);
	});

	it('keeps in-memory revisit fields over a stale disk snapshot', () => {
		const disk = createBackupTree('tree-1', 'Oak');
		disk.notifyOnWindow = false;
		disk.nextRevisitAt = null;
		disk.mediaHydration = 'full';
		disk.photos = ['data:image/jpeg;base64,DISK'];

		const current = createBackupTree('tree-1', 'Oak');
		current.notifyOnWindow = true;
		current.nextRevisitAt = '2026-09-01';
		current.windowNotifyArmed = true;
		current.notes = 'Edited in memory';
		current.mediaHydration = 'thumbs';

		const merged = mergeDiskTreeWithCurrent(disk, current, 'hydration');
		expect(merged.notifyOnWindow).toBe(true);
		expect(merged.nextRevisitAt).toBe('2026-09-01');
		expect(merged.windowNotifyArmed).toBe(true);
		expect(merged.notes).toBe('Edited in memory');
		expect(merged.photos[0]).toBe('data:image/jpeg;base64,DISK');
		expect(merged.mediaHydration).toBe('full');
	});

	it('does not clobber dirty notifyOnWindow during thumbs boot', async () => {
		treeStore.trees = [createBackupTree('tree-1', 'Oak')];
		await updateTree('tree-1', {
			notifyOnWindow: true,
			nextRevisitAt: '2026-09-01',
			windowNotifyArmed: true
		});

		const disk = createBackupTree('tree-1', 'Oak');
		disk.notifyOnWindow = false;
		disk.nextRevisitAt = null;
		disk.photoThumbs = ['data:image/jpeg;base64,thumb'];
		disk.mediaHydration = 'thumbs';

		const result = applyThumbsBootTrees([disk]);
		expect(result[0]?.notifyOnWindow).toBe(true);
		expect(result[0]?.nextRevisitAt).toBe('2026-09-01');
		expect(result[0]?.windowNotifyArmed).toBe(true);
		expect(result[0]?.photoThumbs?.[0]).toBe('data:image/jpeg;base64,thumb');
	});

	it('does not downgrade a fully hydrated tree during thumbs boot', () => {
		const current = createBackupTree('tree-1', 'Oak');
		current.mediaHydration = 'full';
		current.photos = ['data:image/jpeg;base64,FULL'];
		current.notifyOnWindow = true;
		treeStore.trees = [current];

		const disk = createBackupTree('tree-1', 'Oak');
		disk.mediaHydration = 'thumbs';
		disk.photos = [];
		disk.photoThumbs = ['data:image/jpeg;base64,thumb'];
		disk.notifyOnWindow = false;

		const result = applyThumbsBootTrees([disk]);
		expect(result[0]?.mediaHydration).toBe('full');
		expect(result[0]?.photos[0]).toBe('data:image/jpeg;base64,FULL');
		expect(result[0]?.notifyOnWindow).toBe(true);
	});

	it('takes the thumbs snapshot when the in-memory tree is clean', () => {
		const current = createBackupTree('tree-1', 'Oak');
		current.mediaHydration = 'thumbs';
		treeStore.trees = [current];

		const disk = createBackupTree('tree-1', 'Oak');
		disk.photoThumbs = ['data:image/jpeg;base64,new-thumb'];
		disk.mediaHydration = 'thumbs';

		const result = applyThumbsBootTrees([disk]);
		expect(result[0]?.photoThumbs?.[0]).toBe('data:image/jpeg;base64,new-thumb');
	});
});
