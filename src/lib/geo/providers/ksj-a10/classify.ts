import type { CadastreZoneType, CollectStatus } from '$lib/types/cadastre';
import {
	collectStatusForZone,
	mergeCollectStatus
} from '$lib/geo/legal/usCollectStatus';
import type { KsjA10Hit } from '$lib/geo/providers/ksj-a10/client';

/**
 * Classify a KSJ A10 natural-park feature into land tenure for ethics UI.
 * Special / strict zones (特別地域 / 特別保護地区) always rank as national_park (veto).
 */
export function classifyKsjA10Hit(hit: KsjA10Hit): CadastreZoneType {
	if (hit.layerKind === 'strict' || hit.layerKind === 'special') {
		return 'national_park';
	}

	const name = hit.name;
	if (/国立公園|国定公園/i.test(name) || /national\s*park|quasi[- ]?national/i.test(name)) {
		return 'national_park';
	}

	if (
		/[都道府県]立/.test(name) ||
		/県立|都立|道立|府立/.test(name) ||
		/prefectural|regional\s*park/i.test(name)
	) {
		return 'state_park';
	}

	if (/自然公園/.test(name) || hit.layerKind === 'region') {
		return 'state_park';
	}

	if (hit.name || hit.layerNo) {
		return 'other_federal';
	}

	return 'crown_unverified';
}

export type ClassifiedKsjA10 = {
	zoneType: CadastreZoneType;
	collectStatus: CollectStatus;
	unitName: string;
	managerName: string;
	designation: string;
	prefectureCode: string;
	objectId: string;
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

function designationLabel(hit: KsjA10Hit): string {
	if (hit.layerKind === 'strict') return '特別保護地区';
	if (hit.layerKind === 'special') return '特別地域';
	if (hit.layerKind === 'region') return '自然公園地域';
	return hit.name || '自然公園';
}

/** Merge overlapping KSJ features into the most restrictive tenure. */
export function classifyKsjA10Hits(hits: KsjA10Hit[]): ClassifiedKsjA10 {
	if (hits.length === 0) {
		return {
			zoneType: 'crown_unverified',
			collectStatus: 'unknown',
			unitName: '',
			managerName: '',
			designation: '',
			prefectureCode: '',
			objectId: ''
		};
	}

	const zones = hits.map(classifyKsjA10Hit);
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
		managerName: best.prefectureCode
			? `自然公園 (pref. ${best.prefectureCode})`
			: '自然公園 (KSJ A10)',
		designation: designationLabel(best),
		prefectureCode: best.prefectureCode,
		objectId: best.objectId
	};
}
