import { describe, expect, it } from 'vitest';
import { resolveGbNation, resolveGbNations } from '$lib/geo/providers/protected/gb';
import { getEuPermitLinks } from '$lib/geo/legal/euPermitLinks';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import { isInEnglandWalesCoverage } from '$lib/geo/providers/cadastre/gb';

describe('resolveGbNations', () => {
	it('routes Cairngorms to Scotland', () => {
		expect(resolveGbNations(57.13, -3.72)).toEqual(['scotland']);
		expect(resolveGbNation(57.13, -3.72)).toBe('scotland');
	});

	it('routes Snowdonia / Eryri to Wales', () => {
		expect(resolveGbNations(53.07, -4.0)).toContain('wales');
	});

	it('routes Peak District to England', () => {
		expect(resolveGbNations(53.35, -1.8)).toEqual(['england']);
	});

	it('scans a single inland nation (3 layer queries, no dual-nation)', () => {
		// Far from Wales/Scotland border — only England in the nation list.
		expect(resolveGbNations(52.2, -1.5)).toEqual(['england']);
		expect(resolveGbNation(52.2, -1.5)).toBe('england');
	});

	it('routes Belfast to NI', () => {
		expect(resolveGbNations(54.6, -5.93)).toEqual(['ni']);
		expect(resolveGbNation(54.6, -5.93)).toBe('ni');
	});
});

describe('GB guide links and capabilities', () => {
	it('exposes NatureScot, NRW and DAERA permit starting links', () => {
		const links = getEuPermitLinks('GB', 'private');
		const ids = links.map((l) => l.id);
		expect(ids).toContain('gb_natural_england');
		expect(ids).toContain('gb_naturescot');
		expect(ids).toContain('gb_nrw');
		expect(ids).toContain('gb_daera');
	});

	it('marks GB protectedAreas as full after NI ASSI wiring', () => {
		const caps = getGeoCapabilities('GB');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.cadastre).toBe('partial');
	});
});

describe('GB nation-aware overlays and viewers', () => {
	it('uses Natura 2000 export for NI overlay (not Defra England)', () => {
		const ni = getMapProvider('GB', { latitude: 54.6, longitude: -5.93 }).protectedAreasOverlay;
		expect(ni).not.toBeNull();
		expect(ni?.tiles[0]).toContain('Natura2000Sites');
		expect(ni?.tiles[0]).not.toContain('sites-of-special-scientific-interest-units-england');
	});

	it('returns nation-honest cadastre viewer links', () => {
		expect(getCadastreViewerLink('GB', 53.35, -1.8)?.label).toBe('HM Land Registry');
		expect(getCadastreViewerLink('GB', 57.13, -3.72)?.url).toContain('scotlis.ros.gov.uk');
		expect(getCadastreViewerLink('GB', 54.6, -5.93)?.url).toContain('nidirect.gov.uk');
	});

	it('keeps HMLR parcel coverage England & Wales only', () => {
		expect(isInEnglandWalesCoverage(53.35, -1.8)).toBe(true);
		expect(isInEnglandWalesCoverage(57.13, -3.72)).toBe(false);
		expect(isInEnglandWalesCoverage(54.6, -5.93)).toBe(false);
	});
});
