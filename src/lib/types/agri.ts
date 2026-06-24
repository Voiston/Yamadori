import type { GddSnapshot } from '$lib/types/gdd';
import type { YrsDecision, YrsSnapshot } from '$lib/types/yrs';

export type AgriRiskLevel = 'Excellent' | 'Passable' | 'Dangereux';

/** Moyenne journalière du sol sur un jour passé. */
export interface SoilDailySample {
	date: string;
	mean6cmC: number | null;
	mean18cmC: number | null;
}

export interface AgriData {
	fetchedAt: string;
	latitude: number;
	longitude: number;
	/** Oneshot — température air à l'heure courante (°C). */
	airTemperatureC: number;
	/** Oneshot — humidité relative instantanée (%). */
	relativeHumidityPct: number;
	/** Oneshot — vitesse du vent instantanée (km/h). */
	windSpeedKmh: number;
	/** Oneshot — ET₀ prévu pour aujourd'hui (mm/j). */
	et0TodayMm: number;
	/** Oneshot — rayonnement solaire instantané (W/m²). */
	shortwaveRadiationCurrentWm2: number;
	/** Oneshot — pic de rayonnement solaire prévu aujourd'hui (W/m²). */
	shortwaveRadiationMaxTodayWm2: number;
	/** Tendance — cumul pluie passée sur 3 jours avant aujourd'hui (mm). */
	rainPast3dMm: number;
	/** Tendance — cumul pluie passée sur 5 jours avant aujourd'hui (mm). */
	rainPast5dMm: number;
	/** Tendance — cumul pluie passée sur 7 jours avant aujourd'hui (mm). */
	rainPast7dMm: number;
	/** Instantané — température du sol à 6 cm (°C). */
	soilTemperature6cmC: number;
	/** Instantané — température du sol à 18 cm (°C). */
	soilTemperature18cmC: number;
	/** Tendance — jours consécutifs récents avec sol ~6 cm entre 8 et 15 °C. */
	soilConsecutiveStableDays: number;
	/** Tendance — moyenne sol 6 cm sur les 5 derniers jours complets (°C). */
	soilMean5dC: number | null;
	/** Tendance — moyenne sol 6 cm sur les 7 derniers jours complets (°C). */
	soilMean6cm7dC: number | null;
	/** Tendance — moyenne sol 18 cm sur les 7 derniers jours complets (°C). */
	soilMean18cm7dC: number | null;
	/** Tendance — moyennes journalières sol sur les 7 derniers jours complets. */
	soilDailyHistory7d: SoilDailySample[];
	/** Tendance — chute nocturne brutale détectée sur la fenêtre récente. */
	soilBrutalNightDrop: boolean;
	/** Tendance — moyenne glissante 7 jours en hausse à 18 cm (tendance favorable). */
	soilTrend7dRising: boolean;
	/** Écart thermique 6 cm − 18 cm (amortisseur racinaire, °C). */
	soilHeatBufferC: number;
	/** Score de stabilité du sol 0–100 (jours stables, absence de chute, tendance). */
	soilStabilityScore: number;
	/** Humidité du sol 0–7 cm (%, Open-Meteo) — null si indisponible. */
	soilMoisture7cmPct: number | null;
	/** Tendance — gel sévère (≤ -3 °C) prévu dans les 7 prochains jours. */
	frostRiskNext7d: boolean;
	/** Tendance — température minimale la plus basse prévue sur 7 jours (°C). */
	frostMinNext7dC: number | null;
	/** Tendance — ET₀ moyen sur les 7 derniers jours complets avant aujourd'hui (mm/j). */
	et0Past7dMeanMm: number | null;
	/** Tendance — ET₀ moyen sur les 7 prochains jours (mm/j). */
	et0Trend7dMeanMm: number | null;
	/** Tendance — cumul ET₀ sur les 7 derniers jours complets (mm). */
	et0Past7dSumMm: number | null;
	/** Tendance — cumul ET₀ sur les 7 prochains jours (mm). */
	et0Forecast7dSumMm: number | null;
	/** Bilan hydrique 7 j : pluie passée − ET₀ passée (mm). */
	waterBalance7dMm: number | null;
	/** Indice de stress vent × sécheresse air (0–100). */
	windStressIndex: number;
	/** Indice de stress rayonnement × ET₀ (0–100). */
	radiationStressIndex: number;
	/** Nombre de jours passés avec Tmax > 30 °C (7 j). */
	heatStressDaysPast7d: number;
	/** Nombre de jours prévus avec Tmax > 30 °C (7 j). */
	heatStressDaysForecast7d: number;
	/** Nombre de nuits de gel passées Tmin < 0 °C (7 j). */
	frostEventsPast7d: number;
	/** Score tampon hydrique du sol 0–100. */
	soilBufferScore: number;
	/** Water Stress Index : bilan hydrique + tampon sol (mm équivalent). */
	wsi: number | null;
	/** Risque hydrique futur : cumul ET₀ prévu sur 7 j (mm). */
	futureStressRiskMm: number | null;
	/** Score de viabilité Go/No-Go sur les 7 prochains jours. */
	weeklyViability: WeeklyViability | null;
	/** Yamadori Readiness Score synthétique 0–100. */
	yrs: YrsSnapshot | null;
	/** Cumul de degrés-jours (GDD) depuis le 1er janvier et estimation phénologique. */
	gdd: GddSnapshot | null;
}

export type ViabilityGoNoGo = 'Go' | 'Go prudent' | 'No-Go';

export interface ViabilityDay {
	date: string;
	/** Score YRS 0–100 pour ce jour. */
	score: number;
	yrsDecision: YrsDecision;
	deltaFromToday: number;
	reason: string | null;
}

export interface WeeklyViability {
	days: ViabilityDay[];
	todayScore: number;
	bestDayDate: string;
	bestDayScore: number;
}

export interface YamadoriRiskAssessment {
	level: AgriRiskLevel;
	/** Motif principal du niveau de risque (ex. gel prévu). */
	reason: string | null;
}

/** Niveau de risque par carte affichée dans le panneau agro-météo. */
export interface AgriMetricRisks {
	air: AgriRiskLevel;
	wind: AgriRiskLevel;
	soil: AgriRiskLevel;
	rain: AgriRiskLevel;
	frost: AgriRiskLevel;
	et0: AgriRiskLevel;
	radiation: AgriRiskLevel;
}

/** Niveau de risque par indicateur détaillé YRS. */
export interface YrsDetailMetricRisks {
	gddSeason: AgriRiskLevel;
	et0Mean: AgriRiskLevel;
	air: AgriRiskLevel;
	soil: AgriRiskLevel;
	hydricBalance: AgriRiskLevel;
	wsi: AgriRiskLevel;
	et0Cumul: AgriRiskLevel;
	windStress: AgriRiskLevel;
	radiationStress: AgriRiskLevel;
	heatStress: AgriRiskLevel;
	frostPast: AgriRiskLevel;
	frostForecast: AgriRiskLevel;
	soilNightDrop: AgriRiskLevel;
}
