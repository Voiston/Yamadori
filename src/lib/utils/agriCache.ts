import type { AgriData } from '$lib/types/agri';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import type { YrsPlantInputs } from '$lib/types/yrs';
import { applyEnvironmentExposure } from '$lib/utils/adjustedClimate';
import {
	computeEffectiveSoilStabilityScore,
	computeWeeklyViability,
	type OpenMeteoForecastResponse
} from '$lib/utils/agri';
import { computeYamadoriReadinessScore } from '$lib/utils/yrs';

export function enrichAgriData(
	data: AgriData,
	plantInputs: YrsPlantInputs,
	forecastBody?: OpenMeteoForecastResponse
): AgriData {
	const exposure = plantInputs.environmentExposure ?? DEFAULT_ENVIRONMENT_EXPOSURE;
	const { data: adjustedData, gdd } = applyEnvironmentExposure(data, data.gdd, exposure);

	let enriched: AgriData = {
		...adjustedData,
		gdd,
		soilStabilityScore: computeEffectiveSoilStabilityScore(adjustedData, plantInputs)
	};

	if (forecastBody) {
		enriched = {
			...enriched,
			weeklyViability: computeWeeklyViability(
				forecastBody,
				enriched.latitude,
				enriched.longitude,
				new Date(enriched.fetchedAt),
				plantInputs,
				gdd
			)
		};
	} else if (exposure !== DEFAULT_ENVIRONMENT_EXPOSURE) {
		enriched = {
			...enriched,
			weeklyViability: null
		};
	}

	return {
		...enriched,
		yrs: computeYamadoriReadinessScore(enriched, plantInputs)
	};
}

/** @deprecated Use enrichAgriData */
export function enrichCachedAgriData(data: AgriData, plantInputs: YrsPlantInputs): AgriData {
	return enrichAgriData(data, plantInputs);
}
