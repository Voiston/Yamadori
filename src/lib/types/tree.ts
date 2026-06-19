import type { ClimateHistory } from './climate';

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
}

export const DEFAULT_ASSESSMENT: TreeAssessment = {
	nebari: null,
	trunkDiameterCm: null,
	bark: null,
	deadwood: null,
	sizeClass: null,
	caliber: null,
	potentialScore: null
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
	capturedAt: string;
}

export type NewTree = Omit<Tree, 'id' | 'capturedAt' | 'visits'>;

export function getCoverPhoto(tree: Pick<Tree, 'photos'>): string {
	return tree.photos[0] ?? '';
}

export function getLastVisitAt(tree: Tree): string | null {
	if (tree.visits.length === 0) return null;
	return [...tree.visits].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))[0].visitedAt;
}
