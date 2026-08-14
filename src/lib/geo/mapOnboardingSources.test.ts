import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES } from '$lib/geo/countries';
import { getMapOnboardingSources } from './mapOnboardingSources';
import * as m from '$lib/paraglide/messages.js';

describe('getMapOnboardingSources', () => {
	it('covers every CountryCode with non-empty labels', () => {
		for (const code of COUNTRY_CODES) {
			const sources = getMapOnboardingSources(code);
			expect(sources.cadastreSource.length).toBeGreaterThan(0);
			expect(sources.protectedSource.length).toBeGreaterThan(0);
		}
	});

	it('returns FR IGN / ZNIEFF labels', () => {
		expect(getMapOnboardingSources('FR')).toEqual({
			cadastreSource: 'Cadastre IGN',
			protectedSource: 'ZNIEFF1 (Patrinat)'
		});
	});

	it('returns NL Kadaster labels', () => {
		expect(getMapOnboardingSources('NL').cadastreSource).toContain('Kadaster');
	});

	it('returns US PAD-US labels without implying private parcels', () => {
		const us = getMapOnboardingSources('US');
		expect(us.cadastreSource).toContain('PAD-US');
		expect(us.cadastreSource.toLowerCase()).toContain('public');
		expect(us.protectedSource).toContain('PAD-US');
	});

	it('returns DE ALKIS / EEA labels', () => {
		const de = getMapOnboardingSources('DE');
		expect(de.cadastreSource).toMatch(/ALKIS|Geoportal/i);
		expect(de.protectedSource).toContain('EEA');
	});

	it('falls back for null country', () => {
		expect(getMapOnboardingSources(null)).toEqual({
			cadastreSource: m.map_source_parcel_data(),
			protectedSource: m.map_source_protected_areas()
		});
	});
});
