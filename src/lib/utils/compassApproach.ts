export type CompassApproachBand = 'far' | '100' | '50' | '20' | 'arrive';

export const COMPASS_APPROACH_HYSTERESIS_M = 8;
export const COMPASS_ARRIVE_BASE_M = 12;

const BAND_RANK: Record<CompassApproachBand, number> = {
	far: 0,
	'100': 1,
	'50': 2,
	'20': 3,
	arrive: 4
};

export function compassArriveRadiusM(accuracyM: number | null): number {
	const accuracy =
		accuracyM !== null && Number.isFinite(accuracyM) ? Math.max(0, accuracyM) : 0;
	return Math.max(COMPASS_ARRIVE_BASE_M, accuracy);
}

export function compassApproachBand(
	distanceM: number | null,
	accuracyM: number | null
): CompassApproachBand {
	if (distanceM === null || !Number.isFinite(distanceM)) {
		return 'far';
	}
	if (distanceM <= compassArriveRadiusM(accuracyM)) {
		return 'arrive';
	}
	if (distanceM <= 20) {
		return '20';
	}
	if (distanceM <= 50) {
		return '50';
	}
	if (distanceM <= 100) {
		return '100';
	}
	return 'far';
}

function enterMaxM(band: CompassApproachBand, accuracyM: number | null): number {
	switch (band) {
		case 'arrive':
			return compassArriveRadiusM(accuracyM);
		case '20':
			return 20;
		case '50':
			return 50;
		case '100':
			return 100;
		case 'far':
			return Number.POSITIVE_INFINITY;
	}
}

/**
 * Stay in the previous band when GPS wobble would otherwise step outward,
 * until distance exceeds that band's enter max + hysteresis.
 */
export function resolveCompassApproachBand(
	distanceM: number | null,
	accuracyM: number | null,
	previous: CompassApproachBand
): CompassApproachBand {
	const raw = compassApproachBand(distanceM, accuracyM);
	if (BAND_RANK[raw] >= BAND_RANK[previous]) {
		return raw;
	}
	if (distanceM === null || !Number.isFinite(distanceM)) {
		return 'far';
	}
	if (distanceM > enterMaxM(previous, accuracyM) + COMPASS_APPROACH_HYSTERESIS_M) {
		return raw;
	}
	return previous;
}

export function compassApproachHaptic(
	previous: CompassApproachBand,
	next: CompassApproachBand
): 'selection' | 'success' | null {
	if (BAND_RANK[next] <= BAND_RANK[previous]) {
		return null;
	}
	return next === 'arrive' ? 'success' : 'selection';
}
