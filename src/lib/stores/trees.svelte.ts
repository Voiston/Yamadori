import { secureIdbSet, isMigrationBlockedError } from '$lib/utils/secure-idb';
import { resolveTreesLoadError, type StorageLoadErrorInfo } from '$lib/utils/storageLoadError';
import * as m from '$lib/paraglide/messages.js';
import { App } from '@capacitor/app';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import {
	DEFAULT_ASSESSMENT,
	clampVisitPhotos,
	collectPhotosFromVisits,
	collectThumbsFromVisits,
	getTreeMediaHydration,
	normalizeVisitPhotoFields,
	type NewTree,
	type Tree,
	type TreeAssessment,
	type TreeVisit
} from '$lib/types/tree';
import type { CadastreInfo } from '$lib/types/cadastre';
import type { ClimateHistory } from '$lib/types/climate';
import type { VoiceNote } from '$lib/types/tree';
import type { YrsStoredSnapshot } from '$lib/types/yrs';
import { canAddTree } from '$lib/utils/featurePolicy';
import { hasCadastreProvider } from '$lib/geo/countries';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { isPoorAccuracy } from '$lib/utils/gps';
import { generateId, sanitizeTreeId } from '$lib/utils/id';
import { toStorable } from '$lib/utils/idb-store';
import { isNativeApp } from '$lib/utils/platform';
import { isCameraCaptureActive } from '$lib/utils/cameraCaptureSession';
import {
	ensureTreeStorageMigrated,
	getTreeStorageVersion,
	hydrateTreeMedia,
	loadTreesBootPhaseA,
	loadTreesFromStorage,
	persistDirtyTrees,
	replaceAllTreesInStorage
} from '$lib/utils/tree-storage/repository';
import type { TreeStorageMigrationCallback } from '$lib/utils/tree-storage/types';
import { STORAGE_KEY_LEGACY } from '$lib/utils/tree-storage/types';
import { compressImageToThumbDataUrl } from '$lib/utils/photo';

const PERSIST_DEBOUNCE_MS = 400;

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistInFlight: Promise<void> | null = null;
let persistFlushRegistered = false;
let persistBatchDepth = 0;
const dirtyTreeIds = new Set<string>();
const hydrationPromises = new Map<string, Promise<Tree | undefined>>();

export const treeStore = $state({
	trees: [] as Tree[],
	loaded: false,
	indexReady: false,
	loadError: null as StorageLoadErrorInfo | null,
	storageMigrationPending: false,
	storageMigrationProgress: 0
});

type LegacyTree = Partial<Tree> & {
	photoBase64?: string;
	id: string;
	species: string;
	capturedAt: string;
	visits?: Array<
		Partial<TreeVisit> & {
			id?: string;
			visitedAt?: string;
			photoBase64?: string;
			photoThumbBase64?: string;
		}
	>;
};

function normalizeVisit(
	raw: Partial<TreeVisit> & {
		id?: string;
		visitedAt?: string;
		photoBase64?: string;
		photoThumbBase64?: string;
	},
	fallbackVisitedAt: string
): TreeVisit {
	const { photos, photoThumbs } = normalizeVisitPhotoFields(raw);
	return {
		id: raw.id ?? generateId(),
		visitedAt: raw.visitedAt ?? fallbackVisitedAt,
		note: raw.note ?? '',
		photos,
		photoThumbs,
		voiceNote: raw.voiceNote ?? null,
		yrsSnapshot: raw.yrsSnapshot ?? null
	};
}

function createInitialVisit(
	tree: Pick<Tree, 'capturedAt' | 'notes' | 'photos' | 'photoThumbs' | 'visits'>
): TreeVisit {
	const firstVisit = tree.visits[0];
	const photos = clampVisitPhotos(
		tree.photos.length > 0 ? tree.photos : (firstVisit?.photos ?? [])
	);
	const photoThumbs =
		tree.photoThumbs && tree.photoThumbs.length > 0
			? clampVisitPhotos(tree.photoThumbs)
			: firstVisit?.photoThumbs;
	return {
		id: generateId(),
		visitedAt: tree.capturedAt,
		note: tree.notes.trim() || m.tree_initial_visit_note(),
		photos,
		photoThumbs
	};
}

