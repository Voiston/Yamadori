export interface YearlyClimateStats {
	year: number;
	precipitationMm: number;
	frostDays: number;
}

export interface ClimateHistory {
	fetchedAt: string;
	startDate: string;
	endDate: string;
	latitude: number;
	longitude: number;
	absoluteMinTempC: number;
	yearlyStats: YearlyClimateStats[];
	avgAnnualPrecipitationMm: number;
	avgFrostDaysPerYear: number;
}
