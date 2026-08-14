import { describe, expect, it } from 'vitest';
import { classifyCapadHit, classifyCapadHits } from '$lib/geo/providers/capad/classify';
import { collectStatusForZone } from '$lib/geo/legal/usCollectStatus';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getAuPermitLinks, resolveAuState } from '$lib/geo/legal/auPermitLinks';
import { findAuHarvestWindows } from '$lib/geo/auHarvestCalendar';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry AU', () => {
	it('resolves Sydney to AU', () => {
		expect(resolveCountry(-33.8688, 151.2093)).toBe('AU');
	});

	it('resolves Melbourne to AU', () => {
		expect(resolveCountry(-37.8136, 144.9631)).toBe('AU');
	});

	it('resolves Hobart to AU', () => {
		expect(resolveCountry(-42.8821, 147.3272)).toBe('AU');
	});

	it('resolves Perth to AU', () => {
		expect(resolveCountry(-31.9505, 115.8605)).toBe('AU');
	});

	it('resolves Lord Howe to AU', () => {
		expect(resolveCountry(-31.55, 159.08)).toBe('AU');
	});

	it('does not resolve Auckland as AU', () => {
		expect(resolveCountry(-36.8485, 174.7633)).not.toBe('AU');
		expect(resolveCountry(-36.8485, 174.7633)).toBe('NZ');
	});
});

describe('getGeoCapabilities AU', () => {
	it('marks AU as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('AU');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.municipality).toBe('partial');
		expect(caps.speciesProtection).toBe('partial');
	});
});

describe('AU map / legal / species / permits', () => {
	it('uses OpenTopoMap and CAPAD overlay', () => {
		const provider = getMapProvider('AU');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay?.tiles[0]).toContain('CAPAD');
	});

	it('exposes AU legal pack with EPBC Act deep link and ALA search', () => {
		const pack = getLegalContentPack('AU');
		expect(pack.country).toBe('AU');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(pack.articles.find((a) => a.id === 'au_epbc')?.url).toContain('C2004A00485');
		expect(pack.articles.find((a) => a.id === 'au_private_property')?.url).not.toBe(
			'https://www.legislation.gov.au/'
		);
		expect(pack.speciesSourceName).toMatch(/ALA/i);
		expect(pack.speciesSearchBase).toMatch(/ala\.org\.au|bie\.ala/i);
		expect(pack.buildSpeciesSearchUrl?.('Wollemia nobilis')).toMatch(/ala\.org\.au|bie\.ala/i);
		expect(pack.buildSpeciesSearchUrl?.('Wollemia nobilis')).not.toContain('gbif.org');
	});

	it('exposes AU species pack with Wollemi veto', () => {
		const pack = getSpeciesProtectionPack('AU');
		expect(pack?.country).toBe('AU');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/ALA|EPBC/i);
		const wollemi = pack?.entries.find((e) => e.id === 'au_wollemi_pine');
		expect(wollemi?.level).toBe('veto');
		expect(wollemi?.scope).toBe('national');
		const huon = pack?.entries.find((e) => e.id === 'au_huon_pine');
		expect(huon?.level).toBe('caution');
		expect(huon?.scope).toBe('regional');
	});

	it('exposes state park hubs without NSW-as-example-for-all or Google', () => {
		expect(resolveAuState('NSW')).toBe('NSW');
		expect(resolveAuState('Victoria')).toBe('VIC');

		const fed = getAuPermitLinks({ zoneType: 'national_park', stateCode: 'NSW' });
		expect(fed.find((l) => l.id === 'parks_australia')?.url).toContain('parksaustralia.gov.au');
		expect(fed.find((l) => l.id === 'state_parks_NSW')?.url).toContain('nationalparks.nsw.gov.au');
		expect(fed.every((l) => !l.url.includes('google.com'))).toBe(true);
		expect(fed.every((l) => !l.label.toLowerCase().includes('example'))).toBe(true);

		const vic = getAuPermitLinks({ zoneType: 'state_park', stateCode: 'VIC' });
		expect(vic.find((l) => l.id === 'state_parks_VIC')?.url).toContain('parks.vic.gov.au');
		expect(vic.every((l) => l.id !== 'parks_australia')).toBe(true);
		expect(vic.every((l) => !l.url.includes('google.com'))).toBe(true);

		const outside = getAuPermitLinks({ zoneType: 'crown_unverified' });
		expect(outside.find((l) => l.id === 'capad_info')?.url).toContain('capad');
		expect(outside.find((l) => l.id === 'alga_councils')?.url).toContain('alga.com.au');

		const priv = getAuPermitLinks({ zoneType: 'private' });
		expect(priv[0]?.id).toBe('alga_councils');
		expect(priv.find((l) => l.id === 'capad_info')).toBeTruthy();
		expect(priv.every((l) => !l.url.includes('google.com'))).toBe(true);
	});

	it('exposes CAPAD viewer via OSM GPS hand-off', () => {
		const link = getCadastreViewerLink('AU', -33.87, 151.21);
		expect(link?.label).toContain('CAPAD');
		expect(link?.url).toContain('openstreetmap.org/#map=17/-33.870000/151.210000');
		expect(link?.url).not.toContain('nationalmap.gov.au');
	});
});

describe('CAPAD classify', () => {
	it('classifies National Park as national_park / forbidden', () => {
		const zone = classifyCapadHit({
			name: 'Koscuiszko National Park',
			type: 'National Park',
			iucn: 'II',
			zoneType: '',
			state: 'NSW',
			epbc: '',
			paId: '1'
		});
		expect(zone).toBe('national_park');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('classifies IPA as ipca / forbidden', () => {
		const zone = classifyCapadHit({
			name: 'Example IPA',
			type: 'Indigenous Protected Area',
			iucn: 'VI',
			zoneType: 'IPA',
			state: 'NT',
			epbc: '',
			paId: '2'
		});
		expect(zone).toBe('ipca');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('classifies Nature Reserve as wilderness / forbidden', () => {
		const zone = classifyCapadHit({
			name: 'Example Nature Reserve',
			type: 'Nature Reserve',
			iucn: 'Ia',
			zoneType: '',
			state: 'WA',
			epbc: '',
			paId: '3'
		});
		expect(zone).toBe('wilderness');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('defaults to crown_unverified / unknown with no hits', () => {
		const result = classifyCapadHits([]);
		expect(result.zoneType).toBe('crown_unverified');
		expect(result.collectStatus).toBe('unknown');
	});
});

describe('AU harvest calendar', () => {
	it('finds southern-hemisphere windows for Banksia in NSW', () => {
		const windows = findAuHarvestWindows('Banksia', 'au_nsw');
		expect(windows.length).toBeGreaterThan(0);
		expect(windows[0].startMonth).toBeGreaterThanOrEqual(5);
		expect(windows[0].startMonth).toBeLessThanOrEqual(8);
	});
});

describe('AU i18n UTF-8', () => {
	it('has no U+FFFD in English AU disclaimer and species examples', async () => {
		const en = await import('../../../messages/en.json');
		const note = en.default.veto_disclaimer_note_au as string;
		const title = en.default.veto_species_examples_title_au as string;
		const body = en.default.veto_species_examples_body_au as string;
		expect(note).not.toContain('\uFFFD');
		expect(title).not.toContain('\uFFFD');
		expect(body).not.toContain('\uFFFD');
		expect(note.toLowerCase()).toContain('dcceew');
		expect(note.toLowerCase()).toContain('no link authorizes');
		expect(body.toLowerCase()).toContain('wollemi');
		expect(body.toLowerCase()).toContain('epbc');
	});
});
