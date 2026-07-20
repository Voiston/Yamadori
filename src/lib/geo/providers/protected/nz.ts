import * as m from '$lib/paraglide/messages.js';
import type {
	ProtectedAreaScan,
	ProtectedZoneCardId,
	ProtectedZoneHit
} from '$lib/types/harvest-ethics';
import { emptyZoneStatus } from '$lib/geo/providers/protected/eea';
import { classifyDocPclHit } from '$lib/geo/providers/doc-pcl/classify';
import { queryDocPclAt } from '$lib/geo/providers/doc-pcl/client';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { throwIfAborted } from '$lib/utils/abortSignal';

const NZ_VETO_CARDS: ProtectedZoneCardId[] = [
	'doc_national_park',
	'wilderness',
	'whenua_rahui',
	'doc_conservation'
];

function cardLabel(cardId: ProtectedZoneCardId): string {
	switch (cardId) {
		case 'doc_national_park':
			return m.veto_zone_doc_national_park();
		case 'doc_conservation':
			return m.veto_zone_doc_conservation();
		case 'wilderness':
			return m.veto_zone_wilderness();
		case 'whenua_rahui':
			return m.veto_zone_whenua_rahui();
		case 'outside_pcl':
			return m.veto_zone_outside_pcl();
		default:
			return cardId;
	}
}

function zoneToCard(zone: ReturnType<typeof classifyDocPclHit>): ProtectedZoneCardId | null {
	switch (zone) {
		case 'national_park':
			return 'doc_national_park';
		case 'wilderness':
			return 'wilderness';
		case 'tribal':
		case 'ipca':
			return 'whenua_rahui';
		case 'national_wildlife_area':
		case 'other_federal':
		case 'local_park':
		case 'military':
			return 'doc_conservation';
		case 'crown_unverified':
			return 'outside_pcl';
		default:
			return null;
	}
}

/**
 * New Zealand protected-area scan from DOC Public Conservation Areas.
 */
export async function scanProtectedAreasNz(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<ProtectedAreaScan> {
	throwIfAborted(options?.signal);

	if (!pointInCountryBboxes(latitude, longitude, 'NZ')) {
		return {
			scannedAt: new Date().toISOString(),
			hits: [],
			veto: false,
			zoneStatus: emptyZoneStatus(),
			fromCache: false,
			coverage: 'unsupported'
		};
	}

	const hits = await queryDocPclAt(latitude, longitude, options);
	const zoneStatus = emptyZoneStatus();
	const protectedHits: ProtectedZoneHit[] = [];
	const seen = new Set<string>();

	if (hits.length === 0) {
		zoneStatus.outside_pcl = 'certain';
		protectedHits.push({
			id: 'outside_pcl',
			label: cardLabel('outside_pcl'),
			level: 'caution'
		});
	} else {
		for (const hit of hits) {
			const zone = classifyDocPclHit(hit);
			const cardId = zoneToCard(zone);
			if (!cardId) continue;

			zoneStatus[cardId] = 'certain';
			const id = `${cardId}:${hit.name || hit.section || cardId}`;
			if (seen.has(id)) continue;
			seen.add(id);

			const level = NZ_VETO_CARDS.includes(cardId) ? 'veto' : 'caution';
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
		coverage: 'full'
	};
}

export function nzZoneCardIds(): ProtectedZoneCardId[] {
	return ['doc_national_park', 'doc_conservation', 'wilderness', 'whenua_rahui', 'outside_pcl'];
}
