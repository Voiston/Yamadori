import * as m from '$lib/paraglide/messages.js';
import type {
	ProtectedAreaScan,
	ProtectedZoneCardId,
	ProtectedZoneHit
} from '$lib/types/harvest-ethics';
import { emptyZoneStatus } from '$lib/geo/providers/protected/eea';
import { classifyCapadHit } from '$lib/geo/providers/capad/classify';
import { queryCapadAt } from '$lib/geo/providers/capad/client';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { throwIfAborted } from '$lib/utils/abortSignal';

const AU_VETO_CARDS: ProtectedZoneCardId[] = [
	'capad_national_park',
	'wilderness',
	'capad_ipa',
	'capad_conservation'
];

function cardLabel(cardId: ProtectedZoneCardId): string {
	switch (cardId) {
		case 'capad_national_park':
			return m.veto_zone_capad_national_park();
		case 'capad_conservation':
			return m.veto_zone_capad_conservation();
		case 'wilderness':
			return m.veto_zone_wilderness();
		case 'capad_ipa':
			return m.veto_zone_capad_ipa();
		case 'outside_capad':
			return m.veto_zone_outside_capad();
		default:
			return cardId;
	}
}

function zoneToCard(zone: ReturnType<typeof classifyCapadHit>): ProtectedZoneCardId | null {
	switch (zone) {
		case 'national_park':
			return 'capad_national_park';
		case 'wilderness':
			return 'wilderness';
		case 'tribal':
		case 'ipca':
			return 'capad_ipa';
		case 'national_wildlife_area':
		case 'other_federal':
		case 'state_park':
		case 'state_forest':
		case 'local_park':
		case 'military':
			return 'capad_conservation';
		case 'crown_unverified':
			return 'outside_capad';
		default:
			return null;
	}
}

/**
 * Australia protected-area scan from CAPAD terrestrial layer.
 */
export async function scanProtectedAreasAu(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<ProtectedAreaScan> {
	throwIfAborted(options?.signal);

	if (!pointInCountryBboxes(latitude, longitude, 'AU')) {
		return {
			scannedAt: new Date().toISOString(),
			hits: [],
			veto: false,
			zoneStatus: emptyZoneStatus(),
			fromCache: false,
			coverage: 'unsupported'
		};
	}

	const hits = await queryCapadAt(latitude, longitude, options);
	const zoneStatus = emptyZoneStatus();
	const protectedHits: ProtectedZoneHit[] = [];
	const seen = new Set<string>();

	if (hits.length === 0) {
		zoneStatus.outside_capad = 'certain';
		protectedHits.push({
			id: 'outside_capad',
			label: cardLabel('outside_capad'),
			level: 'caution'
		});
	} else {
		for (const hit of hits) {
			const zone = classifyCapadHit(hit);
			const cardId = zoneToCard(zone);
			if (!cardId) continue;

			zoneStatus[cardId] = 'certain';
			const id = `${cardId}:${hit.name || hit.type || cardId}`;
			if (seen.has(id)) continue;
			seen.add(id);

			const level = AU_VETO_CARDS.includes(cardId) ? 'veto' : 'caution';
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

export function auZoneCardIds(): ProtectedZoneCardId[] {
	return [
		'capad_national_park',
		'capad_conservation',
		'wilderness',
		'capad_ipa',
		'outside_capad'
	];
}
