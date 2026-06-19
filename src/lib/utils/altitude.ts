import { formatAltitude } from '$lib/utils/gps';

export type BiologicalTier = {
	id: string;
	label: string;
	shortLabel: string;
};

const BIOLOGICAL_TIERS: { maxExclusive: number; tier: BiologicalTier }[] = [
	{
		maxExclusive: 400,
		tier: {
			id: 'plaine',
			label: 'Plaine et vallées',
			shortLabel: 'Plaine'
		}
	},
	{
		maxExclusive: 800,
		tier: {
			id: 'collines',
			label: 'Collines et bocage',
			shortLabel: 'Collines'
		}
	},
	{
		maxExclusive: 1_400,
		tier: {
			id: 'montagne',
			label: 'Montagne moyenne',
			shortLabel: 'Montagne'
		}
	},
	{
		maxExclusive: 2_000,
		tier: {
			id: 'subalpin',
			label: 'Étage subalpin',
			shortLabel: 'Subalpin'
		}
	},
	{
		maxExclusive: Infinity,
		tier: {
			id: 'alpin',
			label: 'Étage alpin',
			shortLabel: 'Alpin'
		}
	}
];

export function getBiologicalTier(altitudeMeters: number | null): BiologicalTier | null {
	if (altitudeMeters === null) {
		return null;
	}

	for (const entry of BIOLOGICAL_TIERS) {
		if (altitudeMeters < entry.maxExclusive) {
			return entry.tier;
		}
	}

	return BIOLOGICAL_TIERS[BIOLOGICAL_TIERS.length - 1].tier;
}

export function formatBiologicalAltitude(altitudeMeters: number | null): string | null {
	const formatted = formatAltitude(altitudeMeters);
	if (!formatted) {
		return null;
	}

	const tier = getBiologicalTier(altitudeMeters);
	if (!tier) {
		return formatted;
	}

	return `${formatted} — ${tier.label}`;
}

export function formatAltitudeWithTierShort(altitudeMeters: number | null): string | null {
	const formatted = formatAltitude(altitudeMeters);
	if (!formatted) {
		return null;
	}

	const tier = getBiologicalTier(altitudeMeters);
	if (!tier) {
		return formatted;
	}

	return `${formatted} (${tier.shortLabel})`;
}
