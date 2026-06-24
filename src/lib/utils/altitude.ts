import * as m from '$lib/paraglide/messages.js';
import { formatAltitude } from '$lib/utils/gps';

export type BiologicalTier = {
	id: string;
	label: string;
	shortLabel: string;
};

function getBiologicalTiers(): { maxExclusive: number; tier: BiologicalTier }[] {
	return [
		{
			maxExclusive: 400,
			tier: {
				id: 'plaine',
				label: m.altitude_tier_plaine(),
				shortLabel: m.altitude_short_plaine()
			}
		},
		{
			maxExclusive: 800,
			tier: {
				id: 'collines',
				label: m.altitude_tier_collines(),
				shortLabel: m.altitude_short_collines()
			}
		},
		{
			maxExclusive: 1_400,
			tier: {
				id: 'montagne',
				label: m.altitude_tier_montagne(),
				shortLabel: m.altitude_short_montagne()
			}
		},
		{
			maxExclusive: 2_000,
			tier: {
				id: 'subalpin',
				label: m.altitude_tier_subalpin(),
				shortLabel: m.altitude_short_subalpin()
			}
		},
		{
			maxExclusive: Infinity,
			tier: {
				id: 'alpin',
				label: m.altitude_tier_alpin(),
				shortLabel: m.altitude_short_alpin()
			}
		}
	];
}

export function getBiologicalTier(altitudeMeters: number | null): BiologicalTier | null {
	if (altitudeMeters === null) {
		return null;
	}

	const tiers = getBiologicalTiers();
	for (const entry of tiers) {
		if (altitudeMeters < entry.maxExclusive) {
			return entry.tier;
		}
	}

	return tiers[tiers.length - 1].tier;
}

export function formatAltitudeLabel(altitudeMeters: number | null): string | null {
	const formatted = formatAltitude(altitudeMeters);
	if (!formatted) {
		return null;
	}
	return m.altitude_label({ altitude: formatted });
}

export function formatBiologicalAltitude(altitudeMeters: number | null): string | null {
	return formatAltitudeLabel(altitudeMeters);
}

export function formatAltitudeWithTierShort(altitudeMeters: number | null): string | null {
	return formatAltitudeLabel(altitudeMeters);
}
