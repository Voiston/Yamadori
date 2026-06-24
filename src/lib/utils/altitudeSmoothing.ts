export type AltitudeSample = { value: number; timestamp: number };

export type AltitudeSmootherState = {
	samples: AltitudeSample[];
};

const WINDOW_MS = 5_000;
const MAX_SAMPLES = 5;

export function createAltitudeSmootherState(): AltitudeSmootherState {
	return { samples: [] };
}

export function resetAltitudeSmootherState(state: AltitudeSmootherState): void {
	state.samples = [];
}

function isValidAltitude(value: number | null): value is number {
	return value !== null && Number.isFinite(value);
}

export function pushAltitudeSample(
	state: AltitudeSmootherState,
	value: number | null,
	timestamp: number
): void {
	if (!isValidAltitude(value)) {
		return;
	}

	const cutoff = timestamp - WINDOW_MS;
	state.samples = state.samples.filter((sample) => sample.timestamp >= cutoff);
	state.samples.push({ value, timestamp });

	if (state.samples.length > MAX_SAMPLES) {
		state.samples = state.samples.slice(-MAX_SAMPLES);
	}
}

export function getTrimmedMeanAltitude(state: AltitudeSmootherState): number | null {
	const values = state.samples.map((sample) => sample.value);
	if (values.length === 0) {
		return null;
	}
	if (values.length === 1) {
		return values[0];
	}
	if (values.length === 2) {
		return (values[0] + values[1]) / 2;
	}

	const min = Math.min(...values);
	const max = Math.max(...values);
	let removedMin = false;
	let removedMax = false;
	const trimmed: number[] = [];

	for (const value of values) {
		if (!removedMin && value === min) {
			removedMin = true;
			continue;
		}
		if (!removedMax && value === max) {
			removedMax = true;
			continue;
		}
		trimmed.push(value);
	}

	if (trimmed.length === 0) {
		return values[0];
	}

	return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
}
