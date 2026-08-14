import type { CadastreZoneType, CollectStatus } from '$lib/types/cadastre';
import {
	collectStatusForZone,
	mergeCollectStatus
} from '$lib/geo/legal/usCollectStatus';
import type { CapadHit } from '$lib/geo/providers/capad/client';

/**
 * Classify a single CAPAD terrestrial feature into land tenure.
 */
export function classifyCapadHit(hit: CapadHit): CadastreZoneType {
	const type = hit.type.toUpperCase();
	const zone = hit.zoneType.toUpperCase();
	const iucn = hit.iucn.toUpperCase();
	const blob = `${type} ${zone} ${iucn} ${hit.name} ${hit.epbc}`.toUpperCase();

	if (
		blob.includes('INDIGENOUS PROTECTED') ||
		blob.includes('IPA') ||
		type.includes('IPA') ||
		zone.includes('IPA')
	) {
		return 'ipca';
	}

	if (
		blob.includes('NATIONAL PARK') ||
		type.includes('NATIONAL PARK') ||
		iucn === 'II'
	) {
		return 'national_park';
	}

	if (
		iucn === 'IA' ||
		iucn === 'IB' ||
		blob.includes('WILDERNESS') ||
		blob.includes('NATURE RESERVE') ||
		blob.includes('STRICT NATURE') ||
		blob.includes('SCIENTIFIC')
	) {
		return 'wilderness';
	}

	if (
		blob.includes('WILDLIFE') ||
		blob.includes('REFUGE') ||
		blob.includes('SANCTUARY')
	) {
		return 'national_wildlife_area';
	}

	if (
		blob.includes('STATE PARK') ||
		blob.includes('REGIONAL PARK') ||
		blob.includes('CONSERVATION PARK')
	) {
		return 'state_park';
	}

	if (
		blob.includes('FOREST') &&
		(blob.includes('STATE') || blob.includes('NATIONAL'))
	) {
		return 'state_forest';
	}

	// Residual CAPAD NRS / conservation reserves
	if (type || zone || iucn) {
		return 'other_federal';
	}

	return 'crown_unverified';
}

export type ClassifiedCapad = {
	zoneType: CadastreZoneType;
	collectStatus: CollectStatus;
	unitName: string;
	managerName: string;
	designation: string;
	stateCode: string;
	paId: string;
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

/** Merge overlapping CAPAD features into the most restrictive tenure. */
export function classifyCapadHits(hits: CapadHit[]): ClassifiedCapad {
	if (hits.length === 0) {
		return {
			zoneType: 'crown_unverified',
			collectStatus: 'unknown',
			unitName: '',
			managerName: '',
			designation: '',
			stateCode: '',
			paId: ''
		};
	}

	const zones = hits.map(classifyCapadHit);
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
		managerName: best.state ? `Protected area (${best.state})` : 'Protected area (CAPAD)',
		designation: best.type || best.zoneType || best.iucn,
		stateCode: best.state,
		paId: best.paId
	};
}
