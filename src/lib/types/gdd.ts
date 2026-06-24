export type GddBaseCategory = 'montagnarde' | 'foret' | 'standard';

export type PhenologyStageId =
	| 'dormance'
	| 'bourgeon_gonfle'
	| 'debourrement'
	| 'feuillaison'
	| 'croissance_active';

export interface GddDailyPoint {
	date: string;
	meanTempC: number | null;
	dailyGdd: number;
	cumulativeGdd: number;
}

export interface GddStageProbability {
	id: PhenologyStageId;
	label: string;
	probabilityPct: number;
}

export interface GddPhenologyEstimate {
	transitionLabel: string;
	stages: GddStageProbability[];
	disclaimer: string;
}

export interface GddSnapshot {
	baseTempC: number;
	baseCategory: GddBaseCategory;
	cumulativeSinceJan1: number;
	last7dSum: number;
	dailySeries: GddDailyPoint[];
	phenology: GddPhenologyEstimate | null;
	/** Message when phenology is disabled (e.g. evergreen species). */
	phenologyUnavailableReason: string | null;
	speciesLabel: string | null;
}
