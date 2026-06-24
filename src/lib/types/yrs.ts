import type { EnvironmentExposure } from '$lib/types/environment';
import type { PhenologyStageId } from '$lib/types/gdd';

export type CernageStatus = 'not_started' | 'partial' | 'advanced' | 'completed';

export type YrsDecision = 'OPTIMAL' | 'ACCEPTABLE' | 'RISK' | 'NO_GO';

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
	environmentExposure?: EnvironmentExposure;
}
