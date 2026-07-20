import * as m from '$lib/paraglide/messages.js';
import type {
	ProtectedAreaScan,
	ProtectedZoneCardId,
	ProtectedZoneHit
} from '$lib/types/harvest-ethics';
import { emptyZoneStatus } from '$lib/geo/providers/protected/eea';
import { classifyCpcadHit } from '$lib/geo/providers/cpcad/classify';
import { queryCpcadAt } from '$lib/geo/providers/cpcad/client';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { throwIfAborted } from '$lib/utils/abortSignal';
import { getActiveLocale } from '$lib/utils/i18n/locale';

const CA_VETO_CARDS: ProtectedZoneCardId[] = [
	'parks_canada',
	'provincial_park',
	'nwa',
	'ipca',
	'wilderness'
];

function cardLabel(cardId: ProtectedZoneCardId): string {
	switch (cardId) {
		case 'parks_canada':
			return m.veto_zone_parks_canada();
		case 'provincial_park':
			return m.veto_zone_provincial_park();
		case 'nwa':
			return m.veto_zone_nwa();
		case 'ipca':
			return m.veto_zone_ipca();
		case 'crown_unverified':
			return m.veto_zone_crown_unverified();
		case 'wilderness':
			return m.veto_zone_wilderness();
		default:
			return cardId;
	}
}

function zoneToCard(zone: ReturnType<typeof classifyCpcadHit>): ProtectedZoneCardId | null {
	switch (zone) {
		case 'national_park':
			return 'parks_canada';
		case 'provincial_park':
		case 'state_park':
			return 'provincial_park';
		case 'national_wildlife_area':
			return 'nwa';
		case 'ipca':
		case 'tribal':
			return 'ipca';
		case 'wilderness':
			return 'wilderness';
		case 'military':
		case 'other_federal':
		case 'local_park':
			return 'nwa';
		case 'crown_unverified':
			return 'crown_unverified';
		default:
			return null;
	}
}

/**
 * Canada protected-area scan from CPCAD.
 */
export async function scanProtectedAreasCa(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<ProtectedAreaScan> {
	throwIfAborted(options?.signal);

	if (!pointInCountryBboxes(latitude, longitude, 'CA')) {
		return {
			scannedAt: new Date().toISOString(),
			hits: [],
			veto: false,
			zoneStatus: emptyZoneStatus(),
			fromCache: false,
			coverage: 'unsupported'
		};
	}

	const hits = await queryCpcadAt(latitude, longitude, options);
	const zoneStatus = emptyZoneStatus();
	const protectedHits: ProtectedZoneHit[] = [];
	const seen = new Set<string>();
	const preferFr = getActiveLocale() === 'fr';

	if (hits.length === 0) {
		zoneStatus.crown_unverified = 'certain';
		protectedHits.push({
			id: 'crown_unverified',
			label: cardLabel('crown_unverified'),
			level: 'caution'
		});
	} else {
		for (const hit of hits) {
			const zone = classifyCpcadHit(hit);
			const cardId = zoneToCard(zone);
			if (!cardId) continue;

			zoneStatus[cardId] = 'certain';
			const unitName = preferFr ? hit.nameFr || hit.nameEn : hit.nameEn || hit.nameFr;
			const id = `${cardId}:${unitName || hit.manager || cardId}`;
			if (seen.has(id)) continue;
			seen.add(id);

			const level = CA_VETO_CARDS.includes(cardId) ? 'veto' : 'caution';
			const label = unitName ? `${cardLabel(cardId)} — ${unitName}` : cardLabel(cardId);
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

export function caZoneCardIds(): ProtectedZoneCardId[] {
	return ['parks_canada', 'provincial_park', 'nwa', 'ipca', 'crown_unverified'];
}
