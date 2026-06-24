import * as m from '$lib/paraglide/messages.js';

export interface AgriMetricHelp {
	title: string;
	helpText: string;
}

export function getAgriMetricHelp() {
	return {
		wind: {
			title: m.agri_wind_title(),
			helpText: m.agri_wind_help()
		},
		air: {
			title: m.agri_air_title(),
			helpText: m.agri_air_help()
		},
		soil: {
			title: m.agri_soil_title(),
			helpText: m.agri_soil_help()
		},
		rain: {
			title: m.agri_rain_title(),
			helpText: m.agri_rain_help()
		},
		frost: {
			title: m.agri_frost_title(),
			helpText: m.agri_frost_help()
		},
		et0: {
			title: m.agri_et0_title(),
			helpText: m.agri_et0_help()
		},
		radiation: {
			title: m.agri_radiation_title(),
			helpText: m.agri_radiation_help()
		},
		hydricBalance: {
			title: m.agri_hydric_balance_title(),
			helpText: m.agri_hydric_balance_help()
		},
		wsi: {
			title: m.agri_wsi_title(),
			helpText: m.agri_wsi_help()
		},
		et0Cumul: {
			title: m.agri_et0_cumul_title(),
			helpText: m.agri_et0_cumul_help()
		},
		windStress: {
			title: m.agri_wind_stress_title(),
			helpText: m.agri_wind_stress_help()
		},
		radiationStress: {
			title: m.agri_radiation_stress_title(),
			helpText: m.agri_radiation_stress_help()
		},
		heatStress: {
			title: m.agri_heat_stress_title(),
			helpText: m.agri_heat_stress_help()
		},
		frostPast: {
			title: m.agri_frost_past_title(),
			helpText: m.agri_frost_past_help()
		},
		gddSeason: {
			title: m.agri_gdd_season_title(),
			helpText: m.agri_gdd_season_help()
		},
		soilNightDrop: {
			title: m.agri_soil_night_drop_title(),
			helpText: m.agri_soil_night_drop_help()
		},
		soilHistory: {
			title: m.agri_soil_history_title(),
			helpText: m.agri_soil_history_help()
		},
		soilMoisture: {
			title: m.agri_soil_moisture_title(),
			helpText: m.agri_soil_moisture_help()
		},
		yrs: {
			title: m.agri_yrs_title(),
			helpText: m.agri_yrs_help()
		},
		waterHydric: {
			title: m.agri_water_hydric_title(),
			helpText: m.agri_water_hydric_help()
		},
		climateInstant: {
			title: m.agri_climate_instant_title(),
			helpText: m.agri_climate_instant_help()
		},
		frostCombined: {
			title: m.agri_frost_combined_title(),
			helpText: m.agri_frost_combined_help()
		},
		climateStress: {
			title: m.agri_climate_stress_title(),
			helpText: m.agri_climate_stress_help()
		}
	} as const satisfies Record<string, AgriMetricHelp>;
}
