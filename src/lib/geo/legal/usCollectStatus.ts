import type { CadastreZoneType, CollectStatus } from '$lib/types/cadastre';

/**
 * Priority when multiple tenure attributes apply:
 * hard veto (parks / wilderness / IPCA / military) >
 * permit / agency >
 * owner >
 * unknown / crown_unverified
 */
const STATUS_BY_ZONE: Record<CadastreZoneType, CollectStatus> = {
	national_park: 'forbidden',
	wilderness: 'forbidden',
	military: 'forbidden',
	tribal: 'forbidden',
	ipca: 'forbidden',
	national_wildlife_area: 'forbidden',
	provincial_park: 'forbidden',
	national_forest: 'permit_required',
	blm: 'permit_required',
	state_park: 'forbidden_or_agency',
	state_land: 'forbidden_or_agency',
	local_park: 'forbidden_or_agency',
	other_federal: 'forbidden_or_agency',
	/** FR régimes — treat as agency / forest manager permission. */
	state_forest: 'permit_required',
	communal_forest: 'forbidden_or_agency',
	private: 'owner_permission',
	/** Canada outside CPCAD — may be Crown or private. */
	crown_unverified: 'unknown'
};

const STATUS_RANK: Record<CollectStatus, number> = {
	forbidden: 0,
	forbidden_or_agency: 1,
	permit_required: 2,
	owner_permission: 3,
	unknown: 4
};

export function collectStatusForZone(zoneType: CadastreZoneType): CollectStatus {
	return STATUS_BY_ZONE[zoneType];
}

/** Pick the most restrictive status among candidates. */
export function mergeCollectStatus(...statuses: CollectStatus[]): CollectStatus {
	if (statuses.length === 0) return 'unknown';
	return statuses.reduce((best, next) =>
		STATUS_RANK[next] < STATUS_RANK[best] ? next : best
	);
}

export function isCollectVeto(status: CollectStatus | undefined): boolean {
	return status === 'forbidden';
}