function normalizeTree(raw: LegacyTree): Tree {
	const photos =
		raw.photos && raw.photos.length > 0
			? raw.photos
			: raw.photoBase64
				? [raw.photoBase64]
				: [];

	const base: Omit<Tree, 'visits'> = {
		id: raw.id,
		species: raw.species,
		notes: raw.notes ?? '',
		photos,
		photoThumbs: raw.photoThumbs,
		assessment: { ...DEFAULT_ASSESSMENT, ...(raw.assessment ?? {}) },
		latitude: raw.latitude ?? null,
		longitude: raw.longitude ?? null,
		accuracyMeters: raw.accuracyMeters ?? null,
		altitudeMeters: raw.altitudeMeters ?? null,
		frontHeadingDegrees: raw.frontHeadingDegrees ?? null,
		voiceNote: raw.voiceNote ?? null,
		isFavorite: raw.isFavorite ?? false,
		climateHistory: raw.climateHistory ?? null,
		locationLabel: raw.locationLabel ?? null,
		cadastreInfo: raw.cadastreInfo ?? null,
		harvestEthicsConfirmation: raw.harvestEthicsConfirmation ?? null,
		environmentExposure: raw.environmentExposure ?? DEFAULT_ENVIRONMENT_EXPOSURE,
		yrsAtCapture: raw.yrsAtCapture ?? null,
		capturedAt: raw.capturedAt,
		mediaHydration: raw.mediaHydration
	};

	let visits =
		raw.visits?.map((visit) => normalizeVisit(visit, raw.capturedAt)) ?? [];
	if (visits.length === 0 && (base.notes.trim() || photos.length > 0)) {
		visits = [createInitialVisit({ ...base, photos, visits })];
	}

	const derivedPhotos = collectPhotosFromVisits(visits);
	const derivedThumbs = collectThumbsFromVisits(visits);

	return {
		...base,
		visits,
		photos: derivedPhotos.length > 0 ? derivedPhotos : photos,
		photoThumbs: derivedThumbs ?? raw.photoThumbs
	};
}

function normalizeImportedTree(raw: LegacyTree): Tree {
	return normalizeTree({ ...raw, id: sanitizeTreeId(raw.id) });
}

function updateTreeById(treeId: string, updater: (tree: Tree) => Tree): void {
	treeStore.trees = treeStore.trees.map((tree) => (tree.id === treeId ? updater(tree) : tree));
}

function markTreeDirty(treeId: string): void {
	dirtyTreeIds.add(treeId);
}

/** Omit redundant top-level photos when visit payloads already carry them. */
export function buildTreesPersistPayload(trees: Tree[]): LegacyTree[] {
	return trees.map((tree) => {
		const derivedPhotos = collectPhotosFromVisits(tree.visits);
		if (derivedPhotos.length === 0) {
			return tree as LegacyTree;
		}
		const { photos: _photos, photoThumbs: _photoThumbs, ...rest } = tree;
		return { ...rest, visits: tree.visits } as LegacyTree;
	});
}

function yieldForPersist(): Promise<void> {
	return new Promise((resolve) => {
		if (typeof requestIdleCallback === 'function') {
			requestIdleCallback(() => resolve(), { timeout: 100 });
			return;
		}
		setTimeout(resolve, 0);
	});
}

export function beginPersistBatch(): void {
	persistBatchDepth += 1;
}

export async function endPersistBatch(): Promise<void> {
	if (persistBatchDepth > 0) {
		persistBatchDepth -= 1;
	}
	if (persistBatchDepth === 0) {
		await flushPersist();
	}
}

export async function runPersistBatch<T>(fn: () => Promise<T> | T): Promise<T> {
	beginPersistBatch();
	try {
		return await fn();
	} finally {
		await endPersistBatch();
	}
}

const migrationProgressHandler: TreeStorageMigrationCallback = (progress) => {
	treeStore.storageMigrationProgress = progress.percent;
};

function scheduleTreesBootPhaseB(): Promise<void> {
	return new Promise((resolve) => {
		const runPhaseB = () => {
			void completeTreesBoot().finally(() => resolve());
		};
		if (typeof requestIdleCallback === 'function') {
			requestIdleCallback(runPhaseB, { timeout: 2_000 });
			return;
		}
		setTimeout(runPhaseB, 0);
	});
}

