import { describe, expect, it } from 'vitest';
import { getMapProvider } from './registry';

describe('getMapProvider', () => {
	it('returns a provider tagged with the requested country for every supported country', () => {
		for (const country of ['FR', 'ES', 'IT', 'DE', 'GB', 'CH', 'AT', 'BE', 'NL', 'SE', 'NO', 'US', 'CA', 'NZ', 'PT', 'IE', 'AU', 'DK', 'FI', 'JP'] as const) {
			const provider = getMapProvider(country);
			expect(provider.country).toBe(country);
			expect(provider.plan.tiles.length).toBeGreaterThan(0);
			expect(provider.ortho.tiles.length).toBeGreaterThan(0);
			expect(provider.plan.attribution).not.toBe('');
			expect(provider.ortho.attribution).not.toBe('');
		}
	});

	it('falls back to the international provider when the country is null', () => {
		const provider = getMapProvider(null);
		expect(provider.country).toBe('INTL');
		expect(provider.plan.tiles.length).toBeGreaterThan(0);
		expect(provider.ortho.tiles.length).toBeGreaterThan(0);
	});

	it('does not offer a cadastre overlay for countries without a tileable source', () => {
		expect(getMapProvider('IT').cadastreOverlay).toBeNull();
		expect(getMapProvider('DE').cadastreOverlay).toBeNull();
		expect(getMapProvider('GB').cadastreOverlay).toBeNull();
		expect(getMapProvider('CH').cadastreOverlay).toBeNull();
		expect(getMapProvider('AT').cadastreOverlay).toBeNull();
		expect(getMapProvider('SE').cadastreOverlay).toBeNull();
		expect(getMapProvider('NO').cadastreOverlay).toBeNull();
		expect(getMapProvider('US').cadastreOverlay).toBeNull();
		expect(getMapProvider('CA').cadastreOverlay).toBeNull();
		expect(getMapProvider('NZ').cadastreOverlay).toBeNull();
		expect(getMapProvider('PT').cadastreOverlay).toBeNull();
		expect(getMapProvider('IE').cadastreOverlay).toBeNull();
		expect(getMapProvider('DK').cadastreOverlay).toBeNull();
		expect(getMapProvider('FI').cadastreOverlay).toBeNull();
		expect(getMapProvider('AU').cadastreOverlay).toBeNull();
		expect(getMapProvider('JP').cadastreOverlay).toBeNull();
	});

	it('offers a CadGIS ArcGIS export overlay for Belgium', () => {
		const overlay = getMapProvider('BE').cadastreOverlay;
		expect(overlay).not.toBeNull();
		expect(overlay?.tiles[0]).toContain('ccff02.minfin.fgov.be');
		expect(overlay?.tiles[0]).toContain('INSPIRE/CP/MapServer');
		expect(overlay?.tiles[0]).toContain('{bbox-epsg-3857}');
		expect(overlay?.tiles[0]).toContain('export');
	});

	it('offers a Catastro WMS BBOX overlay for Spain', () => {
		const overlay = getMapProvider('ES').cadastreOverlay;
		expect(overlay).not.toBeNull();
		expect(overlay?.tiles[0]).toContain('ovc.catastro.meh.es');
		expect(overlay?.tiles[0]).toContain('PARCELA');
		expect(overlay?.tiles[0]).toContain('{bbox-epsg-3857}');
	});

	it('offers a PDOK kadastralekaart overlay for the Netherlands', () => {
		const overlay = getMapProvider('NL').cadastreOverlay;
		expect(overlay).not.toBeNull();
		expect(overlay?.tiles[0]).toContain('kadastralekaart');
		expect(overlay?.tiles[0]).toContain('EPSG:3857');
	});

	it('uses USGS Topo for the United States', () => {
		const provider = getMapProvider('US');
		expect(provider.plan.tiles[0]).toContain('nationalmap.gov');
		expect(provider.ortho.tiles[0]).toContain('World_Imagery');
	});

	it('uses OpenTopoMap for Canada', () => {
		const provider = getMapProvider('CA');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.ortho.tiles[0]).toContain('World_Imagery');
	});

	it('uses OpenTopoMap for New Zealand', () => {
		const provider = getMapProvider('NZ');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.ortho.tiles[0]).toContain('World_Imagery');
	});

	it('uses swisstopo WMTS for Switzerland', () => {
		const provider = getMapProvider('CH');
		expect(provider.plan.tiles[0]).toContain('wmts.geo.admin.ch');
		expect(provider.plan.tiles[0]).toContain('pixelkarte-farbe');
		expect(provider.ortho.tiles[0]).toContain('swissimage');
	});

	it('uses basemap.at for Austria', () => {
		const provider = getMapProvider('AT');
		expect(provider.plan.tiles[0]).toContain('basemap');
		expect(provider.plan.tiles[0]).toContain('geolandbasemap');
		expect(provider.ortho.tiles[0]).toContain('bmaporthofoto');
	});

	it('uses OpenTopoMap for Belgium (NGI CartoWeb is CC-BY-NC)', () => {
		const provider = getMapProvider('BE');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.ortho.tiles[0]).toContain('World_Imagery');
	});

	it('uses PDOK BRT for the Netherlands', () => {
		const provider = getMapProvider('NL');
		expect(provider.plan.tiles[0]).toContain('brt-achtergrondkaart');
		expect(provider.ortho.tiles[0]).toContain('luchtfotorgb');
	});

	it('uses OpenTopoMap for Sweden (Lantmäteriet needs token)', () => {
		const provider = getMapProvider('SE');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
	});

	it('uses Kartverket topo for Norway', () => {
		const provider = getMapProvider('NO');
		expect(provider.plan.tiles[0]).toContain('kartverket.no');
		expect(provider.plan.tiles[0]).toContain('webmercator');
	});

	it('keeps the France cadastre overlay wired to the IGN PCI Express layer', () => {
		const provider = getMapProvider('FR');
		expect(provider.cadastreOverlay).not.toBeNull();
		expect(provider.cadastreOverlay?.tiles[0]).toContain('CADASTRALPARCELS.PARCELLAIRE_EXPRESS');
		expect(provider.protectedAreasOverlay).not.toBeNull();
		expect(provider.protectedAreasOverlay?.tiles[0]).toContain('Patrinat_ZNIEFF1');
	});

	it('offers an EEA or national protected-areas overlay for EU/CH verification', () => {
		for (const country of ['ES', 'IT', 'DE', 'BE', 'NL', 'AT', 'PT', 'SE', 'NO', 'IE', 'DK', 'FI'] as const) {
			const overlay = getMapProvider(country).protectedAreasOverlay;
			expect(overlay).not.toBeNull();
			expect(overlay?.tiles[0]).toContain('Natura2000Sites');
			expect(overlay?.tiles[0]).toContain('export');
			expect(overlay?.tiles[0]).toContain('bbox={bbox-epsg-3857}');
		}
		const ch = getMapProvider('CH').protectedAreasOverlay;
		expect(ch).not.toBeNull();
		expect(ch?.tiles[0]).toContain('schutzgebiete');
	});

	it('offers protected/tenure overlays for US, CA, NZ, and GB', () => {
		const us = getMapProvider('US').protectedAreasOverlay;
		expect(us).not.toBeNull();
		expect(us?.tiles[0]).toContain('PAD_US');
		expect(us?.tiles[0]).toContain('bbox={bbox-epsg-3857}');

		const ca = getMapProvider('CA').protectedAreasOverlay;
		expect(ca).not.toBeNull();
		expect(ca?.tiles[0]).toContain('CPCAD');
		expect(ca?.tiles[0]).toContain('bbox={bbox-epsg-3857}');

		const nz = getMapProvider('NZ').protectedAreasOverlay;
		expect(nz).not.toBeNull();
		expect(nz?.tiles[0]).toContain('PublicConservationAreas');
		expect(nz?.tiles[0]).toContain('bbox={bbox-epsg-3857}');

		const au = getMapProvider('AU').protectedAreasOverlay;
		expect(au).not.toBeNull();
		expect(au?.tiles[0]).toContain('CAPAD');
		expect(au?.tiles[0]).toContain('bbox={bbox-epsg-3857}');

		const gb = getMapProvider('GB').protectedAreasOverlay;
		expect(gb).not.toBeNull();
		expect(gb?.tiles[0]).toContain('sites-of-special-scientific-interest');
		expect(gb?.tiles[0]).toContain('BBOX={bbox-epsg-3857}');

		const scot = getMapProvider('GB', { latitude: 57.13, longitude: -3.72 }).protectedAreasOverlay;
		expect(scot?.tiles[0]).toContain('nature.scot');

		const wales = getMapProvider('GB', { latitude: 53.07, longitude: -4.0 }).protectedAreasOverlay;
		expect(wales?.tiles[0]).toMatch(/datamap\.gov\.wales|NRW_SSSI/);

		const ni = getMapProvider('GB', { latitude: 54.6, longitude: -5.93 }).protectedAreasOverlay;
		expect(ni?.tiles[0]).toContain('Natura2000Sites');
		expect(ni?.attribution).toMatch(/NIEA|Natura/i);
	});

	it('falls back to OpenTopoMap for GB when no OS API key is configured', () => {
		const provider = getMapProvider('GB');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
	});
});
