export type ProtectedZoneLevel = 'veto' | 'caution';

/** Absence, chevauchement parcelle cadastrale, ou présence certaine au point GPS. */
export type ProtectedZonePresence = 'clear' | 'potential' | 'certain';

export type ProtectedZoneCardId =
	| 'pn'
	| 'rnn'
	| 'pnr'
	| 'rnr_regional'
	| 'natura2000'
	| 'znieff'
	| 'appb';

export interface ProtectedZoneHit {
	id: string;
	label: string;
	level: ProtectedZoneLevel;
}

export interface ProtectedAreaScan {
	scannedAt: string;
	hits: ProtectedZoneHit[];
	veto: boolean;
	zoneStatus: Record<ProtectedZoneCardId, ProtectedZonePresence>;
	/** Résultat servi depuis le cache local (hors-ligne ou relecture). */
	fromCache?: boolean;
}

export interface HarvestEthicsConfirmation {
	confirmedAt: string;
	propertyAuthorization: boolean;
	notInProtectedArea: boolean;
	speciesNotProtected: boolean;
	siteRestoration: boolean;
	/** Acceptation de la clause d'information indicative (checklist v2+). */
	acknowledgedInformationalLimit?: boolean;
	protectedAreaScan: ProtectedAreaScan | null;
}