async function completeTreesBoot(): Promise<void> {
	try {
		const version = await getTreeStorageVersion();
		if (version === 0) {
			treeStore.loaded = true;
			return;
		}

		const stored = await loadTreesFromStorage('thumbs');
		treeStore.trees = stored.map((tree) => normalizeTree(tree as LegacyTree));
	} catch (error) {
		console.error('completeTreesBoot failed:', error);
		if (!treeStore.loadError) {
			treeStore.loadError = resolveTreesLoadError(error);
		}
	} finally {
		treeStore.loaded = true;
	}
}

export async function initTrees(): Promise<void> {
	registerPersistFlush();
	treeStore.storageMigrationPending = true;
	treeStore.storageMigrationProgress = 0;
	treeStore.indexReady = false;
	treeStore.loaded = false;

	try {
		const version = await getTreeStorageVersion();
		if (version === 0) {
			await ensureTreeStorageMigrated(migrationProgressHandler);
		}

		const stored = await loadTreesBootPhaseA();
		treeStore.trees = stored.map((tree) => normalizeTree(tree as LegacyTree));
		treeStore.indexReady = true;
		treeStore.loadError = null;

		const postMigrationVersion = await getTreeStorageVersion();
		if (postMigrationVersion === 0) {
			treeStore.loaded = true;
		} else {
			await scheduleTreesBootPhaseB();
		}
	} catch (error) {
		console.error('initTrees failed:', error);
		treeStore.trees = [];
		treeStore.loadError = resolveTreesLoadError(error);
		treeStore.indexReady = true;
		treeStore.loaded = true;
	} finally {
		treeStore.storageMigrationPending = false;
		treeStore.storageMigrationProgress = 100;
	}
}

async function writeTreesToStorage(): Promise<void> {
	const snapshot = $state.snapshot(treeStore.trees);
	await yieldForPersist();

	try {
		const version = await getTreeStorageVersion();
		if (version === 0) {
			await secureIdbSet(STORAGE_KEY_LEGACY, toStorable(buildTreesPersistPayload(snapshot)));
			dirtyTreeIds.clear();
			return;
		}

		if (dirtyTreeIds.size === 0) {
			return;
		}

		const dirtySnapshot = new Set(dirtyTreeIds);
		await persistDirtyTrees(snapshot, dirtySnapshot);
		dirtyTreeIds.clear();
	} catch (error) {
		if (isMigrationBlockedError(error)) {
			return;
		}
		throw error;
	}
}

async function flushPersist(): Promise<void> {
	if (persistTimer) {
		clearTimeout(persistTimer);
		persistTimer = null;
	}

	if (persistInFlight) {
		await persistInFlight;
	}

	persistInFlight = writeTreesToStorage();
	try {
		await persistInFlight;
	} finally {
		persistInFlight = null;
	}
}

/** Flush pending tree writes so backup export can read full media from storage. */
export async function flushTreesPersist(): Promise<void> {
	await flushPersist();
}

function registerPersistFlush(): void {
	if (persistFlushRegistered || typeof window === 'undefined') {
		return;
	}

	persistFlushRegistered = true;

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			void flushPersist();
		}
	});

	window.addEventListener('pagehide', () => {
		void flushPersist();
	});

	if (isNativeApp()) {
		void App.addListener('appStateChange', ({ isActive }) => {
			if (!isActive && !isCameraCaptureActive()) {
				void flushPersist();
			}
		});
	}
}

function schedulePersist(treeId?: string): void {
	if (treeId) {
		markTreeDirty(treeId);
	}
	if (persistBatchDepth > 0) {
		return;
	}
	if (persistTimer) {
		clearTimeout(persistTimer);
	}
	persistTimer = setTimeout(() => {
		persistTimer = null;
		void flushPersist();
	}, PERSIST_DEBOUNCE_MS);
}

export async function ensureTreeHydrated(treeId: string): Promise<Tree | undefined> {
	const existing = getTreeById(treeId);
	if (!existing) {
		return undefined;
	}

	if (existing.mediaHydration === 'full' || (existing.photos.length > 0 && existing.photos[0])) {
		return existing;
	}

	const inFlight = hydrationPromises.get(treeId);
	if (inFlight) {
		return inFlight;
	}

	const promise = (async () => {
		const hydrated = await hydrateTreeMedia(treeId);
		if (!hydrated) {
			return existing;
		}
		const normalized = normalizeTree({
			...(hydrated as LegacyTree),
			mediaHydration: 'full'
		});
		const hasFullPhoto = normalized.photos.length > 0 && Boolean(normalized.photos[0]);
		// Avoid store writes when media is still empty — re-writing would re-trigger
		// detail-page / PhotoGallery $effects and freeze the UI.
		if (!hasFullPhoto) {
			return existing;
		}
		updateTreeById(treeId, () => ({ ...normalized, mediaHydration: 'full' }));
		return getTreeById(treeId) ?? { ...normalized, mediaHydration: 'full' };
	})();

	hydrationPromises.set(treeId, promise);
	try {
		return await promise;
	} finally {
		hydrationPromises.delete(treeId);
	}
}

