export type GddBaseCategory = 'montagnarde' | 'foret' | 'standard';

/** Stades estimables par le modèle GDD (chaîne logistique). */
export type GddPhenologyStageId =
	| 'dormance'
	| 'bourgeon_gonfle'
	| 'pointe_verte'
	| 'debourrement'
	| 'feuillaison'
	| 'croissance_active';

/** Stades terrain uniquement (Pinacées) — hors estimation GDD. */
export type FieldOnlyPhenologyStageId = 'chandelle' | 'pinceau';

export type PhenologyStageId = GddPhenologyStageId | FieldOnlyPhenologyStageId;

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
	/**
	 * Cumulative GDD since agro-season start (1 Jan northern hemisphere / 1 Jul southern).
	 * Field name kept for persistence / API compatibility.
	 */
	cumulativeSinceJan1: number;
	last7dSum: number;
	dailySeries: GddDailyPoint[];
	phenology: GddPhenologyEstimate | null;
	/** Message when phenology is disabled (e.g. evergreen species). */
	phenologyUnavailableReason: string | null;
	speciesLabel: string | null;
}
