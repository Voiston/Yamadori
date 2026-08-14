import type { CadastreInfo } from './cadastre';
import type { HarvestEthicsConfirmation } from './harvest-ethics';
import type { ClimateHistory } from './climate';
import * as m from '$lib/paraglide/messages.js';
import type { EnvironmentExposure } from './environment';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from './environment';
import type { PhenologyStageId } from './gdd';
import type {
	AoutementStatus,
	CernageStatus,
	LeafFallPct,
	YrsStoredSnapshot
} from './yrs';

export type { EnvironmentExposure };
export { DEFAULT_ENVIRONMENT_EXPOSURE };

export type { AoutementStatus, CernageStatus, LeafFallPct };

export type NebariType = 'plat_rayonnant' | 'unilateral_asymetrique' | 'enroche_fissure';
export type BarkType = 'lisse_jeune' | 'ecaillee_mature' | 'cretelee_profonde';
/** @deprecated Legacy single-value deadwood including "aucun"; prefer DeadwoodFeature. */
export type DeadwoodType = 'aucun' | 'jin' | 'shari' | 'sabamiki';
export type DeadwoodFeature = 'jin' | 'shari' | 'sabamiki';
export type SizeClass = 'shohin' | 'chuhin' | 'dai';
export type Caliber = 'fronde' | 'poignet' | 'canette' | 'cuisse';

/** Max photos stored on a single visit (capture or follow-up). */
export const MAX_VISIT_PHOTOS = 3;

export interface TreeVisit {
	id: string;
	visitedAt: string;
	note: string;
	/** JPEG data URLs for this visit (max {@link MAX_VISIT_PHOTOS}). Index 0 is cover. */
	photos: string[];
	/** Thumbnails parallel to photos when available. */
	photoThumbs?: string[];
	voiceNote?: VoiceNote | null;
	yrsSnapshot?: YrsStoredSnapshot | null;
}

/** Legacy visit shape still seen in backups / in-memory migrations. */
export type LegacyTreeVisitFields = {
	photos?: string[];
	photoThumbs?: string[];
	photoBase64?: string;
	photoThumbBase64?: string;
};

export function clampVisitPhotos(photos: string[]): string[] {
	return photos.filter((photo) => Boolean(photo?.trim())).slice(0, MAX_VISIT_PHOTOS);
}

export function normalizeVisitPhotoFields(raw: LegacyTreeVisitFields): {
	photos: string[];
	photoThumbs?: string[];
} {
	const rawPhotos = raw.photos && raw.photos.length > 0 ? raw.photos : undefined;
	const hasPlaceholderPhotos =
		Boolean(rawPhotos) && rawPhotos!.every((photo) => !photo?.trim());

	const photos = clampVisitPhotos(
		rawPhotos && !hasPlaceholderPhotos
			? rawPhotos
			: raw.photoBase64
				? [raw.photoBase64]
				: []
	);

	let photoThumbs: string[] | undefined;
	if (raw.photoThumbs && raw.photoThumbs.length > 0) {
		const thumbs = clampVisitPhotos(raw.photoThumbs);
		// Thumbs-only hydration uses empty photo placeholders — keep all thumbs.
		photoThumbs =
			hasPlaceholderPhotos || photos.length === 0
				? thumbs
				: thumbs.slice(0, photos.length);
	} else if (raw.photoThumbBase64 && (photos.length > 0 || hasPlaceholderPhotos)) {
		photoThumbs = [raw.photoThumbBase64];
	}

	return {
		// Preserve empty placeholders so parallel thumb indices stay aligned in memory.
		photos: hasPlaceholderPhotos && photos.length === 0 ? rawPhotos!.map(() => '') : photos,
		photoThumbs: photoThumbs && photoThumbs.length > 0 ? photoThumbs : undefined
	};
}

export function visitPrimaryPhoto(visit: Pick<TreeVisit, 'photos'>): string {
	return visit.photos[0] ?? '';
}

export function visitPrimaryThumb(visit: Pick<TreeVisit, 'photos' | 'photoThumbs'>): string {
	return visit.photoThumbs?.[0] ?? visit.photos[0] ?? '';
}

export function collectPhotosFromVisits(visits: TreeVisit[]): string[] {
	const photos: string[] = [];
	for (const visit of visits) {
		for (const photo of visit.photos) {
			if (photo && !photos.includes(photo)) {
				photos.push(photo);
			}
		}
	}
	return photos;
}

