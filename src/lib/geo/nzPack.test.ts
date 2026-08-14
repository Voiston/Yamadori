import { describe, expect, it } from 'vitest';
import { classifyDocPclHit, classifyDocPclHits } from '$lib/geo/providers/doc-pcl/classify';
import { collectStatusForZone } from '$lib/geo/legal/usCollectStatus';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { findNzHarvestWindows } from '$lib/geo/nzHarvestCalendar';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getNzPermitLinks } from '$lib/geo/legal/nzPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import { getMapProvider } from '$lib/geo/providers/map/registry';

describe('resolveCountry NZ', () => {
	it('resolves Auckland to NZ', () => {
		expect(resolveCountry(-36.8485, 174.7633)).toBe('NZ');
	});

	it('resolves Christchurch to NZ', () => {
		expect(resolveCountry(-43.5321, 172.6362)).toBe('NZ');
	});

	it('resolves Fiordland to NZ', () => {
		expect(resolveCountry(-45.0, 167.0)).toBe('NZ');
	});

	it('resolves Chatham Islands to NZ', () => {
		expect(resolveCountry(-43.9, -176.5)).toBe('NZ');
	});

	it('does not resolve Banff as NZ', () => {
		expect(resolveCountry(51.1784, -115.5708)).not.toBe('NZ');
	});

	it('does not resolve Sydney as NZ', () => {
		expect(resolveCountry(-33.8688, 151.2093)).not.toBe('NZ');
	});
});

describe('getGeoCapabilities NZ', () => {
	it('marks NZ as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('NZ');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.municipality).toBe('partial');
		expect(caps.speciesProtection).toBe('partial');
	});
});

describe('NZ map / legal / species / permits', () => {
	it('uses DOC PCL overlay', () => {
		const provider = getMapProvider('NZ');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.protectedAreasOverlay).not.toBeNull();
		expect(provider.protectedAreasOverlay?.tiles[0]).toMatch(/doc\.govt\.nz|PublicConservation/i);
	});

	it('exposes NZ legal pack with NZPCN search and kauri hub', () => {
		const pack = getLegalContentPack('NZ');
		expect(pack.country).toBe('NZ');
		expect(pack.articles.length).toBeGreaterThanOrEqual(5);
		expect(pack.articles.find((a) => a.id === 'nz_conservation_act')?.url).toContain('1987/0065');
		expect(pack.articles.find((a) => a.id === 'nz_kauri_dieback')?.url).toContain('kauri');
		expect(pack.speciesSourceName).toMatch(/NZPCN/i);
		expect(pack.speciesSearchBase).toContain('nzpcn.org.nz');
		expect(pack.buildSpeciesSearchUrl?.('Agathis australis')).toContain('nzpcn.org.nz');
		expect(pack.buildSpeciesSearchUrl?.('Agathis australis')).toContain('SearchText');
		expect(pack.buildSpeciesSearchUrl?.('Agathis australis')).not.toContain('gbif.org');
	});

	it('exposes NZ species pack with kauri veto', () => {
		const pack = getSpeciesProtectionPack('NZ');
		expect(pack?.country).toBe('NZ');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/NZPCN/i);
		const kauri = pack?.entries.find((e) => e.id === 'nz_kauri');
		expect(kauri?.level).toBe('veto');
		expect(kauri?.scope).toBe('national');
		const beech = pack?.entries.find((e) => e.id === 'nz_mountain_beech');
		expect(beech?.level).toBe('caution');
		expect(beech?.scope).toBe('regional');
		expect(pack?.buildSourceUrl?.('Kauri')).toContain('nzpcn.org.nz');
	});

	it('exposes DOC Form 10, Treaty Section 4, and LGNZ without Google', () => {
		const pcl = getNzPermitLinks({ zoneType: 'national_park' });
		expect(pcl.find((l) => l.id === 'doc_collection')?.url).toContain('research-and-collection');
		expect(pcl.every((l) => !l.url.includes('google.com'))).toBe(true);

		const tribal = getNzPermitLinks({ zoneType: 'tribal' });
		expect(tribal.find((l) => l.id === 'whenua_rahui')?.url).toContain('section-4');
		expect(tribal.every((l) => !l.url.includes('tangata-whenua'))).toBe(true);

		const outside = getNzPermitLinks({ zoneType: 'crown_unverified' });
		expect(outside.find((l) => l.id === 'lgnz_councils')?.url).toContain('lgnz.co.nz');
		expect(outside.every((l) => !l.url.includes('google.com'))).toBe(true);
	});

	it('exposes DOC Maps viewer', () => {
		const link = getCadastreViewerLink('NZ', -36.85, 174.76);
		expect(link?.url).toContain('doc.govt.nz/map');
	});
});

