import { describe, expect, it } from 'vitest';
import {
	landForState,
	OPEN_ALKIS_LANDS,
	parseAlkisGeoJson,
	parseAlkisGml,
	parseAlkisWfsResponse,
	type AlkisLandConfig
} from '$lib/geo/providers/cadastre/de';
import { getCadastreAttribution } from '$lib/geo/attributions';

const nrw = OPEN_ALKIS_LANDS.find((l) => l.bboxAxis === 'latlon')!;
const bw = OPEN_ALKIS_LANDS.find((l) => /baden/i.test(l.match.source))!;

describe('cadastre/de ALKIS matching', () => {
	it('matches Nominatim-style labels to NRW and BW', () => {
		expect(landForState('DE-NW Nordrhein-Westfalen')?.endpoint).toContain('wfs.nrw.de');
		expect(landForState('Nordrhein-Westfalen')?.typeName).toBe('ave:Flurstueck');
		expect(landForState('DE-BW Baden-Württemberg')?.typeName).toBe('nora:v_al_flurstueck');
		expect(landForState('Baden-Wuerttemberg')?.endpoint).toContain('lgl-bw.de');
		expect(landForState('Bayern')).toBeNull();
	});

	it('keeps previously wired Länder including RP', () => {
		expect(landForState('DE-BE Berlin')?.endpoint).toContain('berlin.de');
		expect(landForState('Hamburg')?.endpoint).toContain('hamburg.de');
		expect(landForState('DE-RP Rheinland-Pfalz')?.endpoint).toContain('alkis_rp.fcgi');
		expect(landForState('Rheinland-Pfalz')?.bboxAxis).toBe('latlon');
		expect(OPEN_ALKIS_LANDS.length).toBeGreaterThanOrEqual(8);
	});
});

describe('cadastre/de WFS parsers', () => {
	it('parses NRW-style GML Flurstueck member', () => {
		const gml = `<?xml version="1.0"?>
<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" numberReturned="1">
<wfs:member>
<Flurstueck>
<flstkennz>05495803101330______</flstkennz>
<gemarkung>Koeln</gemarkung>
<gemeinde>Koeln</gemeinde>
<geometrie><gml:MultiSurface xmlns:gml="http://www.opengis.net/gml/3.2"><gml:surfaceMember/></gml:MultiSurface></geometrie>
</Flurstueck>
</wfs:member>
</wfs:FeatureCollection>`;
		const info = parseAlkisGml(gml, nrw);
		expect(info?.parcelNumber).toBe('05495803101330______');
		expect(info?.commune).toBe('Koeln');
		expect(info?.collectStatus).toBe('owner_permission');
		expect(parseAlkisWfsResponse(gml, nrw)?.parcelNumber).toBe('05495803101330______');
	});

	it('parses BW-style GeoJSON properties', () => {
		const json = {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: {
						flurstueckskennzeichen: '08146000000645000000',
						gemarkung_name: 'Stuttgart',
						gemeinde_name: 'Stuttgart',
						zaehler: 645
					}
				}
			]
		};
		const info = parseAlkisGeoJson(json, bw);
		expect(info?.parcelNumber).toBe('08146000000645000000');
		expect(info?.commune).toBe('Stuttgart');
		expect(parseAlkisWfsResponse(JSON.stringify(json), bw)?.commune).toBe('Stuttgart');
	});

	it('parses RP-style GML Flurstueck member', () => {
		const rp = OPEN_ALKIS_LANDS.find((l) => /rheinland/i.test(l.match.source))!;
		const gml = `<?xml version="1.0"?>
<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" numberReturned="1">
<wfs:member>
<Flurstueck>
<flstkennz>07370100200130______</flstkennz>
<gemarkung>Mainz</gemarkung>
<gemeinde>Mainz</gemeinde>
<geometrie><gml:MultiSurface xmlns:gml="http://www.opengis.net/gml/3.2"><gml:surfaceMember/></gml:MultiSurface></geometrie>
</Flurstueck>
</wfs:member>
</wfs:FeatureCollection>`;
		const info = parseAlkisGml(gml, rp);
		expect(info?.parcelNumber).toBe('07370100200130______');
		expect(info?.commune).toBe('Mainz');
	});

	it('returns null when parcel and commune keys are missing', () => {
		const land: AlkisLandConfig = {
			match: /x/i,
			endpoint: 'https://example.test',
			typeName: 'x',
			parcelKeys: ['flstkennz'],
			communeKeys: ['gemeinde']
		};
		expect(parseAlkisGeoJson({ features: [{ properties: { foo: 'bar' } }] }, land)).toBeNull();
	});
});

describe('cadastre attributions DE/CH', () => {
	it('mentions newly wired Länder and BS canton', () => {
		expect(getCadastreAttribution('DE')).toMatch(/NRW/);
		expect(getCadastreAttribution('DE')).toMatch(/BW/);
		expect(getCadastreAttribution('DE')).toMatch(/RP/);
		expect(getCadastreAttribution('CH')).toMatch(/BS/);
	});
});
