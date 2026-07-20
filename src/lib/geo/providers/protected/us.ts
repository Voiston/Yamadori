import * as m from '$lib/paraglide/messages.js';
import type {
	ProtectedAreaScan,
	ProtectedZoneCardId,
	ProtectedZoneHit,
	ProtectedZonePresence
} from '$lib/types/harvest-ethics';
import { emptyZoneStatus } from '$lib/geo/providers/protected/eea';
import { classifyPadusHit } from '$lib/geo/providers/padus/classify';
import { queryPadusFeeAt } from '$lib/geo/providers/padus/client';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { throwIfAborted } from '$lib/utils/abortSignal';

const US_VETO_CARDS: ProtectedZoneCardId[] = ['nps', 'wilderness', 'tribal'];

function cardLabel(cardId: ProtectedZoneCardId): string {
	switch (cardId) {
		case 'nps':
			return m.veto_zone_nps();
		case 'wilderness':
			return m.veto_zone_wilderness();
		case 'usfs':
			return m.veto_zone_usfs();
		case 'blm':
			return m.veto_zone_blm();
		case 'state_park':
			return m.veto_zone_state_park();
		case 'tribal':
			return m.veto_zone_tribal();
		default:
			return cardId;
	}
}

function zoneToCard(zone: ReturnType<typeof classifyPadusHit>): ProtectedZoneCardId | null {
	switch (zone) {
		case 'national_park':
			return 'nps';
		case 'wilderness':
			return 'wilderness';
		case 'national_forest':
			return 'usfs';
		case 'blm':
			return 'blm';
		case 'state_park':
		case 'state_land':
		case 'local_park':
			return 'state_park';
		case 'tribal':
			return 'tribal';
		case 'military':
			return 'nps'; // hard veto — reuse nps card severity
		default:
			return null;
	}
}

/**
 * US protected / public-land scan from PAD-US Fee Managers.
 * Cards are US-specific (see ProtectedZoneCardId); FR cards stay clear.
 */
export async function scanProtectedAreasUs(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<ProtectedAreaScan> {
	throwIfAborted(options?.signal);

	if (!pointInCountryBboxes(latitude, longitude, 'US')) {
		return {
			scannedAt: new Date().toISOString(),
			hits: [],
			veto: false,
			zoneStatus: emptyZoneStatus(),
			fromCache: false,
			coverage: 'unsupported'
		};
	}

	const hits = await queryPadusFeeAt(latitude, longitude, options);
	const zoneStatus = emptyZoneStatus();
	const protectedHits: ProtectedZoneHit[] = [];
	const seen = new Set<string>();

	for (const hit of hits) {
		const zone = classifyPadusHit(hit);
		const cardId = zoneToCard(zone);
		if (!cardId) continue;

		zoneStatus[cardId] = 'certain';
		const id = `${cardId}:${hit.unitName || hit.managerName || cardId}`;
		if (seen.has(id)) continue;
		seen.add(id);

		const level = US_VETO_CARDS.includes(cardId) ? 'veto' : 'caution';
		const label = hit.unitName
			? `${cardLabel(cardId)} — ${hit.unitName}`
			: cardLabel(cardId);
		protectedHits.push({ id, label, level });
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

export function usZoneCardIds(): ProtectedZoneCardId[] {
	return ['nps', 'wilderness', 'usfs', 'blm', 'state_park', 'tribal'];
}

export type { ProtectedZonePresence };
