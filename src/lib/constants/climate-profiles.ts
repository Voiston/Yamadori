/**
 * Climate profiles for location-aware Yamadori risk thresholds.
 * Base = temperate oceanic (Western Europe); profiles supply partial overrides.
 *
 * Geography uses biotope bboxes + country heuristics (editorial), not Köppen grids.
 * Threshold deltas are directional regional adjustments — see THRESHOLD_SOURCES.
 */

import { YAMADORI_RISK_THRESHOLDS } from '$lib/constants/agri-thresholds';
import { BIOTOPE_REGIONS } from '$lib/constants/regions';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { isInBoundingBox } from '$lib/utils/species-suggestions';

export type ClimateProfileId =
	| 'temperate_oceanic'
	| 'mediterranean'
	| 'continental'
	| 'arid'
	| 'boreal'
	| 'subtropical';

export type YamadoriRiskThresholds = typeof YAMADORI_RISK_THRESHOLDS;

/** Widen `as const` literal numbers so profile overrides can use different values. */
type NumberFields<T> = {
	[K in keyof T]: T[K] extends number ? number : T[K] extends object ? NumberFields<T[K]> : T[K];
};

type ThresholdOverrides = {
	[K in keyof YamadoriRiskThresholds]?: YamadoriRiskThresholds[K] extends number
		? number
		: Partial<NumberFields<YamadoriRiskThresholds[K]>>;
};

const BIOTOPE_CLIMATE_PROFILE: Record<string, ClimateProfileId> = {
	'pyr-littoral-mediterraneen': 'mediterranean',
	'pyr-avant-monts': 'mediterranean',
	'us-southwest-deserts': 'arid',
	'us-california': 'mediterranean',
	'us-rockies': 'continental',
	'us-pacific-northwest': 'temperate_oceanic',
	'us-appalachians': 'continental',
	'ca-bc-coast': 'temperate_oceanic',
	'ca-bc-interior': 'continental',
	'ca-rockies': 'continental',
	'ca-prairies': 'continental',
	'ca-boreal': 'boreal',
	'ca-quebec': 'continental',
	'ca-maritimes': 'temperate_oceanic',
	'nz-northland': 'subtropical',
	'nz-central-ni': 'temperate_oceanic',
	'nz-wellington': 'temperate_oceanic',
	'nz-nelson': 'temperate_oceanic',
	'nz-west-coast': 'temperate_oceanic',
	'nz-canterbury': 'continental',
	'nz-otago': 'continental',
	'pt-algarve': 'mediterranean',
	'pt-alentejo': 'mediterranean',
	'pt-lisboa': 'mediterranean',
	'pt-madeira': 'subtropical',
	'pt-azores': 'temperate_oceanic',
	'pt-norte': 'temperate_oceanic',
	'pt-centro': 'mediterranean',
	'au-nsw': 'subtropical',
	'au-vic': 'temperate_oceanic',
	'au-qld': 'subtropical',
	'au-sa': 'arid',
	'au-wa': 'mediterranean',
	'au-tas': 'temperate_oceanic',
	'au-nt': 'subtropical',
	'pyr-haute-montagne': 'continental',
	'pyr-vallees-centrales': 'continental',
	'pyr-piemont-oriental': 'mediterranean',
	'pdl-frange-forez': 'continental'
};

const PROFILE_OVERRIDES: Record<ClimateProfileId, ThresholdOverrides> = {
	temperate_oceanic: {},
	mediterranean: {
		soil18cmTempC: { excellentMin: 10, excellentMax: 16, passableMax: 20, stressMin: 22 },
		soilStableTempC: { min: 9, max: 18 },
		airTempC: { dangerousLow: 5, dangerousHigh: 36, passableLow: 8, passableHigh: 32 },
		frostDangerousC: -2,
		heatMaxC: 34,
		et0TodayMm: { excellentMax: 1.5, passableMax: 6.5 },
		et0Trend7dMeanMm: { excellentMax: 1.5, passableMax: 6.5 }
	},
	continental: {
		soil18cmTempC: { excellentMin: 7, excellentMax: 12, passableMax: 16, stressMin: 18 },
		soilStableTempC: { min: 6, max: 14 },
		airTempC: { dangerousLow: 2, dangerousHigh: 33, passableLow: 5, passableHigh: 28 },
		frostDangerousC: -5,
		heatMaxC: 32
	},
	arid: {
		soil18cmTempC: { excellentMin: 10, excellentMax: 18, passableMax: 22, stressMin: 24 },
		soilStableTempC: { min: 9, max: 20 },
		airTempC: { dangerousLow: 5, dangerousHigh: 40, passableLow: 8, passableHigh: 34 },
		frostDangerousC: -1,
		heatMaxC: 36,
		et0TodayMm: { excellentMax: 2.0, passableMax: 8.0 },
		et0Trend7dMeanMm: { excellentMax: 2.0, passableMax: 8.0 },
		rainPast3dMm: { excellentMin: 3, excellentMax: 35, dangerousMin: 50 }
	},
	boreal: {
		soil18cmTempC: { excellentMin: 5, excellentMax: 11, passableMax: 14, stressMin: 16 },
		soilStableTempC: { min: 4, max: 12 },
		airTempC: { dangerousLow: -2, dangerousHigh: 30, passableLow: 2, passableHigh: 24 },
		frostDangerousC: -6,
		heatMaxC: 28
	},
	subtropical: {
		soil18cmTempC: { excellentMin: 12, excellentMax: 18, passableMax: 22, stressMin: 24 },
		soilStableTempC: { min: 11, max: 20 },
		airTempC: { dangerousLow: 8, dangerousHigh: 36, passableLow: 12, passableHigh: 32 },
		frostDangerousC: 0,
		heatMaxC: 35,
		et0TodayMm: { excellentMax: 1.8, passableMax: 7.0 },
		et0Trend7dMeanMm: { excellentMax: 1.8, passableMax: 7.0 }
	}
};

