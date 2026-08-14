import { describe, expect, it } from 'vitest';
import {
	resolveClimateProfile,
	resolveYamadoriRiskThresholds
} from '$lib/constants/climate-profiles';
import { YAMADORI_RISK_THRESHOLDS } from '$lib/constants/agri-thresholds';
import { getSpeciesGddCategory, isEvergreenSpecies } from '$lib/constants/gdd-config';
import { findEuHarvestWindows, resolveEuHarvestZone } from '$lib/geo/euHarvestCalendar';
import { resolveHarvestCalendarPrior } from '$lib/geo/harvestWindowPrior';

describe('resolveClimateProfile', () => {
	it('maps known biotopes to climate profiles', () => {
		expect(resolveClimateProfile(39.5, -106.0)).toBe('continental'); // Rockies
		expect(resolveClimateProfile(35.0, -111.0)).toBe('arid'); // SW deserts
		expect(resolveClimateProfile(-27.5, 153.0)).toBe('subtropical'); // QLD
		expect(resolveClimateProfile(47.3, -1.5)).toBe('temperate_oceanic'); // PdL
	});
});

describe('resolveYamadoriRiskThresholds', () => {
	it('keeps temperate oceanic as the base', () => {
		const thresholds = resolveYamadoriRiskThresholds(47.3, -1.5);
		expect(thresholds.soil18cmTempC.excellentMin).toBe(
			YAMADORI_RISK_THRESHOLDS.soil18cmTempC.excellentMin
		);
		expect(thresholds.heatMaxC).toBe(30);
	});

	it('raises soil and heat bands for arid profiles', () => {
		const thresholds = resolveYamadoriRiskThresholds(35.0, -111.0);
		expect(thresholds.heatMaxC).toBeGreaterThan(YAMADORI_RISK_THRESHOLDS.heatMaxC);
		expect(thresholds.soil18cmTempC.excellentMax).toBeGreaterThan(
			YAMADORI_RISK_THRESHOLDS.soil18cmTempC.excellentMax
		);
	});
});

describe('international GDD species sets', () => {
	it('classifies key AU/US/NZ species', () => {
		expect(getSpeciesGddCategory('Douglas fir')).toBe('foret');
		expect(getSpeciesGddCategory('Ponderosa pine')).toBe('montagnarde');
		expect(getSpeciesGddCategory('Southern beech')).toBe('montagnarde');
		expect(isEvergreenSpecies('Banksia')).toBe(true);
		expect(isEvergreenSpecies('Douglas fir')).toBe(true);
	});

	it('resolves Latin and local aliases to GDD categories', () => {
		expect(getSpeciesGddCategory('Fagus sylvatica')).toBe('foret');
		expect(getSpeciesGddCategory('Pinus thunbergii')).toBe('montagnarde');
		expect(getSpeciesGddCategory('Pseudotsuga menziesii')).toBe('foret');
		expect(isEvergreenSpecies('Pinus ponderosa')).toBe(true);
	});
});

describe('EU harvest calendar', () => {
	it('resolves Atlantic zone in Pays de la Loire', () => {
		expect(resolveEuHarvestZone(47.3, -1.5)).toBe('eu_atlantic');
		const windows = findEuHarvestWindows('Charme commun', 'eu_atlantic');
		expect(windows.length).toBeGreaterThan(0);
	});

	it('resolves zones for Berlin, Rome, Dublin, Stockholm', () => {
		expect(resolveEuHarvestZone(52.52, 13.405)).toBe('eu_continental'); // Berlin
		expect(resolveEuHarvestZone(41.9, 12.5)).toBe('eu_mediterranean'); // Rome
		expect(resolveEuHarvestZone(53.35, -6.26)).toBe('eu_atlantic'); // Dublin
		expect(resolveEuHarvestZone(59.33, 18.07)).toBe('eu_continental'); // Stockholm
	});

	it('matches German alias for Hornbeam in Berlin', () => {
		const winter = resolveHarvestCalendarPrior(
			'Hainbuche',
			52.52,
			13.405,
			new Date('2026-01-15T12:00:00')
		);
		const summer = resolveHarvestCalendarPrior(
			'Hainbuche',
			52.52,
			13.405,
			new Date('2026-07-15T12:00:00')
		);
		expect(winter).toEqual({ applicable: true, inWindow: true, monthsFromWindow: 0 });
		expect(summer.applicable).toBe(true);
		expect(summer.inWindow).toBe(false);
		expect(summer.monthsFromWindow).toBeGreaterThan(0);
	});

	it('applies YRS prior for Charme commun in Nantes', () => {
		const winter = resolveHarvestCalendarPrior(
			'Charme commun',
			47.3,
			-1.5,
			new Date('2026-01-15T12:00:00')
		);
		const summer = resolveHarvestCalendarPrior(
			'Charme commun',
			47.3,
			-1.5,
			new Date('2026-07-15T12:00:00')
		);
		expect(winter).toEqual({ applicable: true, inWindow: true, monthsFromWindow: 0 });
		expect(summer.applicable).toBe(true);
		expect(summer.inWindow).toBe(false);
		expect(summer.monthsFromWindow).toBeGreaterThan(0);
	});
});
