import { secureIdbGet, secureIdbSet, secureIdbDel } from '$lib/utils/secure-idb';
import { toStorable } from '$lib/utils/idb-store';
import {
	DEFAULT_ASSESSMENT,
	clampVisitPhotos,
	collectPhotosFromVisits,
	collectThumbsFromVisits,
	normalizeVisitPhotoFields,
	type Tree,
	type TreeVisit
} from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { normalizeDeadwood } from '$lib/constants/assessment';
import { generateId } from '$lib/utils/id';
import { compressImageToThumbDataUrl } from '$lib/utils/photo';
import { persistTreeIndexFromTrees, persistTreeRecord } from './persist';
import { writeStorageVersion } from './version';
import type { StoredTreeRecord, TreeStorageMigrationCallback } from './types';
import { STORAGE_KEY_LEGACY, STORAGE_KEY_V0_BACKUP, TREE_STORAGE_VERSION } from './types';

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

function createInitialVisit(tree: Pick<Tree, 'capturedAt' | 'notes' | 'photos' | 'photoThumbs'>): TreeVisit {
	const photos = clampVisitPhotos(tree.photos);
	return {
		id: generateId(),
		visitedAt: tree.capturedAt,
		note: tree.notes.trim() || 'Initial visit',
		photos,
		photoThumbs: tree.photoThumbs ? clampVisitPhotos(tree.photoThumbs) : undefined
	};
}

function normalizeLegacyVisit(
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

function normalizeLegacyTree(raw: LegacyTree): Tree {
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
		assessment: {
			...DEFAULT_ASSESSMENT,
			...(raw.assessment ?? {}),
			deadwood: normalizeDeadwood(raw.assessment?.deadwood)
		},
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

	let visits =
		raw.visits?.map((visit) => normalizeLegacyVisit(visit, raw.capturedAt)) ?? [];
	if (visits.length === 0 && (base.notes.trim() || photos.length > 0)) {
		visits = [createInitialVisit({ ...base, photos })];
	}

	const derivedPhotos = collectPhotosFromVisits(visits);
	const derivedThumbs = collectThumbsFromVisits(visits);

	return {
		...base,
		visits,
		photos: derivedPhotos.length > 0 ? derivedPhotos : photos,
		photoThumbs: derivedThumbs
	};
}

async function ensureVisitThumbs(tree: Tree): Promise<Tree> {
	const visits = await Promise.all(
		tree.visits.map(async (visit) => {
			if (visit.photos.length === 0) return visit;
			const photoThumbs = [...(visit.photoThumbs ?? [])];
			let changed = false;
			for (let i = 0; i < visit.photos.length; i += 1) {
				if (photoThumbs[i]) continue;
				const full = visit.photos[i]!;
				try {
					photoThumbs[i] = await compressImageToThumbDataUrl(full);
					changed = true;
				} catch {
					photoThumbs[i] = full;
					changed = true;
				}
			}
			if (!changed) return visit;
			return {
				...visit,
				photoThumbs: photoThumbs.slice(0, visit.photos.length)
			};
		})
	);

	return {
		...tree,
		visits,
		photoThumbs: collectThumbsFromVisits(visits)
	};
}

async function report(
	onProgress: TreeStorageMigrationCallback | undefined,
	progress: Parameters<TreeStorageMigrationCallback>[0]
): Promise<void> {
	await onProgress?.(progress);
	await new Promise<void>((resolve) => {
		if (typeof requestAnimationFrame === 'function') {
			requestAnimationFrame(() => resolve());
			return;
		}
		setTimeout(resolve, 0);
	});
}

export async function migrateLegacyMonolith(
	onProgress?: TreeStorageMigrationCallback
): Promise<void> {
	const legacyRaw = await secureIdbGet<LegacyTree[]>(STORAGE_KEY_LEGACY);
	if (!legacyRaw || legacyRaw.length === 0) {
		await writeStorageVersion(TREE_STORAGE_VERSION);
		if (legacyRaw) {
			await secureIdbSet(STORAGE_KEY_V0_BACKUP, toStorable(legacyRaw));
			await secureIdbDel(STORAGE_KEY_LEGACY);
		}
		await report(onProgress, { percent: 100, phase: 'finalize' });
		return;
	}

	await report(onProgress, { percent: 2, phase: 'read' });
	await secureIdbSet(STORAGE_KEY_V0_BACKUP, toStorable(legacyRaw));

	const trees = legacyRaw.map((raw) => normalizeLegacyTree(raw));
	const total = trees.length;
	const updatedRecords = new Map<string, StoredTreeRecord>();

	for (let index = 0; index < trees.length; index += 1) {
		const tree = await ensureVisitThumbs(trees[index]!);
		trees[index] = tree;

		const stored = await persistTreeRecord(tree);
		updatedRecords.set(tree.id, stored);
		await report(onProgress, {
			percent: Math.round(5 + ((index + 1) / total) * 85),
			phase: 'trees',
			currentTreeId: tree.id
		});
	}

	await persistTreeIndexFromTrees(trees, updatedRecords);
	await writeStorageVersion(TREE_STORAGE_VERSION);
	await secureIdbDel(STORAGE_KEY_LEGACY);

	await report(onProgress, { percent: 100, phase: 'finalize' });
}
