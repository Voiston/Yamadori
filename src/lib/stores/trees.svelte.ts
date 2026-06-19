import { get, set } from 'idb-keyval';
import {
	DEFAULT_ASSESSMENT,
	type NewTree,
	type Tree,
	type TreeAssessment,
	type TreeVisit
} from '$lib/types/tree';
import type { ClimateHistory } from '$lib/types/climate';

const STORAGE_KEY = 'yamadori-trees';

export const treeStore = $state({
	trees: [] as Tree[],
	loaded: false
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
		id: crypto.randomUUID(),
		visitedAt: tree.capturedAt,
		note: tree.notes.trim() || 'Découverte et premier repérage',
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
	const stored = (await get<LegacyTree[]>(STORAGE_KEY)) ?? [];
	treeStore.trees = stored.map((tree) => normalizeTree(tree));
	treeStore.loaded = true;
}

async function persist(): Promise<void> {
	await set(STORAGE_KEY, $state.snapshot(treeStore.trees));
}

export async function addTree(tree: NewTree): Promise<Tree> {
	const capturedAt = new Date().toISOString();
	const visit: TreeVisit = {
		id: crypto.randomUUID(),
		visitedAt: capturedAt,
		note: tree.notes.trim() || 'Découverte et premier repérage',
		photoBase64: tree.photos[0] ?? ''
	};

	const entry: Tree = {
		...tree,
		id: crypto.randomUUID(),
		capturedAt,
		visits: [visit],
		photos: collectPhotosFromVisits([visit])
	};

	treeStore.trees = [entry, ...treeStore.trees];
	await persist();
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
	await persist();
}

export async function updateTree(
	id: string,
	data: Pick<Tree, 'species' | 'notes'>
): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, species: data.species, notes: data.notes }));
	await persist();
}

export async function updateAssessment(
	id: string,
	assessment: TreeAssessment
): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, assessment: { ...assessment } }));
	await persist();
}

export async function updateClimate(id: string, climateHistory: ClimateHistory): Promise<void> {
	updateTreeById(id, (tree) => ({ ...tree, climateHistory }));
	await persist();
}

export async function addVisit(
	treeId: string,
	data: { note: string; photoBase64?: string; visitedAt?: string }
): Promise<void> {
	const visit: TreeVisit = {
		id: crypto.randomUUID(),
		visitedAt: data.visitedAt ?? new Date().toISOString(),
		note: data.note.trim(),
		photoBase64: data.photoBase64 ?? ''
	};

	updateTreeById(treeId, (tree) => {
		const visits = [visit, ...tree.visits];
		return { ...tree, visits, photos: collectPhotosFromVisits(visits) };
	});
	await persist();
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
	await persist();
}

export async function deleteVisit(treeId: string, visitId: string): Promise<void> {
	updateTreeById(treeId, (tree) => {
		const visits = tree.visits.filter((visit) => visit.id !== visitId);
		return { ...tree, visits, photos: collectPhotosFromVisits(visits) };
	});
	await persist();
}

export async function deleteTree(id: string): Promise<void> {
	treeStore.trees = treeStore.trees.filter((t) => t.id !== id);
	await persist();
}

export function treesWithGps(): Tree[] {
	return treeStore.trees.filter((t) => t.latitude !== null && t.longitude !== null);
}
