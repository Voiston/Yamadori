import { describe, expect, it } from 'vitest';
import { isTileUrlCacheable } from './tileCache';

describe('isTileUrlCacheable', () => {
	it('accepts previously allowlisted hosts', () => {
		expect(
			isTileUrlCacheable(
				'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&LAYER=test'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable('https://a.tile.opentopomap.org/10/1/2.png')
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/1/2/3'
			)
		).toBe(true);
	});

	it('accepts national basemaps used by the app', () => {
		expect(
			isTileUrlCacheable(
				'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/10/1/2.jpeg'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/10/1/2.png'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://mapsneu.wien.gv.at/basemap/geolandbasemap/normal/google3857/10/1/2.png'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/10/1/2.png'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_farbe/default/GLOBAL_WEBMERCATOR/10/1/2.png'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://www.ign.es/wmts/ign-base?service=WMTS&request=GetTile&layer=IGNBaseTodo'
			)
		).toBe(true);
	});

	it('accepts protected-area overlay hosts', () => {
		expect(
			isTileUrlCacheable(
				'https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/Natura2000Sites/MapServer/export?bbox=1'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://edits.nationalmap.gov/arcgis/rest/services/PAD-US/PAD_US/MapServer/export?bbox=1'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://maps-cartes.ec.gc.ca/arcgis/rest/services/CWS_SCF/CPCAD/MapServer/export?bbox=1'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://mapserver.doc.govt.nz/arcgis/rest/services/Vector/PublicConservationAreas/MapServer/export?bbox=1'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://environment.data.gov.uk/spatialdata/sites-of-special-scientific-interest-units-england/wms'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://ccff02.minfin.fgov.be/geoservices/arcgis/rest/services/INSPIRE/CP/MapServer/export?bbox=1'
			)
		).toBe(true);
		expect(
			isTileUrlCacheable(
				'https://api.os.uk/maps/raster/v1/zxy/Outdoor_3857/10/1/2.png?key=test'
			)
		).toBe(true);
	});

	it('rejects unrelated hosts', () => {
		expect(isTileUrlCacheable('https://example.com/tile/1/2/3.png')).toBe(false);
	});
});
