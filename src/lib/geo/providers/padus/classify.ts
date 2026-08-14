import type { CadastreZoneType } from '$lib/types/cadastre';
import {
	collectStatusForZone,
	mergeCollectStatus
} from '$lib/geo/legal/usCollectStatus';
import type { CollectStatus } from '$lib/types/cadastre';
import type { PadusFeeHit } from '$lib/geo/providers/padus/client';

/** USPS-style state abbreviations for common PAD-US State_Nm values. */
const STATE_ABBREV: Record<string, string> = {
	Alabama: 'AL',
	Alaska: 'AK',
	Arizona: 'AZ',
	Arkansas: 'AR',
	California: 'CA',
	Colorado: 'CO',
	Connecticut: 'CT',
	Delaware: 'DE',
	Florida: 'FL',
	Georgia: 'GA',
	Hawaii: 'HI',
	Idaho: 'ID',
	Illinois: 'IL',
	Indiana: 'IN',
	Iowa: 'IA',
	Kansas: 'KS',
	Kentucky: 'KY',
	Louisiana: 'LA',
	Maine: 'ME',
	Maryland: 'MD',
	Massachusetts: 'MA',
	Michigan: 'MI',
	Minnesota: 'MN',
	Mississippi: 'MS',
	Missouri: 'MO',
	Montana: 'MT',
	Nebraska: 'NE',
	Nevada: 'NV',
	'New Hampshire': 'NH',
	'New Jersey': 'NJ',
	'New Mexico': 'NM',
	'New York': 'NY',
	'North Carolina': 'NC',
	'North Dakota': 'ND',
	Ohio: 'OH',
	Oklahoma: 'OK',
	Oregon: 'OR',
	Pennsylvania: 'PA',
	'Rhode Island': 'RI',
	'South Carolina': 'SC',
	'South Dakota': 'SD',
	Tennessee: 'TN',
	Texas: 'TX',
	Utah: 'UT',
	Vermont: 'VT',
	Virginia: 'VA',
	Washington: 'WA',
	'West Virginia': 'WV',
	Wisconsin: 'WI',
	Wyoming: 'WY',
	'District of Columbia': 'DC'
};

/**
 * Classify a single PAD-US fee hit into a land-tenure zone.
 * Designation type (Des_Tp) can override manager when it is a hard veto.
 */
export function classifyPadusHit(hit: PadusFeeHit): CadastreZoneType {
	const des = hit.designation.toUpperCase();
	const mang = hit.managerName.toUpperCase();
	const mangType = hit.managerType.toUpperCase();
	const unit = hit.unitName.toUpperCase();

	// Hard designation overrides (Wilderness / National Park / military).
	if (des === 'WA' || des === 'WSA' || unit.includes('WILDERNESS')) {
		return 'wilderness';
	}
	if (des === 'NP' || mang === 'NPS') {
		return 'national_park';
	}
	if (mang === 'DOD' || mang === 'USACE' || des === 'MIL') {
		return 'military';
	}
	if (mangType === 'TRIB' || mang === 'TRIB' || mang === 'BIA') {
		return 'tribal';
	}
	if (mang === 'USFS' || des === 'NF' || des === 'NG') {
		return 'national_forest';
	}
	if (mang === 'BLM') {
		return 'blm';
	}
	// FWS National Wildlife Refuge / refuge system — hard veto before other federal.
	if (mang === 'FWS' || des === 'NWR' || unit.includes('NATIONAL WILDLIFE REFUGE')) {
		return 'national_wildlife_area';
	}
	if (des === 'SP' || mang.includes('SP') || unit.includes('STATE PARK')) {
		return 'state_park';
	}
	if (mangType === 'STAT' || mang === 'SLB' || mang === 'SDF' || mang === 'SFW') {
		return 'state_land';
	}
	if (mangType === 'LOC' || mang === 'CITY' || mang === 'CNTY' || mang === 'REG') {
		return 'local_park';
	}
	if (mangType === 'FED' || mang === 'TVA' || mang === 'DOE') {
		return 'other_federal';
	}

	// Any other public fee hit → treat conservatively as agency land.
	if (mang || hit.ownerName) {
		return 'other_federal';
	}
	return 'private';
}

export type ClassifiedPadus = {
	zoneType: CadastreZoneType;
	collectStatus: CollectStatus;
	unitName: string;
	managerName: string;
	designation: string;
	stateCode: string;
	stateName: string;
};

/** Merge multiple overlapping fee features into the most restrictive tenure. */
export function classifyPadusHits(hits: PadusFeeHit[]): ClassifiedPadus {
	if (hits.length === 0) {
		return {
			zoneType: 'private',
			collectStatus: 'owner_permission',
			unitName: '',
			managerName: '',
			designation: '',
			stateCode: '',
			stateName: ''
		};
	}

	const zones = hits.map(classifyPadusHit);
	const statuses = zones.map(collectStatusForZone);
	const collectStatus = mergeCollectStatus(...statuses);

	// Prefer the hit whose zone matches the winning (most restrictive) status.
	let bestIndex = 0;
	let bestRank = Infinity;
	const rank: Record<CadastreZoneType, number> = {
		wilderness: 0,
		national_park: 1,
		military: 2,
		tribal: 3,
		ipca: 3,
		national_wildlife_area: 4,
		provincial_park: 5,
		national_forest: 6,
		blm: 7,
		state_park: 8,
		state_land: 9,
		local_park: 10,
		other_federal: 11,
		state_forest: 12,
		communal_forest: 13,
		private: 14,
		crown_unverified: 15
	};
	for (let i = 0; i < zones.length; i += 1) {
		const r = rank[zones[i]];
		if (r < bestRank) {
			bestRank = r;
			bestIndex = i;
		}
	}

	const best = hits[bestIndex];
	const stateName = best.stateName || hits.find((h) => h.stateName)?.stateName || '';
	const stateCode =
		STATE_ABBREV[stateName] ??
		(stateName.length === 2 ? stateName.toUpperCase() : '');

	return {
		zoneType: zones[bestIndex],
		collectStatus,
		unitName: best.unitName || hits.find((h) => h.unitName)?.unitName || '',
		managerName: best.managerName,
		designation: best.designation,
		stateCode,
		stateName
	};
}
