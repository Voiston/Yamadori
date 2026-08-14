import { describe, expect, it, beforeEach } from 'vitest';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import {
	buildCadastreRefsText,
	buildCadastreRefsTextForLocale,
	effectiveCollectStatus,
	formatCadastreParcelRef,
	shareCadastreAdminCodeLine,
	shareCadastreAuthHint
} from '$lib/utils/cadastreRefs';
import { getEuPermitLinks } from '$lib/geo/legal/euPermitLinks';
import { localeForCountry } from '$lib/utils/i18n/locale';
import { setLocale } from '$lib/paraglide/runtime.js';
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
	it('returns cartes.gouv.fr permalink for FR', () => {
		const link = getCadastreViewerLink('FR', 47.2, -1.55, samplePrivate);
		expect(link?.label).toBe('cartes.gouv.fr');
		expect(link?.url).toContain('cartes.gouv.fr/explorer-les-cartes/');
		expect(link?.url).toContain('c=-1.550000,47.200000');
		expect(link?.url).toContain('CADASTRALPARCELS.PARCELLAIRE_EXPRESS');
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

	it('deep-links AT/DE/SE/NZ and OSM hand-off for US/CA', () => {
		expect(getCadastreViewerLink('AT', 48.2082, 16.3738)?.url).toContain('basemap.at/#map=17/');
		expect(getCadastreViewerLink('DE', 52.52, 13.405)?.url).toContain('geoportal.de/map.html');
		expect(getCadastreViewerLink('SE', 59.33, 18.07)?.url).toContain('z=16');
		expect(getCadastreViewerLink('US', 39.74, -104.99)?.url).toContain(
			'openstreetmap.org/#map=17/39.740000/-104.990000'
		);
		expect(getCadastreViewerLink('NZ', -41.3, 174.78)?.url).toContain('doc.govt.nz/map');
		expect(getCadastreViewerLink('CA', 45.42, -75.69)?.url).toContain(
			'openstreetmap.org/#map=17/45.420000/-75.690000'
		);
	});

	it('returns nation-aware GB labels with OSM GPS hand-off', () => {
		expect(getCadastreViewerLink('GB', 53.35, -1.8)?.label).toBe(
			'HM Land Registry (GPS position)'
		);
		expect(getCadastreViewerLink('GB', 53.35, -1.8)?.url).toContain('openstreetmap.org');
		expect(getCadastreViewerLink('GB', 57.13, -3.72)?.label).toContain('ScotLIS');
		expect(getCadastreViewerLink('GB', 57.13, -3.72)?.url).toContain('openstreetmap.org');
		expect(getCadastreViewerLink('GB', 54.6, -5.93)?.label).toContain('nidirect');
		expect(getCadastreViewerLink('GB', 54.6, -5.93)?.url).toContain('openstreetmap.org');
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
	beforeEach(() => {
		setLocale('fr', { reload: false });
	});

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

	it('maps country to share locale', () => {
		expect(localeForCountry('FR')).toBe('fr');
		expect(localeForCountry('ES')).toBe('es');
		expect(localeForCountry('CH')).toBe('de');
		expect(localeForCountry('PT')).toBe('pt');
		expect(localeForCountry('DK')).toBe('da');
		expect(localeForCountry('FI')).toBe('fi');
		expect(localeForCountry('JP')).toBe('en');
		expect(localeForCountry(null)).toBeNull();
	});

	it('uses country-aware authorization share hints', () => {
		expect(shareCadastreAuthHint('Nantes', 'FR', 'fr')).toMatch(/mairie/i);
		expect(shareCadastreAuthHint('Denver', 'US', 'en')).toMatch(/agency/i);
		expect(shareCadastreAuthHint('Roma', 'IT', 'it')).toMatch(/comune/i);
		expect(shareCadastreAuthHint('Unknown', null, 'fr')).toMatch(/propriétaire|autorité/i);
		expect(buildCadastreRefsText(samplePrivate, 47.2, -1.55, 'FR')).toContain(
			shareCadastreAuthHint('Nantes', 'FR', 'fr')
		);
	});

	it('uses country-aware admin code labels', () => {
		expect(shareCadastreAdminCodeLine('44109', 'FR', 'fr')).toMatch(/INSEE/i);
		expect(shareCadastreAdminCodeLine('REF123', 'ES', 'fr')).toMatch(/catastrale/i);
		expect(shareCadastreAdminCodeLine('CH123', 'CH', 'de')).toMatch(/EGRID|BFS/i);
		expect(shareCadastreAdminCodeLine('PA1', 'US', 'en')).toMatch(/Agency|unit/i);
	});

	it('avoids Parcelle: Parcelle redundancy and uses recipient owner line', () => {
		const text = buildCadastreRefsTextForLocale(samplePrivate, 47.2, -1.55, 'FR', 'fr');
		expect(text).toContain('Parcelle : AB n°123');
		expect(text).not.toMatch(/Parcelle : Parcelle/i);
		expect(text).toContain('Code INSEE');
		expect(text).toMatch(/n’est pas inclus|n'est pas inclus/);
		expect(text).not.toMatch(/Yamadori n’affiche|Yamadori n'affiche/);
	});

	it('emits a single FR block when UI and country share French', () => {
		const text = buildCadastreRefsText(samplePrivate, 47.2, -1.55, 'FR');
		expect(text).toContain('références foncières');
		expect(text).not.toContain('\n\n');
		expect(text.match(/Code INSEE/g)?.length).toBe(1);
	});

	it('emits FR + ES blocks for Spain with cadastral (not INSEE) labels', () => {
		const esInfo: CadastreInfo = {
			...samplePrivate,
			commune: 'Madrid',
			section: 'PC2',
			parcelNumber: 'PC1',
			codeInsee: 'PC1PC2'
		};
		const text = buildCadastreRefsText(esInfo, 40.4, -3.7, 'ES');
		expect(text).toContain('références foncières');
		expect(text).toContain('referencias catastrales');
		expect(text).toContain('\n\n');
		expect(text).toMatch(/Référence catastrale/);
		expect(text).toMatch(/Referencia catastral/);
		expect(text).not.toMatch(/INSEE/);
	});

	it('emits FR + DE blocks for Switzerland with BFS/EGRID', () => {
		const chInfo: CadastreInfo = {
			...samplePrivate,
			commune: 'Zürich',
			codeInsee: 'CH123456789012'
		};
		const text = buildCadastreRefsText(chInfo, 47.37, 8.54, 'CH');
		expect(text).toContain('références foncières');
		expect(text).toContain('Grundstücksreferenzen');
		expect(text).toMatch(/BFS \/ EGRID/);
	});

	it('emits FR + EN agency hint for US', () => {
		const usInfo: CadastreInfo = {
			...samplePrivate,
			commune: 'Denver',
			section: '',
			parcelNumber: 'unit-1',
			codeInsee: 'PA-99',
			unitName: 'Arapaho NF'
		};
		const text = buildCadastreRefsText(usInfo, 39.74, -104.99, 'US');
		expect(text).toContain('\n\n');
		expect(text).toMatch(/agence|Agency/i);
		expect(text).toMatch(/land agency|Agency \/ unit/i);
	});

	it('falls back to EN for Japan when UI is French', () => {
		const jpInfo: CadastreInfo = {
			...samplePrivate,
			commune: 'Kyoto',
			codeInsee: '26100'
		};
		const text = buildCadastreRefsText(jpInfo, 35.0, 135.7, 'JP');
		expect(text).toContain('références foncières');
		expect(text).toContain('land references');
		expect(text).toContain('\n\n');
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
