import * as m from '$lib/paraglide/messages.js';
import type { EnvironmentExposure } from '$lib/types/environment';

export interface EnvironmentExposureCoefficients {
	et0: number;
	wind: number;
	radiation: number;
	/** Amortissement de l'écart sol ↔ air (1 = brut API, <1 = microclimat tamponné). */
	soil: number;
	gdd: number;
	microclimateFactor: number;
}

export const ENVIRONMENT_EXPOSURE_COEFFICIENTS: Record<
	EnvironmentExposure,
	EnvironmentExposureCoefficients
> = {
	OPEN: { et0: 1.0, wind: 1.0, radiation: 1.0, soil: 1.0, gdd: 1.0, microclimateFactor: 1.0 },
	EDGE: { et0: 0.7, wind: 0.5, radiation: 0.7, soil: 0.8, gdd: 0.85, microclimateFactor: 1.1 },
	FOREST_DENSE: {
		et0: 0.4,
		wind: 0.1,
		radiation: 0.3,
		soil: 0.65,
		gdd: 0.7,
		microclimateFactor: 1.2
	}
};

export function getEnvironmentExposureOptions(): {
	value: EnvironmentExposure;
	label: string;
	shortLabel: string;
	icon: string;
}[] {
	return [
		{ value: 'OPEN', label: m.exposure_open(), shortLabel: m.exposure_short_open(), icon: '🌞' },
		{ value: 'EDGE', label: m.exposure_edge(), shortLabel: m.exposure_short_edge(), icon: '🌲' },
		{
			value: 'FOREST_DENSE',
			label: m.exposure_forest_dense(),
			shortLabel: m.exposure_short_forest(),
			icon: '🌳'
		}
	];
}

export function getEnvironmentExposureHints(): Record<EnvironmentExposure, string> {
	return {
		OPEN: m.exposure_hint_open(),
		EDGE: m.exposure_hint_edge(),
		FOREST_DENSE: m.exposure_hint_forest()
	};
}

export function exposureLabel(value: EnvironmentExposure): string {
	return getEnvironmentExposureOptions().find((o) => o.value === value)?.label ?? value;
}

export function exposureHint(value: EnvironmentExposure): string {
	return getEnvironmentExposureHints()[value];
}

export function exposureShortLabel(value: EnvironmentExposure): string {
	return getEnvironmentExposureOptions().find((o) => o.value === value)?.shortLabel ?? value;
}

export function getMicroclimateFactor(exposure: EnvironmentExposure): number {
	return ENVIRONMENT_EXPOSURE_COEFFICIENTS[exposure].microclimateFactor;
}