function mergeThresholds(
	base: YamadoriRiskThresholds,
	overrides: ThresholdOverrides
): YamadoriRiskThresholds {
	const result = { ...base } as YamadoriRiskThresholds;
	for (const key of Object.keys(overrides) as (keyof YamadoriRiskThresholds)[]) {
		const override = overrides[key];
		if (override === undefined) continue;
		const current = base[key];
		if (typeof current === 'number') {
			(result as Record<string, unknown>)[key] = override;
		} else {
			(result as Record<string, unknown>)[key] = { ...current, ...(override as object) };
		}
	}
	return result;
}

function profileFromBiotope(latitude: number, longitude: number): ClimateProfileId | null {
	const regions = BIOTOPE_REGIONS.filter((region) =>
		isInBoundingBox(latitude, longitude, region.bbox)
	);
	for (const region of regions) {
		const profile = BIOTOPE_CLIMATE_PROFILE[region.id];
		if (profile) return profile;
	}
	return null;
}

function profileFromCountryHeuristics(
	latitude: number,
	longitude: number
): ClimateProfileId {
	const country = resolveCountry(latitude, longitude);
	/** Allow editorial codes not yet in CountryCode (GR, PL, CZ). */
	const code = country as string | null;

	if (latitude < -23.5 && latitude > -35) return 'subtropical';
	if (latitude < -35 && latitude > -45) return 'temperate_oceanic';
	if (latitude < -45) return 'continental';

	if (code === 'AU' || code === 'NZ') {
		if (latitude > -26) return 'subtropical';
		if (latitude < -42) return 'temperate_oceanic';
		return 'mediterranean';
	}

	if (code === 'US' || code === 'CA') {
		if (latitude >= 55) return 'boreal';
		if (latitude >= 48 && longitude < -90) return 'boreal';
		if (longitude < -114 && latitude < 40) return 'arid';
		if (longitude < -118 && latitude < 42) return 'mediterranean';
		if (latitude >= 45) return 'continental';
		return 'temperate_oceanic';
	}

	if (code === 'ES' || code === 'PT' || code === 'IT' || code === 'GR') {
		if (latitude < 42) return 'mediterranean';
	}

	if (code === 'NO' || code === 'SE' || code === 'FI') {
		if (latitude >= 60) return 'boreal';
		return 'continental';
	}

	if (code === 'DE' || code === 'PL' || code === 'CZ' || code === 'AT' || code === 'CH') {
		return 'continental';
	}

	if (code === 'JP') {
		if (latitude >= 43) return 'boreal';
		if (latitude >= 41.3) return 'continental';
		if (latitude < 31) return 'subtropical';
		if (latitude < 34) return 'subtropical';
		// Tokyo / central Honshu — humid temperate, not Western-Europe default by accident
		if (latitude >= 36) return 'continental';
		return 'temperate_oceanic';
	}

	return 'temperate_oceanic';
}

/** Resolve climate profile for a GPS point (biotope first, then country heuristics). */
export function resolveClimateProfile(latitude: number, longitude: number): ClimateProfileId {
	return profileFromBiotope(latitude, longitude) ?? profileFromCountryHeuristics(latitude, longitude);
}

/** Location-aware Yamadori thresholds (merged profile overrides on temperate oceanic base). */
export function resolveYamadoriRiskThresholds(
	latitude: number,
	longitude: number
): YamadoriRiskThresholds {
	const profile = resolveClimateProfile(latitude, longitude);
	return mergeThresholds(YAMADORI_RISK_THRESHOLDS, PROFILE_OVERRIDES[profile]);
}

export function getClimateProfileLabels(): Record<ClimateProfileId, string> {
	return {
		temperate_oceanic: 'temperate_oceanic',
		mediterranean: 'mediterranean',
		continental: 'continental',
		arid: 'arid',
		boreal: 'boreal',
		subtropical: 'subtropical'
	};
}
