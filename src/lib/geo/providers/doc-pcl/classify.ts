import type { CadastreZoneType, CollectStatus } from '$lib/types/cadastre';
import {
	collectStatusForZone,
	mergeCollectStatus
} from '$lib/geo/legal/usCollectStatus';
import type { DocPclHit } from '$lib/geo/providers/doc-pcl/client';

/**
 * Classify a single DOC Public Conservation Land feature into land tenure.
 */
export function classifyDocPclHit(hit: DocPclHit): CadastreZoneType {
	const type = hit.type.toUpperCase();
	const section = hit.section.toUpperCase();
	const legislation = hit.legislation.toUpperCase();
	const blob = `${type} ${section} ${legislation} ${hit.name}`.toUpperCase();

	if (
		blob.includes('WHENUA') ||
		blob.includes('RAHUI') ||
		section.includes('WHENUA_RAHUI') ||
		section.includes('NGA_WHENUA')
	) {
		return 'tribal';
	}

	if (
		type === 'NATIONAL_PARK' ||
		section.includes('NATIONAL_PARK') ||
		legislation.includes('NATIONAL_PARK')
	) {
		return 'national_park';
	}

	if (
		section.includes('WILDERNESS') ||
		blob.includes('NATURE_RESERVE') ||
		blob.includes('SCIENTIFIC_RESERVE') ||
		blob.includes('SANCTUARY') ||
		blob.includes('SCENIC') ||
		section.includes('S20_') ||
		section.includes('S22_')
	) {
		return 'wilderness';
	}

	if (
		type === 'WILDLIFE_AREA' ||
		blob.includes('WILDLIFE') ||
		section.includes('WILDLIFE')
	) {
		return 'national_wildlife_area';
	}

	if (
		blob.includes('RECREATION') ||
		blob.includes('LOCAL_PURPOSE') ||
		blob.includes('HISTORIC_RESERVE') ||
		(type === 'RESERVE' &&
			!blob.includes('NATURE') &&
			!blob.includes('SCIENTIFIC') &&
			!blob.includes('SCENIC'))
	) {
		return 'local_park';
	}

	// Conservation Area / Park / Stewardship / Ecological / residual PCL
	if (type === 'CONSERVATION_AREA' || type === 'RESERVE' || type === 'MARGINAL_STRIP' || type) {
		return 'other_federal';
	}

	return 'crown_unverified';
}

export type ClassifiedDocPcl = {
	zoneType: CadastreZoneType;
	collectStatus: CollectStatus;
	unitName: string;
	managerName: string;
	designation: string;
};

const ZONE_RANK: Record<CadastreZoneType, number> = {
	tribal: 0,
	national_park: 1,
	wilderness: 2,
	national_wildlife_area: 3,
	ipca: 4,
	provincial_park: 5,
	military: 6,
	other_federal: 7,
	local_park: 8,
	state_park: 9,
	state_land: 10,
	national_forest: 11,
	blm: 12,
	state_forest: 13,
	communal_forest: 14,
	private: 15,
	crown_unverified: 16
};

/** Merge overlapping DOC PCL features into the most restrictive tenure. */
export function classifyDocPclHits(hits: DocPclHit[]): ClassifiedDocPcl {
	if (hits.length === 0) {
		return {
			zoneType: 'crown_unverified',
			collectStatus: 'unknown',
			unitName: '',
			managerName: '',
			designation: ''
		};
	}

	const zones = hits.map(classifyDocPclHit);
	const collectStatus = mergeCollectStatus(...zones.map(collectStatusForZone));

	let bestIndex = 0;
	let bestRank = Infinity;
	for (let i = 0; i < zones.length; i += 1) {
		const r = ZONE_RANK[zones[i]];
		if (r < bestRank) {
			bestRank = r;
			bestIndex = i;
		}
	}

	const best = hits[bestIndex];
	return {
		zoneType: zones[bestIndex],
		collectStatus,
		unitName: best.name,
		managerName: 'Department of Conservation',
		designation: best.section || best.type
	};
}
