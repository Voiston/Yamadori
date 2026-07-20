import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ASSESSMENT } from '$lib/types/tree';
import type { NewTree, Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import {
	addTree,
	applyTreeEnrichment,
	buildTreesPersistPayload,
	mergeTreesFromBackup,
	runPersistBatch,
	sortedTrees,
	toggleFavorite,
	treeStore,
	__resetTreesStoreForTests
} from './trees.svelte';

const mockGetTreeStorageVersion = vi.fn();
const mockPersistDirtyTrees = vi.fn();
const mockReplaceAllTreesInStorage = vi.fn();
const mockLoadTreesFromStorage = vi.fn();
const mockEnsureTreeStorageMigrated = vi.fn();

vi.mock('$lib/utils/tree-storage/repository', () => ({
	getTreeStorageVersion: (...args: unknown[]) => mockGetTreeStorageVersion(...args),
	persistDirtyTrees: (...args: unknown[]) => mockPersistDirtyTrees(...args),
	replaceAllTreesInStorage: (...args: unknown[]) => mockReplaceAllTreesInStorage(...args),
	loadTreesFromStorage: (...args: unknown[]) => mockLoadTreesFromStorage(...args),
	loadTreesBootPhaseA: (...args: unknown[]) => mockLoadTreesFromStorage(...args),
	ensureTreeStorageMigrated: (...args: unknown[]) => mockEnsureTreeStorageMigrated(...args),
	hydrateTreeMedia: vi.fn()
}));

vi.mock('$lib/utils/secure-idb', () => ({
	secureIdbGet: vi.fn().mockResolvedValue([]),
	secureIdbSet: vi.fn().mockResolvedValue(undefined),
	isMigrationBlockedError: vi.fn().mockReturnValue(false),
	isLocalEncryptionKeyMissingError: vi.fn().mockReturnValue(false)
}));

vi.mock('$lib/utils/featurePolicy', () => ({
	canAddTree: vi.fn().mockReturnValue(true)
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
				photoBase64: ''
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
	});

	it('debounces lightweight tree edits', async () => {
		treeStore.trees = [createBackupTree('tree-1', 'Maple')];
		await toggleFavorite('tree-1');

		expect(mockPersistDirtyTrees).not.toHaveBeenCalled();
		await flushDeferredPersist();
		expect(mockPersistDirtyTrees).toHaveBeenCalledTimes(1);
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
					photoBase64: photo
				}
			]
		};

		const payload = buildTreesPersistPayload([tree]);

		expect(payload[0].photos).toBeUndefined();
		expect(payload[0].visits?.[0]?.photoBase64).toBe(photo);
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
