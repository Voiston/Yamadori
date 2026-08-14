import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import { roleForCountry } from '$lib/geo/providers/municipality/nominatimLookup';

describe('resolveCountry FI / SE / NO borders', () => {
	it('resolves Helsinki to FI', () => {
		expect(resolveCountry(60.1699, 24.9384)).toBe('FI');
	});

	it('resolves Turku to FI', () => {
		expect(resolveCountry(60.4518, 22.2666)).toBe('FI');
	});

	it('resolves Tampere to FI', () => {
		expect(resolveCountry(61.4978, 23.761)).toBe('FI');
	});

	it('resolves Oulu to FI', () => {
		expect(resolveCountry(65.0121, 25.4651)).toBe('FI');
	});

	it('resolves Mariehamn (Åland) to FI', () => {
		expect(resolveCountry(60.1, 19.94)).toBe('FI');
	});

	it('resolves Stockholm to SE', () => {
		expect(resolveCountry(59.3293, 18.0686)).toBe('SE');
	});

	it('resolves Umeå to SE', () => {
		expect(resolveCountry(63.8258, 20.263)).toBe('SE');
	});

	it('resolves Tromsø to NO', () => {
		expect(resolveCountry(69.6492, 18.9553)).toBe('NO');
	});
});

describe('getGeoCapabilities FI', () => {
	it('marks FI as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('FI');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('FI map / legal / species / permits', () => {
	it('uses OpenTopoMap for Finland', () => {
		const provider = getMapProvider('FI');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes FI legal pack with jokaisenoikeudet, Metsähallitus luvat and Finlex', () => {
		const pack = getLegalContentPack('FI');
		expect(pack.country).toBe('FI');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(
			pack.articles.every(
				(a) => !a.url.includes('ymparisto.fi/fi/luonto-vesistot-ja-meri/jokamiehenoikeudet')
			)
		).toBe(true);
		expect(pack.articles.find((a) => a.id === 'fi_jokamiehenoikeudet')?.url).toContain(
			'ym.fi/jokaisenoikeudet'
		);
		expect(pack.articles.find((a) => a.id === 'fi_metsahallitus')?.url).toContain('/luvat');
		expect(pack.articles.find((a) => a.id === 'fi_luonnonsuojelu')?.url).toContain('20230009');
		expect(pack.articles.find((a) => a.id === 'fi_rauhoitus_asetus')?.url).toContain('20231066');
	});

	it('exposes FI species pack with Taxus/Daphne national veto and regional Juniperus', () => {
		const pack = getSpeciesProtectionPack('FI');
		expect(pack?.country).toBe('FI');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/Laji\.fi|FinBIF/i);
		for (const id of ['fi_taxus', 'fi_daphne'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('veto');
			expect(entry?.scope).toBe('national');
		}
		const juniper = pack?.entries.find((e) => e.id === 'fi_juniperus');
		expect(juniper?.level).toBe('caution');
		expect(juniper?.scope).toBe('regional');
	});

	it('exposes deep Metsähallitus / YM / Kuntaliitto permit links', () => {
		const forest = getEuPermitLinks('FI', 'state_forest');
		expect(forest.map((l) => l.id)).toContain('fi_metsahallitus');
		expect(forest.map((l) => l.id)).toContain('fi_ymparisto');
		expect(forest.map((l) => l.id)).toContain('fi_kunta');
		expect(forest.find((l) => l.id === 'fi_metsahallitus')?.url).toContain('/luvat');
		expect(forest.find((l) => l.id === 'fi_ymparisto')?.url).toContain('jokaisenoikeudet');
		expect(forest.find((l) => l.id === 'fi_kunta')?.url).toContain('/kunnat');
		expect(forest.every((l) => l.url !== 'https://www.metsa.fi/')).toBe(true);
		expect(forest.every((l) => l.url !== 'https://www.kuntaliitto.fi/')).toBe(true);
		expect(getEuPermitLinks('FI', 'private')[0]?.id).toBe('fi_kunta');
	});

	it('exposes a cadastre viewer deep link', () => {
		const link = getCadastreViewerLink('FI', 60.1699, 24.9384);
		expect(link?.url).toContain('openstreetmap.org');
	});

	it('uses kunta role for Finland', () => {
		expect(roleForCountry('FI')).toBe('kunta');
	});
});