export async function addTree(tree: NewTree): Promise<Tree> {
	if (!canAddTree(treeStore.trees.length)) {
		throw new Error(m.pro_tree_limit_reached());
	}

	const capturedAt = new Date().toISOString();
	const photos = clampVisitPhotos(tree.photos);
	const photoThumbs = tree.photoThumbs ? clampVisitPhotos(tree.photoThumbs) : undefined;
	const visit: TreeVisit = {
		id: generateId(),
		visitedAt: capturedAt,
		note: tree.notes.trim() || m.tree_initial_visit_note(),
		photos,
		photoThumbs
	};

	const entry: Tree = {
		...tree,
		id: generateId(),
		capturedAt,
		visits: [visit],
		photos: collectPhotosFromVisits([visit]),
		photoThumbs: collectThumbsFromVisits([visit]),
		mediaHydration: 'full'
	};

	treeStore.trees = [entry, ...treeStore.trees];
	markTreeDirty(entry.id);
	await flushPersist();
	return entry;
}

let sortedTreesCache: { source: Tree[]; sorted: Tree[] } | null = null;

export function sortedTrees(): Tree[] {
	const source = treeStore.trees;
	if (sortedTreesCache?.source === source) {
		return sortedTreesCache.sorted;
	}

	const sorted = [...source].sort((a, b) => {
		if (a.isFavorite !== b.isFavorite) {
			return a.isFavorite ? -1 : 1;
		}
		return b.capturedAt.localeCompare(a.capturedAt);
	});
	sortedTreesCache = { source, sorted };
	return sorted;
}

export function favoriteTrees(): Tree[] {
	return sortedTrees().filter((t) => t.isFavorite);
}

export function getTreeById(id: string): Tree | undefined {
	return treeStore.trees.find((t) => t.id === id);
}

export async function toggleFavorite(id: string): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, isFavorite: !tree.isFavorite }));
	schedulePersist(id);
}

export async function updateTree(
	id: string,
	data: Partial<
		Pick<Tree, 'species' | 'notes' | 'environmentExposure' | 'harvestEthicsConfirmation'>
	>
): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, ...data }));
	schedulePersist(id);
}

export async function updateAssessment(id: string, assessment: TreeAssessment): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, assessment: { ...assessment } }));
	schedulePersist(id);
}

export async function updateClimate(id: string, climateHistory: ClimateHistory): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, climateHistory }));
	schedulePersist(id);
}

export async function updateLocationLabel(id: string, locationLabel: string): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, locationLabel }));
	// Thumbs/index: keep label in memory only; persist would be media-safe via merge but
	// skipping avoids post-boot dirty storms after locale refresh.
	const tree = getTreeById(id);
	if (tree && getTreeMediaHydration(tree) === 'full') {
		schedulePersist(id);
	}
}

/**
 * True when every in-memory tree is marked fully hydrated.
 * Boot/thumbs stores must not dirtier-persist label clears (media wipe risk).
 */
export function isTreeStoreFullyMediaHydrated(): boolean {
	if (treeStore.trees.length === 0) return true;
	return treeStore.trees.every((tree) => getTreeMediaHydration(tree) === 'full');
}

/** Clear stored reverse-geocode labels (e.g. after place-language strategy change). */
export async function clearAllLocationLabels(): Promise<void> {
	await runPersistBatch(() => {
		for (const tree of treeStore.trees) {
			if (tree.locationLabel === null) continue;
			updateTreeById(tree.id, (current) => ({ ...current, locationLabel: null }));
			// Never schedule persist for thumbs/index trees — even with mergePreservedMediaRefs,
			// skipping dirty avoids orphan-path churn after boot.
			if (getTreeMediaHydration(tree) === 'full') {
				schedulePersist(tree.id);
			}
		}
	});
}

