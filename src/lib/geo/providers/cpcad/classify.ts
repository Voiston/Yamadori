import type { CadastreZoneType, CollectStatus } from '$lib/types/cadastre';
import {
	collectStatusForZone,
	mergeCollectStatus
} from '$lib/geo/legal/usCollectStatus';
import type { CpcadHit } from '$lib/geo/providers/cpcad/client';

/** Map CPCAD JUR_ID / type hints to province codes when obvious. */
const JUR_TO_PROVINCE: Record<string, string> = {
	BC: 'BC',
	AB: 'AB',
	SK: 'SK',
	MB: 'MB',
	ON: 'ON',
	QC: 'QC',
	NB: 'NB',
	NS: 'NS',
	PE: 'PE',
	NL: 'NL',
	YT: 'YT',
	NT: 'NT',
	NU: 'NU',
	PCA: '', // Parks Canada — federal
	EC: '',
	DFO: ''
};

/**
 * Classify a single CPCAD feature into land tenure.
 */
export function classifyCpcadHit(hit: CpcadHit): CadastreZoneType {
	const type = hit.typeEn.toLowerCase();
	const owner = hit.owner.toLowerCase();
	const manager = hit.manager.toLowerCase();

	if (hit.ipca || type.includes('indigenous protected')) {
		return 'ipca';
	}
	if (
		type.includes('national park') ||
		owner.includes('parks canada') ||
		manager.includes('parks canada')
	) {
		return 'national_park';
	}
	if (
		type.includes('national wildlife') ||
		type.includes('migratory bird') ||
		type.includes('wildlife area')
	) {
		return 'national_wildlife_area';
	}
	if (
		type.includes('provincial park') ||
		type.includes('territorial park') ||
		type.includes('provincial protected') ||
		type.includes('parc provincial')
	) {
		return 'provincial_park';
	}
	if (type.includes('wilderness') || hit.iucnCat === 1 || hit.iucnCat === 2) {
		// IUCN Ia/Ib/II often national/provincial parks already caught; residual → wilderness-like.
		if (type.includes('park')) return 'provincial_park';
		return 'wilderness';
	}
	if (type.includes('military') || owner.includes('department of national defence')) {
		return 'military';
	}
	if (
		type.includes('municipal') ||
		type.includes('regional park') ||
		type.includes('conservation area')
	) {
		return 'local_park';
	}
	// Other protected / OECM → other_federal or agency land.
	if (hit.paOecm === 1 || type.length > 0) {
		return 'other_federal';
	}
	return 'crown_unverified';
}

export type ClassifiedCpcad = {
	zoneType: CadastreZoneType;
	collectStatus: CollectStatus;
	unitName: string;
	unitNameFr: string;
	managerName: string;
	designation: string;
	provinceCode: string;
};

const ZONE_RANK: Record<CadastreZoneType, number> = {
	ipca: 0,
	national_park: 1,
	wilderness: 2,
	national_wildlife_area: 3,
	provincial_park: 4,
	military: 5,
	tribal: 6,
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

/** Merge overlapping CPCAD features into the most restrictive tenure. */
export function classifyCpcadHits(hits: CpcadHit[]): ClassifiedCpcad {
	if (hits.length === 0) {
		return {
			zoneType: 'crown_unverified',
			collectStatus: 'unknown',
			unitName: '',
			unitNameFr: '',
			managerName: '',
			designation: '',
			provinceCode: ''
		};
	}

	const zones = hits.map(classifyCpcadHit);
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
	const jur = best.jurId.toUpperCase();
	const provinceCode = JUR_TO_PROVINCE[jur] ?? (jur.length === 2 ? jur : '');

	return {
		zoneType: zones[bestIndex],
		collectStatus,
		unitName: best.nameEn || best.nameFr,
		unitNameFr: best.nameFr || best.nameEn,
		managerName: best.manager || best.owner,
		designation: best.typeEn,
		provinceCode
	};
}
