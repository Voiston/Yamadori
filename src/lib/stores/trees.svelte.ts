import { get, set } from 'idb-keyval';
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
import { isInCadastreCoverage } from '$lib/utils/cadastre';
import { isPoorAccuracy } from '$lib/utils/gps';
import { generateId } from '$lib/utils/id';
import { toStorable } from '$lib/utils/idb-store';
import { isNativeApp } from '$lib/utils/platform';

const STORAGE_KEY = 'yamadori-trees';
const PERSIST_DEBOUNCE_MS = 400;

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistInFlight: Promise<void> | null = null;
let persistFlushRegistered = false;

export const treeStore = $state({
	trees: [] as Tree[],
	loaded: false,
	loadError: null as string | null
});

type LegacyTree = Partial<Tree> & {
	photoBase64?: string;
	id: string;
	species: string;
	capturedAt: string;
};

function createInitialVisit(tree: Pick<Tree, 'capturedAt' | 'notes' | 'photos'>): TreeVisit {
	const photo = tree.photos[0] ?? '';
	return {
		id: generateId(),
		visitedAt: tree.capturedAt,
		note: tree.notes.trim() || m.tree_initial_visit_note(),
		photoBase64: photo
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
		visits = [createInitialVisit({ ...base, photos })];
	}

	return { ...base, visits };
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

export async function initTrees(): Promise<void> {
	registerPersistFlush();
	try {
		const stored = (await get<LegacyTree[]>(STORAGE_KEY)) ?? [];
		treeStore.trees = stored.map((tree) => normalizeTree(tree));
		treeStore.loadError = null;
	} catch (error) {
		console.error('initTrees failed:', error);
		treeStore.trees = [];
		treeStore.loadError = m.store_trees_corrupt();
	} finally {
		treeStore.loaded = true;
	}
}

async function writeTreesToStorage(): Promise<void> {
	await set(STORAGE_KEY, toStorable($state.snapshot(treeStore.trees)));
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
			if (!isActive) {
				void flushPersist();
			}
		});
	}
}

function schedulePersist(): void {
	if (persistTimer) {
		clearTimeout(persistTimer);
	}
	persistTimer = setTimeout(() => {
		persistTimer = null;
		void flushPersist();
	}, PERSIST_DEBOUNCE_MS);
}

export async function addTree(tree: NewTree): Promise<Tree> {
	const capturedAt = new Date().toISOString();
	const visit: TreeVisit = {
		id: generateId(),
		visitedAt: capturedAt,
		note: tree.notes.trim() || m.tree_initial_visit_note(),
		photoBase64: tree.photos[0] ?? ''
	};

	const entry: Tree = {
		...tree,
		id: generateId(),
		capturedAt,
		visits: [visit],
		photos: collectPhotosFromVisits([visit])
	};

	treeStore.trees = [entry, ...treeStore.trees];
	await flushPersist();
	return entry;
}

export function sortedTrees(): Tree[] {
	return [...treeStore.trees].sort((a, b) => {
		if (a.isFavorite !== b.isFavorite) {
			return a.isFavorite ? -1 : 1;
		}
		return b.capturedAt.localeCompare(a.capturedAt);
	});
}

export function favoriteTrees(): Tree[] {
	return sortedTrees().filter((t) => t.isFavorite);
}

export function getTreeById(id: string): Tree | undefined {
	return treeStore.trees.find((t) => t.id === id);
}

export async function toggleFavorite(id: string): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, isFavorite: !tree.isFavorite }));
	schedulePersist();
}

export async function updateTree(
	id: string,
	data: Partial<
		Pick<Tree, 'species' | 'notes' | 'environmentExposure' | 'harvestEthicsConfirmation'>
	>
): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, ...data }));
	schedulePersist();
}

export async function updateAssessment(
	id: string,
	assessment: TreeAssessment
): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, assessment: { ...assessment } }));
	schedulePersist();
}

export async function updateClimate(id: string, climateHistory: ClimateHistory): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, climateHistory }));
	schedulePersist();
}

export async function updateLocationLabel(id: string, locationLabel: string): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, locationLabel }));
	schedulePersist();
}

export async function updateCadastre(id: string, cadastreInfo: CadastreInfo | null): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, cadastreInfo }));
	schedulePersist();
}

export function treesMissingCadastre(): Tree[] {
	return treeStore.trees.filter(
		(tree) =>
			tree.latitude !== null &&
			tree.longitude !== null &&
			!tree.cadastreInfo &&
			!isPoorAccuracy(tree.accuracyMeters) &&
			isInCadastreCoverage(tree.latitude, tree.longitude)
	);
}

export async function addVisit(
	treeId: string,
	data: {
		note: string;
		photoBase64?: string;
		visitedAt?: string;
		voiceNote?: VoiceNote | null;
		yrsSnapshot?: YrsStoredSnapshot | null;
	}
): Promise<void> {
	const visit: TreeVisit = {
		id: generateId(),
		visitedAt: data.visitedAt ?? new Date().toISOString(),
		note: data.note.trim(),
		photoBase64: data.photoBase64 ?? '',
		voiceNote: data.voiceNote ?? null,
		yrsSnapshot: data.yrsSnapshot ?? null
	};

	updateTreeById(treeId, (tree) => {
		const visits = [visit, ...tree.visits];
		return { ...tree, visits, photos: collectPhotosFromVisits(visits) };
	});
	schedulePersist();
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
		return { ...tree, visits, photos: collectPhotosFromVisits(visits) };
	});
	schedulePersist();
}

export async function deleteVisit(treeId: string, visitId: string): Promise<void> {
	updateTreeById(treeId, (tree) => {
		const visits = tree.visits.filter((visit) => visit.id !== visitId);
		return { ...tree, visits, photos: collectPhotosFromVisits(visits) };
	});
	schedulePersist();
}

export async function updateVoiceNote(id: string, voiceNote: VoiceNote | null): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, voiceNote }));
	schedulePersist();
}

export async function replaceAllTrees(trees: Tree[]): Promise<void> {
	treeStore.trees = trees.map((tree) => normalizeTree(tree as LegacyTree));
	await flushPersist();
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
		const tree = normalizeTree(raw as LegacyTree);
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
	await flushPersist();
}

export async function deleteTree(id: string): Promise<void> {
	treeStore.trees = treeStore.trees.filter((t) => t.id !== id);
	await flushPersist();
}

export function treesWithGps(): Tree[] {
	return treeStore.trees.filter((t) => t.latitude !== null && t.longitude !== null);
}
