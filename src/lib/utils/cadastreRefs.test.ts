import { describe, expect, it } from 'vitest';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import {
	buildCadastreRefsText,
	effectiveCollectStatus,
	formatCadastreParcelRef,
	shareCadastreAuthHint
} from '$lib/utils/cadastreRefs';
import { getEuPermitLinks } from '$lib/geo/legal/euPermitLinks';
import type { CadastreInfo } from '$lib/types/cadastre';

const samplePrivate: CadastreInfo = {
	commune: 'Nantes',
	section: 'AB',
	parcelNumber: '123',
	codeInsee: '44109',
	zoneType: 'private',
	fetchedAt: new Date().toISOString()
};

describe('cadastreViewer', () => {
	it('returns Géoportail link for FR', () => {
		const link = getCadastreViewerLink('FR', 47.2, -1.55, samplePrivate);
		expect(link?.label).toBe('Géoportail');
		expect(link?.url).toContain('geoportail.gouv.fr');
		expect(link?.url).toContain('-1.550000,47.200000');
	});

	it('returns null without country', () => {
		expect(getCadastreViewerLink(null, 47.2, -1.55)).toBeNull();
	});

	it('returns Agenzia Entrate geoportale landing for IT (not SOAP svc)', () => {
		const link = getCadastreViewerLink('IT', 41.9, 12.5);
		expect(link?.label).toContain('Geoportale');
		expect(link?.url).toContain('agenziaentrate.gov.it');
		expect(link?.url).toContain('lat=41.900000');
		expect(link?.url).toContain('lon=12.500000');
		expect(link?.url).not.toContain('Inspire.svc');
	});

	it('deep-links BE CadGIS and NO Seeiendom with coordinates', () => {
		const be = getCadastreViewerLink('BE', 50.8503, 4.3517);
		expect(be?.url).toContain('cadgis');
		expect(be?.url).toContain('lat=50.850300');
		expect(be?.url).toContain('lon=4.351700');

		const no = getCadastreViewerLink('NO', 59.91, 10.75, {
			...samplePrivate,
			commune: 'Oslo',
			parcelNumber: '1/2',
			codeInsee: '0301'
		});
		expect(no?.url).toContain('seeiendom.kartverket.no');
		expect(no?.url).toContain('nord=59.910000');
		expect(no?.url).toContain('ost=10.750000');
		expect(no?.url).toContain('kommunenummer=0301');
	});

	it('deep-links AT/DE/SE/US/NZ viewers with map position', () => {
		expect(getCadastreViewerLink('AT', 48.2082, 16.3738)?.url).toContain('basemap.at/#map=17/');
		expect(getCadastreViewerLink('DE', 52.52, 13.405)?.url).toContain('geoportal.de/map.html');
		expect(getCadastreViewerLink('SE', 59.33, 18.07)?.url).toContain('z=16');
		expect(getCadastreViewerLink('US', 39.74, -104.99)?.url).toContain('maps.usgs.gov/padus');
		expect(getCadastreViewerLink('NZ', -41.3, 174.78)?.url).toContain('doc.govt.nz/map');
		expect(getCadastreViewerLink('CA', 45.42, -75.69)?.url).toContain('open.canada.ca');
	});

	it('returns nation-aware GB registry links', () => {
		expect(getCadastreViewerLink('GB', 53.35, -1.8)?.label).toBe('HM Land Registry');
		expect(getCadastreViewerLink('GB', 57.13, -3.72)?.url).toContain('scotlis');
		expect(getCadastreViewerLink('GB', 54.6, -5.93)?.url).toContain('nidirect');
	});

	it('deep-links ES Catastro with refcat or lat/lon', () => {
		const withRef = getCadastreViewerLink('ES', 40.4, -3.7, {
			...samplePrivate,
			commune: 'Madrid',
			codeInsee: '1234567AB1234C0001XX'
		});
		expect(withRef?.url).toContain('sedecatastro.gob.es');
		expect(withRef?.url).toContain('refcat=1234567AB1234C0001XX');

		const byCoord = getCadastreViewerLink('ES', 40.4168, -3.7038);
		expect(byCoord?.url).toContain('sedecatastro.gob.es');
		expect(byCoord?.url).toContain('latitud=40.416800');
		expect(byCoord?.url).toContain('longitud=-3.703800');
	});

	it('deep-links CH map.geo.admin with EGRID or swisssearch', () => {
		const withEgrid = getCadastreViewerLink('CH', 47.37, 8.54, {
			...samplePrivate,
			commune: 'Zürich',
			codeInsee: 'CH123456789012'
		});
		expect(withEgrid?.url).toContain('map.geo.admin.ch');
		expect(withEgrid?.url).toContain('EGRID=CH123456789012');

		const byCoord = getCadastreViewerLink('CH', 46.95, 7.45);
		expect(byCoord?.url).toContain('map.geo.admin.ch');
		expect(byCoord?.url).toContain('swisssearch=46.950000,7.450000');
	});

	it('deep-links NL PDOK viewer and PT OSM hand-off', () => {
		const nl = getCadastreViewerLink('NL', 52.37, 4.89);
		expect(nl?.url).toContain('pdok.nl/viewer');
		expect(nl?.url).toContain('4.890000');
		expect(nl?.url).toContain('52.370000');

		const pt = getCadastreViewerLink('PT', 38.72, -9.14);
		expect(pt?.url).toContain('openstreetmap.org');
		expect(pt?.url).toContain('38.720000');
		expect(pt?.url).toContain('-9.140000');
	});
});

describe('cadastreRefs', () => {
	it('derives collectStatus from zoneType when missing', () => {
		expect(effectiveCollectStatus(samplePrivate)).toBe('owner_permission');
		expect(
			effectiveCollectStatus({ ...samplePrivate, collectStatus: 'forbidden' })
		).toBe('forbidden');
	});

	it('formats parcel refs', () => {
		expect(formatCadastreParcelRef(samplePrivate)).toContain('AB');
		expect(formatCadastreParcelRef(samplePrivate)).toContain('123');
	});

	it('uses country-aware authorization share hints', () => {
		expect(shareCadastreAuthHint('Nantes', 'FR')).toMatch(/mairie|town hall|Gemeinde/i);
		expect(shareCadastreAuthHint('Denver', 'US')).toMatch(/agence|agency|Behörde|instantie/i);
		expect(shareCadastreAuthHint('Roma', 'IT')).toMatch(/propriétaire|owner|Eigentümer|autorit/i);
		expect(buildCadastreRefsText(samplePrivate, 47.2, -1.55, 'FR')).toContain(
			shareCadastreAuthHint('Nantes', 'FR')
		);
	});
});

describe('euPermitLinks', () => {
	it('returns FR ONF / mairie starting points', () => {
		const links = getEuPermitLinks('FR', 'private');
		expect(links.length).toBeGreaterThan(0);
		expect(links.some((l) => l.id.includes('fr'))).toBe(true);
	});

	it('returns empty for US (handled elsewhere)', () => {
		expect(getEuPermitLinks('US', 'national_forest')).toEqual([]);
	});
});
