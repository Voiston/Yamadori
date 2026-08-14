import { describe, expect, it } from 'vitest';
import {
	getOpenCantonCadastre,
	getOpenCantonProtected,
	OPEN_CANTON_CADASTRE,
	wgs84ToLv95
} from '$lib/geo/providers/ch/cantonRegistry';

describe('cantonRegistry', () => {
	it('registers ZH and BS for open cadastre; GE stays unwired', () => {
		expect(OPEN_CANTON_CADASTRE.some((c) => c.code === 'ZH')).toBe(true);
		expect(OPEN_CANTON_CADASTRE.some((c) => c.code === 'BS')).toBe(true);
		expect(getOpenCantonCadastre('ZH')?.endpoint).toContain('maps.zh.ch');
		expect(getOpenCantonCadastre('BS')?.typeName).toContain('Liegenschaftsparzelle');
		expect(getOpenCantonProtected('ZH')?.layers.length).toBeGreaterThan(0);
		expect(getOpenCantonCadastre('GE')).toBeNull();
		expect(getOpenCantonCadastre('BE')).toBeNull();
	});

	it('converts Zurich WGS84 to LV95 near expected easting/northing', () => {
		const { e, n } = wgs84ToLv95(47.369, 8.539);
		expect(e).toBeGreaterThan(2_680_000);
		expect(e).toBeLessThan(2_685_000);
		expect(n).toBeGreaterThan(1_245_000);
		expect(n).toBeLessThan(1_250_000);
	});
});