describe('DOC PCL classify', () => {
	it('classifies National Park as national_park / forbidden', () => {
		const zone = classifyDocPclHit({
			name: 'Fiordland National Park',
			type: 'NATIONAL_PARK',
			section: 'S4_NATIONAL_PARK',
			legislation: 'NATIONAL_PARK_ACT',
			napalisId: '1',
			unitNumber: ''
		});
		expect(zone).toBe('national_park');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('classifies Whenua Rahui as tribal / forbidden', () => {
		const zone = classifyDocPclHit({
			name: 'Example Whenua Rahui',
			type: 'CONSERVATION_AREA',
			section: 'S58_WHENUA_RAHUI',
			legislation: 'CONSERVATION_ACT',
			napalisId: '2',
			unitNumber: ''
		});
		expect(zone).toBe('tribal');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('classifies Scenic Reserve as wilderness / forbidden', () => {
		const zone = classifyDocPclHit({
			name: 'Example Scenic Reserve',
			type: 'RESERVE',
			section: 'S19_1_A_SCENIC',
			legislation: 'RESERVES_ACT',
			napalisId: '4',
			unitNumber: ''
		});
		expect(zone).toBe('wilderness');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('classifies Conservation Park as other_federal / forbidden_or_agency', () => {
		const zone = classifyDocPclHit({
			name: 'Example Conservation Park',
			type: 'CONSERVATION_AREA',
			section: 'S19_CONSERVATION_PARK',
			legislation: 'CONSERVATION_ACT',
			napalisId: '3',
			unitNumber: ''
		});
		expect(zone).toBe('other_federal');
		expect(collectStatusForZone(zone)).toBe('forbidden_or_agency');
	});

	it('defaults to crown_unverified / unknown with no hits', () => {
		const result = classifyDocPclHits([]);
		expect(result.zoneType).toBe('crown_unverified');
		expect(result.collectStatus).toBe('unknown');
	});
});

describe('NZ harvest calendar', () => {
	it('finds southern-hemisphere windows for Pohutukawa in Northland', () => {
		const windows = findNzHarvestWindows('Pohutukawa', 'nz_northland');
		expect(windows.length).toBeGreaterThan(0);
		expect(windows[0].startMonth).toBeGreaterThanOrEqual(5);
		expect(windows[0].startMonth).toBeLessThanOrEqual(8);
	});
});

describe('NZ i18n UTF-8', () => {
	it('has no U+FFFD in English NZ disclaimer and species examples', async () => {
		const en = await import('../../../messages/en.json');
		const note = en.default.veto_disclaimer_note_nz as string;
		const title = en.default.veto_species_examples_title_nz as string;
		const body = en.default.veto_species_examples_body_nz as string;
		expect(note).not.toContain('\uFFFD');
		expect(title).not.toContain('\uFFFD');
		expect(body).not.toContain('\uFFFD');
		expect(note.toLowerCase()).toContain('doc');
		expect(note.toLowerCase()).toContain('no link authorizes');
		expect(body.toLowerCase()).toContain('kauri');
		expect(body.toLowerCase()).toContain('nzpcn');
	});
});