export function collectThumbsFromVisits(visits: TreeVisit[]): string[] | undefined {
	const thumbs: string[] = [];
	for (const visit of visits) {
		const count = Math.max(visit.photos.length, visit.photoThumbs?.length ?? 0);
		for (let i = 0; i < count; i += 1) {
			const thumb = visit.photoThumbs?.[i] ?? visit.photos[i];
			if (thumb && !thumbs.includes(thumb)) {
				thumbs.push(thumb);
			}
		}
	}
	return thumbs.length > 0 ? thumbs : undefined;
}

export interface VoiceNote {
	recordedAt: string;
	durationMs: number;
	mimeType: string;
	audioBase64: string;
}

export interface TreeAssessment {
	nebari: NebariType | null;
	trunkDiameterCm: number | null;
	bark: BarkType | null;
	/** Bois mort naturel observé (plusieurs valeurs possibles). */
	deadwood: DeadwoodFeature[];
	sizeClass: SizeClass | null;
	caliber: Caliber | null;
	potentialScore: number | null;
	/** Stade phénologique observé sur le terrain (override du modèle GDD). */
	observedPhenologyStage: PhenologyStageId | null;
	/** État du cernage racinaire observé sur l'arbre. */
	cernageStatus: CernageStatus | null;
	/** Aoûtement observé (lignification des pousses). */
	aoutementStatus: AoutementStatus | null;
	/** Pourcentage de chute foliaire observée. */
	leafFallPct: LeafFallPct | null;
}

export const DEFAULT_ASSESSMENT: TreeAssessment = {
	nebari: null,
	trunkDiameterCm: null,
	bark: null,
	deadwood: [],
	sizeClass: null,
	caliber: null,
	potentialScore: null,
	observedPhenologyStage: null,
	cernageStatus: null,
	aoutementStatus: null,
	leafFallPct: null
};

export interface Tree {
	id: string;
	species: string;
	notes: string;
	photos: string[];
	/** Thumbnails parallel to photos when available (list / map). */
	photoThumbs?: string[];
	visits: TreeVisit[];
	assessment: TreeAssessment;
	voiceNote: VoiceNote | null;
	latitude: number | null;
	longitude: number | null;
	accuracyMeters: number | null;
	altitudeMeters: number | null;
	frontHeadingDegrees: number | null;
	isFavorite: boolean;
	climateHistory: ClimateHistory | null;
	locationLabel: string | null;
	/** Parcelle cadastrale et régime foncier au repérage. */
	cadastreInfo: CadastreInfo | null;
	/** Validation éthique et juridique du prélèvement. */
	harvestEthicsConfirmation: HarvestEthicsConfirmation | null;
	/** Exposition microclimatique terrain (plein ciel, lisière, sous-bois). */
	environmentExposure: EnvironmentExposure;
	/** YRS au moment du premier repérage, si disponible. */
	yrsAtCapture: YrsStoredSnapshot | null;
	capturedAt: string;
	/**
	 * How far media payloads are loaded in memory.
	 * Defaults to `full` when omitted (new captures / imports).
	 * Non-`full` trees must not rewrite/delete IndexedDB media on persist.
	 */
	mediaHydration?: TreeMediaHydration;
}

/** In-memory media load depth for a tree (mirrors storage hydration levels). */
export type TreeMediaHydration = 'index' | 'thumbs' | 'full';

export function getTreeMediaHydration(
	tree: Pick<Tree, 'mediaHydration'>
): TreeMediaHydration {
	return tree.mediaHydration ?? 'full';
}

export type NewTree = Omit<Tree, 'id' | 'capturedAt' | 'visits'>;

export function getCoverPhoto(tree: Pick<Tree, 'photos'>): string {
	return tree.photos[0] ?? '';
}

export function getCoverPhotoThumb(tree: Pick<Tree, 'photos' | 'photoThumbs'>): string {
	return tree.photoThumbs?.[0] ?? tree.photos[0] ?? '';
}

export function getTreeDisplayLabel(
	tree: Pick<Tree, 'species'>,
	fallback?: string
): string {
	return tree.species.trim() || (fallback ?? m.tree_species_unset());
}

export function getLastVisitAt(tree: Tree): string | null {
	if (tree.visits.length === 0) return null;
	return [...tree.visits].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))[0].visitedAt;
}
