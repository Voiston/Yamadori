import * as m from '$lib/paraglide/messages.js';
import type {
	ProtectedAreaScan,
	ProtectedZoneCardId,
	ProtectedZoneHit
} from '$lib/types/harvest-ethics';
import { emptyZoneStatus } from '$lib/geo/providers/protected/eea';
import { classifyKsjA10Hit } from '$lib/geo/providers/ksj-a10/classify';
import { queryKsjA10At, type KsjA10Hit } from '$lib/geo/providers/ksj-a10/client';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { throwIfAborted } from '$lib/utils/abortSignal';

const JP_VETO_CARDS: ProtectedZoneCardId[] = ['ksj_national_park', 'ksj_special_zone'];

function cardLabel(cardId: ProtectedZoneCardId): string {
	switch (cardId) {
		case 'ksj_national_park':
			return m.veto_zone_ksj_national_park();
		case 'ksj_special_zone':
			return m.veto_zone_ksj_special_zone();
		case 'ksj_prefectural_park':
			return m.veto_zone_ksj_prefectural_park();
		case 'outside_ksj':
			return m.veto_zone_outside_ksj();
		default:
			return cardId;
	}
}

function zoneToCard(
	zone: ReturnType<typeof classifyKsjA10Hit>,
	hit: KsjA10Hit
): ProtectedZoneCardId | null {
	if (hit.layerKind === 'strict' || hit.layerKind === 'special') {
		return 'ksj_special_zone';
	}
	switch (zone) {
		case 'national_park':
			return 'ksj_national_park';
		case 'state_park':
		case 'other_federal':
		case 'local_park':
			return 'ksj_prefectural_park';
		case 'crown_unverified':
			return 'outside_ksj';
		default:
			return 'ksj_prefectural_park';
	}
}

/**
 * Japan protected-area scan from static natural-park polygons (MOE / optional KSJ A10).
 * No API key. Must never fall through to EEA.
 */
export async function scanProtectedAreasJp(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<ProtectedAreaScan> {
	throwIfAborted(options?.signal);

	if (!pointInCountryBboxes(latitude, longitude, 'JP')) {
		return {
			scannedAt: new Date().toISOString(),
			hits: [],
			veto: false,
			zoneStatus: emptyZoneStatus(),
			fromCache: false,
			coverage: 'unsupported'
		};
	}

	let hits: KsjA10Hit[];
	try {
		hits = await queryKsjA10At(latitude, longitude, options);
	} catch {
		return {
			scannedAt: new Date().toISOString(),
			hits: [],
			veto: false,
			zoneStatus: emptyZoneStatus(),
			fromCache: false,
			coverage: 'unsupported'
		};
	}

	const zoneStatus = emptyZoneStatus();
	const protectedHits: ProtectedZoneHit[] = [];
	const seen = new Set<string>();

	if (hits.length === 0) {
		zoneStatus.outside_ksj = 'certain';
		protectedHits.push({
			id: 'outside_ksj',
			label: cardLabel('outside_ksj'),
			level: 'caution'
		});
	} else {
		for (const hit of hits) {
			const zone = classifyKsjA10Hit(hit);
			const cardId = zoneToCard(zone, hit);
			if (!cardId) continue;

			zoneStatus[cardId] = 'certain';
			const id = `${cardId}:${hit.name || hit.objectId || cardId}`;
			if (seen.has(id)) continue;
			seen.add(id);

			const level = JP_VETO_CARDS.includes(cardId) ? 'veto' : 'caution';
			const label = hit.name ? `${cardLabel(cardId)} — ${hit.name}` : cardLabel(cardId);
			protectedHits.push({ id, label, level });
		}
	}

	const veto = protectedHits.some((h) => h.level === 'veto');

	return {
		scannedAt: new Date().toISOString(),
		hits: protectedHits,
		veto,
		zoneStatus,
		fromCache: false,
		coverage: 'partial'
	};
}

export function jpZoneCardIds(): ProtectedZoneCardId[] {
	return ['ksj_national_park', 'ksj_special_zone', 'ksj_prefectural_park', 'outside_ksj'];
}
