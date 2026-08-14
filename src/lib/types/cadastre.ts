/** FR forest régimes + US/CA public-land tenure. */
export type CadastreZoneType =
	| 'state_forest'
	| 'communal_forest'
	| 'private'
	| 'national_forest'
	| 'blm'
	| 'national_park'
	| 'wilderness'
	| 'state_park'
	| 'state_land'
	| 'local_park'
	| 'tribal'
	| 'military'
	| 'other_federal'
	/** Canada — provincial parks (CPCAD). */
	| 'provincial_park'
	/** Canada — National Wildlife Area / similar federal PA. */
	| 'national_wildlife_area'
	/** Canada — Indigenous Protected and Conserved Area. */
	| 'ipca'
	/**
	 * Canada — no CPCAD hit: may be Crown or private.
	 * Never treat as a green light for collecting.
	 */
	| 'crown_unverified';

/**
 * Indicative collectability for the detected land tenure.
 * Never means “legal without conditions” — at best permit / owner permission.
 */
export type CollectStatus =
	| 'forbidden'
	| 'permit_required'
	| 'forbidden_or_agency'
	| 'owner_permission'
	| 'unknown';

export interface CadastreInfo {
	commune: string;
	section: string;
	parcelNumber: string;
	codeInsee: string;
	zoneType: CadastreZoneType;
	fetchedAt: string;
	/** Agency / CPCAD / PAD-US unit name. */
	unitName?: string;
	/** Manager / owner label. */
	managerName?: string;
	/** US state or CA province code when known (e.g. “CO”, “BC”). */
	stateCode?: string;
	/** Designation type code / TYPE_E. */
	designation?: string;
	/** Derived collectability for checklist / banner. */
	collectStatus?: CollectStatus;
}
