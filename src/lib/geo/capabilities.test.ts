import { describe, expect, it } from 'vitest';
import { getGeoCapabilities, hasPartialOrMissingCapability } from '$lib/geo/capabilities';

describe('getGeoCapabilities', () => {
	it('marks FR as full across field tools', () => {
		expect(getGeoCapabilities('FR')).toEqual({
			country: 'FR',
			cadastre: 'full',
			protectedAreas: 'full',
			municipality: 'full',
			speciesProtection: 'full'
		});
		expect(hasPartialOrMissingCapability(getGeoCapabilities('FR'))).toBe(false);
	});

	it('marks GB as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('GB');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(hasPartialOrMissingCapability(caps)).toBe(true);
	});

	it('marks CH as partial', () => {
		const caps = getGeoCapabilities('CH');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('partial');
		expect(caps.municipality).toBe('partial');
		expect(hasPartialOrMissingCapability(caps)).toBe(true);
	});

	it('marks AT as partial cadastre with full protected via EEA', () => {
		const caps = getGeoCapabilities('AT');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.municipality).toBe('partial');
		expect(hasPartialOrMissingCapability(caps)).toBe(true);
	});

	it('marks BE as full cadastre/protected with partial municipality', () => {
		const caps = getGeoCapabilities('BE');
		expect(caps.cadastre).toBe('full');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.municipality).toBe('partial');
		expect(caps.speciesProtection).toBe('partial');
		expect(hasPartialOrMissingCapability(caps)).toBe(true);
	});

	it('marks NL as full cadastre/protected with partial municipality', () => {
		const caps = getGeoCapabilities('NL');
		expect(caps.cadastre).toBe('full');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.municipality).toBe('partial');
		expect(caps.speciesProtection).toBe('partial');
		expect(hasPartialOrMissingCapability(caps)).toBe(true);
	});

	it('marks SE as partial cadastre with Allemansrätten-relevant partial municipality', () => {
		const caps = getGeoCapabilities('SE');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.municipality).toBe('partial');
		expect(hasPartialOrMissingCapability(caps)).toBe(true);
	});

	it('marks NO as full cadastre/protected with partial municipality', () => {
		const caps = getGeoCapabilities('NO');
		expect(caps.cadastre).toBe('full');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.municipality).toBe('partial');
		expect(hasPartialOrMissingCapability(caps)).toBe(true);
	});

	it('marks unknown as none', () => {
		expect(getGeoCapabilities(null).cadastre).toBe('none');
	});
});
