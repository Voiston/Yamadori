import type { CadastreInfo } from './cadastre';
import type { HarvestEthicsConfirmation } from './harvest-ethics';
import type { ClimateHistory } from './climate';
import * as m from '$lib/paraglide/messages.js';
import type { EnvironmentExposure } from './environment';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from './environment';
import type { PhenologyStageId } from './gdd';
import type { CernageStatus, YrsStoredSnapshot } from './yrs';

export type { EnvironmentExposure };
export { DEFAULT_ENVIRONMENT_EXPOSURE };

export type { CernageStatus };

export type NebariType = 'plat_rayonnant' | 'unilateral_asymetrique' | 'enroche_fissure';
export type BarkType = 'lisse_jeune' | 'ecaillee_mature' | 'cretelee_profonde';
export type DeadwoodType = 'aucun' | 'jin' | 'shari' | 'sabamiki';
export type SizeClass = 'shohin' | 'chuhin' | 'dai';
export type Caliber = 'fronde' | 'poignet' | 'canette' | 'cuisse';

export interface TreeVisit {
	id: string;
	visitedAt: string;
	note: string;
	photoBase64: string;
	voiceNote?: VoiceNote | null;
	yrsSnapshot?: YrsStoredSnapshot | null;
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
	deadwood: DeadwoodType | null;
	sizeClass: SizeClass | null;
	caliber: Caliber | null;
	potentialScore: number | null;
	/** Stade phénologique observé sur le terrain (override du modèle GDD). */
	observedPhenologyStage: PhenologyStageId | null;
	/** État du cernage racinaire observé sur l'arbre. */
	cernageStatus: CernageStatus | null;
}

export const DEFAULT_ASSESSMENT: TreeAssessment = {
	nebari: null,
	trunkDiameterCm: null,
	bark: null,
	deadwood: null,
	sizeClass: null,
	caliber: null,
	potentialScore: null,
	observedPhenologyStage: null,
	cernageStatus: null
};

export interface Tree {
	id: string;
	species: string;
	notes: string;
	photos: string[];
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
}

export type NewTree = Omit<Tree, 'id' | 'capturedAt' | 'visits'>;

export function getCoverPhoto(tree: Pick<Tree, 'photos'>): string {
	return tree.photos[0] ?? '';
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
