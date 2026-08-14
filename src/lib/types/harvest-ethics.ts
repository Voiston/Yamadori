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
	| 'appb'
	/** US PAD-US cards */
	| 'nps'
	| 'wilderness'
	| 'usfs'
	| 'blm'
	| 'state_park'
	| 'tribal'
	/** Canada CPCAD cards */
	| 'parks_canada'
	| 'provincial_park'
	| 'nwa'
	| 'ipca'
	| 'crown_unverified'
	/** New Zealand DOC PCL cards */
	| 'doc_national_park'
	| 'doc_conservation'
	| 'whenua_rahui'
	| 'outside_pcl'
	/** Australia CAPAD cards */
	| 'capad_national_park'
	| 'capad_conservation'
	| 'capad_ipa'
	| 'outside_capad'
	/** Japan KSJ A10 (自然公園地域) cards */
	| 'ksj_national_park'
	| 'ksj_special_zone'
	| 'ksj_prefectural_park'
	| 'outside_ksj';

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
	/**
	 * Geographic/provider coverage for this scan.
	 * - full: national provider covers the point
	 * - partial: provider covers only part of the country (e.g. England-only for GB)
	 * - unsupported: no live provider for this jurisdiction
	 */
	coverage?: 'full' | 'partial' | 'unsupported';
}

/** Offline curated species-protection lookup persisted with the ethics confirmation. */
export interface SpeciesProtectionScanStored {
	scannedAt: string;
	country: string | null;
	hit: {
		id: string;
		label: string;
		matchedName: string;
		level: ProtectedZoneLevel;
		scope: 'national' | 'regional';
		sourceName: string;
		sourceUrl: string;
	} | null;
	coverage: 'full' | 'partial' | 'unsupported';
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
	/** Curated species protection lookup at confirmation time (v3+). */
	speciesProtectionScan?: SpeciesProtectionScanStored | null;
}
