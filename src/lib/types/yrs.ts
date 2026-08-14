import type { EnvironmentExposure } from '$lib/types/environment';
import type { PhenologyStageId } from '$lib/types/gdd';
import type { ClimateProfileId } from '$lib/constants/climate-profiles';
import type { YrsLocalization } from '$lib/geo/yrsLocalization';

export type CernageStatus = 'not_started' | 'partial' | 'advanced' | 'completed';

/** Aoûtement / lignification observés (fenêtre d'arrière-saison). */
export type AoutementStatus = 'non_aoute' | 'en_cours' | 'aoute';

/** Pourcentage de chute foliaire observée. */
export type LeafFallPct = 0 | 25 | 50 | 80 | 100;

export type YrsDecision = 'OPTIMAL' | 'ACCEPTABLE' | 'RISK' | 'NO_GO';

/** Completeness of inputs feeding the YRS — does not alter the numeric score. */
export type YrsConfidence = 'high' | 'medium' | 'low';

export type { ClimateProfileId, YrsLocalization };

export interface YrsLayerScores {
	climate: number;
	soil: number;
	phenology: number;
	hydric: number;
	stressPenalty: number;
}

export interface YrsSnapshot {
	score: number;
	decision: YrsDecision;
	layers: YrsLayerScores;
	summary: string | null;
	confidence: YrsConfidence;
	/** Climate threshold profile used when computing this score. */
	climateProfile: ClimateProfileId;
	/** Whether thresholds/calendars are locally calibrated for this GPS point. */
	localization: YrsLocalization;
}

/** Snapshot YRS persisté sur un arbre ou une visite. */
export interface YrsStoredSnapshot {
	score: number;
	decision: YrsDecision;
	summary: string | null;
	capturedAt: string;
}

export interface YrsPlantInputs {
	species?: string;
	observedPhenologyStage?: PhenologyStageId | null;
	cernageStatus?: CernageStatus | null;
	aoutementStatus?: AoutementStatus | null;
	leafFallPct?: LeafFallPct | null;
	environmentExposure?: EnvironmentExposure;
}
