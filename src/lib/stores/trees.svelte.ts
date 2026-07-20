import { secureIdbSet, isMigrationBlockedError } from '$lib/utils/secure-idb';
import { resolveTreesLoadError, type StorageLoadErrorInfo } from '$lib/utils/storageLoadError';
import * as m from '$lib/paraglide/messages.js';
import { App } from '@capacitor/app';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import {
	DEFAULT_ASSESSMENT,
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
};

function createInitialVisit(
	tree: Pick<Tree, 'capturedAt' | 'notes' | 'photos' | 'visits'>
): TreeVisit {
	const firstVisit = tree.visits[0];
	const photo = tree.photos[0] ?? '';
	return {
		id: generateId(),
		visitedAt: tree.capturedAt,
		note: tree.notes.trim() || m.tree_initial_visit_note(),
		photoBase64: photo,
		photoThumbBase64: firstVisit?.photoThumbBase64
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
		capturedAt: raw.capturedAt
	};

	let visits = raw.visits ?? [];
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

function collectPhotosFromVisits(visits: TreeVisit[]): string[] {
	const photos: string[] = [];
	for (const visit of visits) {
		if (visit.photoBase64 && !photos.includes(visit.photoBase64)) {
			photos.push(visit.photoBase64);
		}
	}
	return photos;
}

function collectThumbsFromVisits(visits: TreeVisit[]): string[] | undefined {
	const thumbs: string[] = [];
	for (const visit of visits) {
		const thumb = visit.photoThumbBase64 ?? visit.photoBase64;
		if (thumb && !thumbs.includes(thumb)) {
			thumbs.push(thumb);
		}
	}
	return thumbs.length > 0 ? thumbs : undefined;
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

function scheduleTreesBootPhaseB(): void {
	const runPhaseB = () => {
		void completeTreesBoot();
	};
	if (typeof requestIdleCallback === 'function') {
		requestIdleCallback(runPhaseB, { timeout: 2_000 });
		return;
	}
	setTimeout(runPhaseB, 0);
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
			scheduleTreesBootPhaseB();
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

	if (existing.photos.length > 0 && existing.photos[0]) {
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
		const normalized = normalizeTree(hydrated as LegacyTree);
		updateTreeById(treeId, () => normalized);
		return normalized;
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
	const firstPhoto = tree.photos[0] ?? '';
	const firstThumb = tree.photoThumbs?.[0];
	const visit: TreeVisit = {
		id: generateId(),
		visitedAt: capturedAt,
		note: tree.notes.trim() || m.tree_initial_visit_note(),
		photoBase64: firstPhoto,
		photoThumbBase64: firstThumb
	};

	const entry: Tree = {
		...tree,
		id: generateId(),
		capturedAt,
		visits: [visit],
		photos: collectPhotosFromVisits([visit]),
		photoThumbs: collectThumbsFromVisits([visit])
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
	schedulePersist(id);
}

/** Clear stored reverse-geocode labels (e.g. after place-language strategy change). */
export async function clearAllLocationLabels(): Promise<void> {
	await runPersistBatch(() => {
		for (const tree of treeStore.trees) {
			if (tree.locationLabel === null) continue;
			updateTreeById(tree.id, (current) => ({ ...current, locationLabel: null }));
			schedulePersist(tree.id);
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

export async function applyTreeEnrichment(id: string, patch: TreeEnrichmentPatch): Promise<void> {
	if (
		patch.climateHistory === undefined &&
		patch.locationLabel === undefined &&
		patch.cadastreInfo === undefined
	) {
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

export async function addVisit(
	treeId: string,
	data: {
		note: string;
		photoBase64?: string;
		photoThumbBase64?: string;
		visitedAt?: string;
		voiceNote?: VoiceNote | null;
		yrsSnapshot?: YrsStoredSnapshot | null;
	}
): Promise<void> {
	const photoBase64 = data.photoBase64 ?? '';
	const photoThumbBase64 =
		data.photoThumbBase64 ?? (photoBase64 ? await ensureVisitThumb(photoBase64) : '');

	const visit: TreeVisit = {
		id: generateId(),
		visitedAt: data.visitedAt ?? new Date().toISOString(),
		note: data.note.trim(),
		photoBase64,
		photoThumbBase64: photoThumbBase64 || undefined,
		voiceNote: data.voiceNote ?? null,
		yrsSnapshot: data.yrsSnapshot ?? null
	};

	updateTreeById(treeId, (tree) => {
		const visits = [visit, ...tree.visits];
		return {
			...tree,
			visits,
			photos: collectPhotosFromVisits(visits),
			photoThumbs: collectThumbsFromVisits(visits)
		};
	});
	markTreeDirty(treeId);
	await flushPersist();
}

export async function updateVisit(
	treeId: string,
	visitId: string,
	data: Pick<TreeVisit, 'note' | 'visitedAt'>
): Promise<void> {
	updateTreeById(treeId, (tree) => {
		const visits = tree.visits.map((visit) =>
			visit.id === visitId
				? { ...visit, note: data.note.trim(), visitedAt: data.visitedAt }
				: visit
		);
		return {
			...tree,
			visits,
			photos: collectPhotosFromVisits(visits),
			photoThumbs: collectThumbsFromVisits(visits)
		};
	});
	schedulePersist(treeId);
}

export async function deleteVisit(treeId: string, visitId: string): Promise<void> {
	updateTreeById(treeId, (tree) => {
		const visits = tree.visits.filter((visit) => visit.id !== visitId);
		return {
			...tree,
			visits,
			photos: collectPhotosFromVisits(visits),
			photoThumbs: collectThumbsFromVisits(visits)
		};
	});
	schedulePersist(treeId);
}

export async function updateVoiceNote(id: string, voiceNote: VoiceNote | null): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, voiceNote }));
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