export async function updateCadastre(id: string, cadastreInfo: CadastreInfo | null): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, cadastreInfo }));
	schedulePersist(id);
}

export type TreeEnrichmentPatch = {
	climateHistory?: ClimateHistory;
	locationLabel?: string;
	cadastreInfo?: CadastreInfo | null;
};

function enrichmentPatchChangesTree(tree: Tree, patch: TreeEnrichmentPatch): boolean {
	if (patch.climateHistory !== undefined && patch.climateHistory !== tree.climateHistory) {
		return true;
	}
	if (patch.locationLabel !== undefined && patch.locationLabel !== tree.locationLabel) {
		return true;
	}
	if (patch.cadastreInfo !== undefined && patch.cadastreInfo !== tree.cadastreInfo) {
		return true;
	}
	return false;
}

export async function applyTreeEnrichment(id: string, patch: TreeEnrichmentPatch): Promise<void> {
	if (
		patch.climateHistory === undefined &&
		patch.locationLabel === undefined &&
		patch.cadastreInfo === undefined
	) {
		return;
	}

	const existing = getTreeById(id);
	if (!existing || !enrichmentPatchChangesTree(existing, patch)) {
		return;
	}

	updateTreeById(id, (tree) => ({
		...tree,
		...(patch.climateHistory !== undefined ? { climateHistory: patch.climateHistory } : {}),
		...(patch.locationLabel !== undefined ? { locationLabel: patch.locationLabel } : {}),
		...(patch.cadastreInfo !== undefined ? { cadastreInfo: patch.cadastreInfo } : {})
	}));
	schedulePersist(id);
}

export function treesMissingCadastre(): Tree[] {
	return treeStore.trees.filter(
		(tree) =>
			tree.latitude !== null &&
			tree.longitude !== null &&
			!tree.cadastreInfo &&
			!isPoorAccuracy(tree.accuracyMeters) &&
			hasCadastreProvider(resolveCountry(tree.latitude, tree.longitude))
	);
}

async function ensureVisitThumb(photoBase64: string): Promise<string> {
	if (!photoBase64) return '';
	try {
		return await compressImageToThumbDataUrl(photoBase64);
	} catch {
		return photoBase64;
	}
}

async function ensureVisitThumbs(
	photos: string[],
	photoThumbs?: string[]
): Promise<string[] | undefined> {
	if (photos.length === 0) return undefined;
	const thumbs: string[] = [];
	for (let i = 0; i < photos.length; i += 1) {
		const existing = photoThumbs?.[i];
		thumbs.push(existing || (await ensureVisitThumb(photos[i]!)));
	}
	return thumbs;
}

export async function addVisit(
	treeId: string,
	data: {
		note: string;
		photos?: string[];
		photoThumbs?: string[];
		/** @deprecated Prefer photos[] */
		photoBase64?: string;
		/** @deprecated Prefer photoThumbs[] */
		photoThumbBase64?: string;
		visitedAt?: string;
		voiceNote?: VoiceNote | null;
		yrsSnapshot?: YrsStoredSnapshot | null;
	}
): Promise<void> {
	// Persist marks mediaHydration full — hydrate first so older visits keep their blobs.
	await ensureTreeHydrated(treeId);

	const { photos: normalizedPhotos, photoThumbs: normalizedThumbs } = normalizeVisitPhotoFields({
		photos: data.photos,
		photoThumbs: data.photoThumbs,
		photoBase64: data.photoBase64,
		photoThumbBase64: data.photoThumbBase64
	});
	const photos = clampVisitPhotos(normalizedPhotos);
	const photoThumbs = await ensureVisitThumbs(photos, normalizedThumbs);

	const visit: TreeVisit = {
		id: generateId(),
		visitedAt: data.visitedAt ?? new Date().toISOString(),
		note: data.note.trim(),
		photos,
		photoThumbs,
		voiceNote: data.voiceNote ?? null,
		yrsSnapshot: data.yrsSnapshot ?? null
	};

	updateTreeById(treeId, (tree) => {
		const visits = [visit, ...tree.visits];
		return {
			...tree,
			visits,
			photos: collectPhotosFromVisits(visits),
			photoThumbs: collectThumbsFromVisits(visits),
			mediaHydration: 'full'
		};
	});
	markTreeDirty(treeId);
	await flushPersist();
}

