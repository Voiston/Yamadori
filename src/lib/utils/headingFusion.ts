import { blendHeadingsCircular, normalizeHeading360 } from '$lib/utils/haversine';

/** Poids de la nouvelle mesure capteur (0 = figé, 1 = brut). */
export const HEADING_LOW_PASS_ALPHA = 0.15;

/** Seuil bascule GPS : 1,5 m/s ≈ 5,4 km/h */
export const GPS_DOMINANT_SPEED_MPS = 1.5;

/** Lissage lors du retour capteur ↔ GPS */
export const SOURCE_TRANSITION_ALPHA = 0.2;

export type HeadingSource = 'sensor' | 'gps';

export type HeadingFusionState = {
	smoothedSensor: number | null;
	displayed: number | null;
	activeSource: HeadingSource;
};

export type HeadingFusionInput = {
	sensorHeading: number | null;
	gpsHeading: number | null;
	speedMps: number | null;
};

export function createHeadingFusionState(): HeadingFusionState {
	return {
		smoothedSensor: null,
		displayed: null,
		activeSource: 'sensor'
	};
}

export function lowPassHeadingCircular(
	previous: number | null,
	raw: number,
	alpha: number
): number {
	if (previous === null) {
		return normalizeHeading360(raw);
	}
	return blendHeadingsCircular(previous, raw, alpha);
}

export function isGpsDominant(speedMps: number | null): boolean {
	return speedMps !== null && speedMps >= GPS_DOMINANT_SPEED_MPS;
}

function resolveTargetHeading(
	smoothedSensor: number | null,
	gpsHeading: number | null,
	speedMps: number | null
): { target: number | null; source: HeadingSource } {
	if (isGpsDominant(speedMps) && gpsHeading !== null) {
		return { target: normalizeHeading360(gpsHeading), source: 'gps' };
	}
	if (smoothedSensor !== null) {
		return { target: smoothedSensor, source: 'sensor' };
	}
	if (gpsHeading !== null) {
		return { target: normalizeHeading360(gpsHeading), source: 'gps' };
	}
	return { target: null, source: 'sensor' };
}

/**
 * Fusionne le capteur (FOP / boussole) et le cap GPS avec filtre passe-bas
 * et bascule nette au-dessus de GPS_DOMINANT_SPEED_MPS.
 */
export function processHeadingFusion(
	state: HeadingFusionState,
	input: HeadingFusionInput
): number | null {
	const { sensorHeading, gpsHeading, speedMps } = input;

	if (sensorHeading !== null) {
		state.smoothedSensor = lowPassHeadingCircular(
			state.smoothedSensor,
			sensorHeading,
			HEADING_LOW_PASS_ALPHA
		);
	}

	const { target, source } = resolveTargetHeading(
		state.smoothedSensor,
		gpsHeading,
		speedMps
	);

	if (target === null) {
		return state.displayed;
	}

	state.activeSource = source;

	if (state.displayed === null) {
		state.displayed = target;
		return state.displayed;
	}

	state.displayed = blendHeadingsCircular(
		state.displayed,
		target,
		SOURCE_TRANSITION_ALPHA
	);
	return state.displayed;
}

export function resetHeadingFusionState(state: HeadingFusionState): void {
	state.smoothedSensor = null;
	state.displayed = null;
	state.activeSource = 'sensor';
}
