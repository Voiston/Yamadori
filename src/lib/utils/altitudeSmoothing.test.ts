import { describe, expect, it } from 'vitest';
import {
	createAltitudeSmootherState,
	getTrimmedMeanAltitude,
	pushAltitudeSample,
	resetAltitudeSmootherState
} from '$lib/utils/altitudeSmoothing';

describe('altitudeSmoothing', () => {
	it('returns null when there are no samples', () => {
		const state = createAltitudeSmootherState();
		expect(getTrimmedMeanAltitude(state)).toBeNull();
	});

	it('returns the single sample when only one is available', () => {
		const state = createAltitudeSmootherState();
		pushAltitudeSample(state, 1_200, 1_000);
		expect(getTrimmedMeanAltitude(state)).toBe(1_200);
	});

	it('averages two samples without trimming', () => {
		const state = createAltitudeSmootherState();
		pushAltitudeSample(state, 1_200, 1_000);
		pushAltitudeSample(state, 1_220, 1_500);
		expect(getTrimmedMeanAltitude(state)).toBe(1_210);
	});

	it('removes one min and one max then averages the remaining three', () => {
		const state = createAltitudeSmootherState();
		pushAltitudeSample(state, 1_100, 1_000);
		pushAltitudeSample(state, 1_150, 1_100);
		pushAltitudeSample(state, 1_200, 1_200);
		pushAltitudeSample(state, 1_250, 1_300);
		pushAltitudeSample(state, 1_300, 1_400);

		expect(getTrimmedMeanAltitude(state)).toBe(1_200);
	});

	it('rejects a +50 m outlier in a five-sample window', () => {
		const state = createAltitudeSmootherState();
		pushAltitudeSample(state, 1_000, 1_000);
		pushAltitudeSample(state, 1_002, 1_100);
		pushAltitudeSample(state, 1_050, 1_200);
		pushAltitudeSample(state, 1_001, 1_300);
		pushAltitudeSample(state, 1_003, 1_400);

		expect(getTrimmedMeanAltitude(state)).toBeCloseTo(1_002, 5);
	});

	it('drops samples older than five seconds', () => {
		const state = createAltitudeSmootherState();
		pushAltitudeSample(state, 900, 1_000);
		pushAltitudeSample(state, 1_000, 6_500);
		pushAltitudeSample(state, 1_010, 7_000);

		expect(getTrimmedMeanAltitude(state)).toBe(1_005);
	});

	it('keeps at most five recent samples', () => {
		const state = createAltitudeSmootherState();
		for (let index = 0; index < 7; index += 1) {
			pushAltitudeSample(state, 1_000 + index, 1_000 + index * 100);
		}

		expect(state.samples).toHaveLength(5);
		expect(state.samples.map((sample) => sample.value)).toEqual([1_002, 1_003, 1_004, 1_005, 1_006]);
	});

	it('ignores invalid altitude values', () => {
		const state = createAltitudeSmootherState();
		pushAltitudeSample(state, null, 1_000);
		pushAltitudeSample(state, Number.NaN, 1_100);
		pushAltitudeSample(state, Number.POSITIVE_INFINITY, 1_200);
		pushAltitudeSample(state, 1_180, 1_300);

		expect(state.samples).toHaveLength(1);
		expect(getTrimmedMeanAltitude(state)).toBe(1_180);
	});

	it('clears state on reset', () => {
		const state = createAltitudeSmootherState();
		pushAltitudeSample(state, 1_200, 1_000);
		resetAltitudeSmootherState(state);
		expect(getTrimmedMeanAltitude(state)).toBeNull();
	});
});