export async function updateVisit(
	treeId: string,
	visitId: string,
	data: Partial<Pick<TreeVisit, 'note' | 'visitedAt' | 'photos' | 'photoThumbs'>>
): Promise<void> {
	let photos: string[] | undefined;
	let photoThumbs: string[] | undefined;

	if (data.photos !== undefined) {
		await ensureTreeHydrated(treeId);
		photos = clampVisitPhotos(data.photos);
		photoThumbs = await ensureVisitThumbs(photos, data.photoThumbs);
	}

	updateTreeById(treeId, (tree) => {
		const visits = tree.visits.map((visit) => {
			if (visit.id !== visitId) return visit;
			return {
				...visit,
				...(data.note !== undefined ? { note: data.note.trim() } : {}),
				...(data.visitedAt !== undefined ? { visitedAt: data.visitedAt } : {}),
				...(photos !== undefined ? { photos, photoThumbs } : {})
			};
		});
		return {
			...tree,
			visits,
			photos: collectPhotosFromVisits(visits),
			photoThumbs: collectThumbsFromVisits(visits),
			...(photos !== undefined ? { mediaHydration: 'full' as const } : {})
		};
	});
	markTreeDirty(treeId);
	await flushPersist();
}

export async function deleteVisit(treeId: string, visitId: string): Promise<void> {
	await ensureTreeHydrated(treeId);
	updateTreeById(treeId, (tree) => {
		const visits = tree.visits.filter((visit) => visit.id !== visitId);
		return {
			...tree,
			visits,
			photos: collectPhotosFromVisits(visits),
			photoThumbs: collectThumbsFromVisits(visits),
			mediaHydration: 'full'
		};
	});
	schedulePersist(treeId);
}

export async function updateVoiceNote(id: string, voiceNote: VoiceNote | null): Promise<void> {
	await ensureTreeHydrated(id);
	updateTreeById(id, (tree) => ({ ...tree, voiceNote, mediaHydration: 'full' }));
	schedulePersist(id);
}

export async function replaceAllTrees(trees: Tree[]): Promise<void> {
	treeStore.trees = trees.map((tree) => normalizeImportedTree(tree as LegacyTree));
	dirtyTreeIds.clear();
	await replaceAllTreesInStorage(treeStore.trees);
}

function getLastActivityAt(tree: Tree): string {
	const lastVisit = tree.visits.reduce<string | null>((latest, visit) => {
		if (!latest || visit.visitedAt > latest) {
			return visit.visitedAt;
		}
		return latest;
	}, null);
	return lastVisit && lastVisit > tree.capturedAt ? lastVisit : tree.capturedAt;
}

export async function mergeTreesFromBackup(incoming: Tree[]): Promise<void> {
	const byId = new Map(treeStore.trees.map((tree) => [tree.id, tree]));

	for (const raw of incoming) {
		const tree = normalizeImportedTree(raw as LegacyTree);
		const existing = byId.get(tree.id);
		if (!existing) {
			byId.set(tree.id, tree);
			continue;
		}

		if (getLastActivityAt(tree) >= getLastActivityAt(existing)) {
			byId.set(tree.id, tree);
		} else if (!existing.voiceNote && tree.voiceNote) {
			byId.set(tree.id, { ...existing, voiceNote: tree.voiceNote });
		}
	}

	treeStore.trees = Array.from(byId.values());
	dirtyTreeIds.clear();
	for (const tree of treeStore.trees) {
		markTreeDirty(tree.id);
	}
	await flushPersist();
}

export async function deleteTree(id: string): Promise<void> {
	treeStore.trees = treeStore.trees.filter((t) => t.id !== id);
	markTreeDirty(id);
	schedulePersist(id);
}

export function treesWithGps(): Tree[] {
	return treeStore.trees.filter((t) => t.latitude !== null && t.longitude !== null);
}

export function __resetTreesStoreForTests(): void {
	treeStore.trees = [];
	treeStore.loaded = false;
	treeStore.indexReady = false;
	treeStore.loadError = null;
	treeStore.storageMigrationPending = false;
	treeStore.storageMigrationProgress = 0;
	dirtyTreeIds.clear();
	hydrationPromises.clear();
	persistBatchDepth = 0;
	if (persistTimer) {
		clearTimeout(persistTimer);
		persistTimer = null;
	}
}
