import { describe, expect, it } from 'vitest';
import { BONSAI_SPECIES_JP, BONSAI_SPECIES_PRIORITY, getBonsaiPriorityRank } from '$lib/constants/bonsai-species';
import { resolveClimateProfile } from '$lib/constants/climate-profiles';
import { getSpeciesGddCategory, isEvergreenSpecies } from '$lib/constants/gdd-config';
import { findJpHarvestWindows, resolveJpHarvestZone } from '$lib/geo/jpHarvestCalendar';
import { resolveHarvestCalendarPrior } from '$lib/geo/harvestWindowPrior';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getLegalContentPack } from '$lib/geo/legal';
import { JP_LEGAL_HUMAN_REVIEW, JP_LEGAL_SOURCES } from '$lib/geo/legal/jpSources';
import { getJpPermitLinks, resolveJpPrefecture } from '$lib/geo/legal/jpPermitLinks';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { collectStatusForZone } from '$lib/geo/legal/usCollectStatus';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import { speciesDisplayName } from '$lib/constants/species-i18n';

describe('resolveCountry JP', () => {
	it('resolves Tokyo, Sapporo and Naha to JP', () => {
		expect(resolveCountry(35.6762, 139.6503)).toBe('JP'); // Tokyo
		expect(resolveCountry(43.0618, 141.3545)).toBe('JP'); // Sapporo
		expect(resolveCountry(26.2124, 127.6809)).toBe('JP'); // Naha
	});
});

describe('getGeoCapabilities JP', () => {
	it('marks JP as partial cadastre and partial protected areas (KSJ A10)', () => {
		const caps = getGeoCapabilities('JP');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('partial');
		expect(caps.municipality).toBe('partial');
		expect(caps.speciesProtection).toBe('partial');
	});
});

describe('JP legal / permits / species / viewer', () => {
	it('exposes Japan legal pack with fixed law hosts (no typo NXDOMAIN)', () => {
		const pack = getLegalContentPack('JP');
		expect(pack.country).toBe('JP');
		expect(pack.articles.length).toBeGreaterThanOrEqual(6);
		for (const article of pack.articles) {
			expect(article.url).not.toContain('japaneseese');
			expect(article.url).not.toMatch(/japaneseeselawtranslation/i);
		}
		expect(pack.articles.some((a) => a.url.includes('japaneselawtranslation.go.jp'))).toBe(true);
		expect(pack.articles.find((a) => a.id === 'jp_shinrin')?.url).toContain('laws.e-gov.go.jp');
		expect(pack.articles.find((a) => a.id === 'jp_rinya')?.url).toContain('rinya.maff.go.jp');
		expect(pack.speciesSourceName).toMatch(/MOE|指定植物|種の保存法/);
		expect(pack.speciesSearchBase).toMatch(/env\.go\.jp/);
		expect(pack.buildSpeciesSearchUrl?.('Pinus thunbergii')).toMatch(/env\.go\.jp/);
		expect(pack.buildSpeciesSearchUrl?.('Pinus thunbergii')).not.toContain('gbif.org');
	});

	it('keeps human review gate pending', () => {
		expect(JP_LEGAL_HUMAN_REVIEW.status).toBe('pending_human_review');
		expect(JP_LEGAL_SOURCES.every((row) => row.url && !row.url.includes('japaneseese'))).toBe(true);
	});

	it('resolves prefectures to MOE regional hubs without Google', () => {
		expect(resolveJpPrefecture('JP-13')).toBe('JP-13');
		expect(resolveJpPrefecture('Tokyo')).toBe('JP-13');
		expect(resolveJpPrefecture('北海道')).toBe('JP-01');

		const tokyo = getJpPermitLinks({ zoneType: 'crown_unverified', prefectureCode: 'JP-13' });
		expect(tokyo.find((l) => l.id === 'jp_touki')?.url).toContain('touki.or.jp');
		expect(tokyo.find((l) => l.id === 'jp_municipality')?.url).toContain('soumu.go.jp');
		expect(tokyo.find((l) => l.id === 'moe_kanto')?.url).toContain('kanto.env.go.jp');
		expect(tokyo.every((l) => !l.url.includes('google.com'))).toBe(true);
		expect(tokyo.every((l) => l.id !== 'jp_moe_parks')).toBe(true);

		const priv = getJpPermitLinks({ zoneType: 'private' });
		expect(priv[0]?.id).toBe('jp_touki');
		expect(priv.find((l) => l.id === 'jp_municipality')).toBeTruthy();

		const hokkaido = getJpPermitLinks({ zoneType: 'national_forest', prefectureCode: 'Hokkaido' });
		expect(hokkaido.find((l) => l.id === 'moe_hokkaido')?.url).toContain('hokkaido.env.go.jp');
		expect(hokkaido.find((l) => l.id === 'jp_forestry_agency')?.url).toContain('rinya.maff.go.jp');
		expect(hokkaido.every((l) => !l.url.includes('google.com'))).toBe(true);
	});

	it('maps crown_unverified tenure to unknown collect status', () => {
		expect(collectStatusForZone('crown_unverified')).toBe('unknown');
	});

	it('exposes GSI Maps viewer', () => {
		const link = getCadastreViewerLink('JP', 35.68, 139.65);
		expect(link?.label).toMatch(/GSI/i);
		expect(link?.url).toContain('maps.gsi.go.jp');
		expect(link?.url).toContain('35.68');
	});

	it('exposes MOE species pack with curated caution entries', () => {
		const pack = getSpeciesProtectionPack('JP');
		expect(pack?.country).toBe('JP');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/MOE|指定植物|種の保存法/);
		expect(pack?.entries.every((e) => e.level === 'caution')).toBe(true);
		expect(pack?.buildSourceUrl?.('Acer palmatum')).toMatch(/env\.go\.jp/);
		expect(pack?.buildSourceUrl?.('Acer palmatum')).not.toContain('gbif.org');
	});
});

describe('JP harvest zones', () => {
	it('maps Sapporo / Tokyo / Naha to distinct zones', () => {
		expect(resolveJpHarvestZone(43.06, 141.35)).toBe('jp_hokkaido');
		expect(resolveJpHarvestZone(35.68, 139.65)).toBe('jp_honshu');
		expect(resolveJpHarvestZone(26.21, 127.68)).toBe('jp_kyushu_okinawa');
	});

	it('matches Latin and display aliases', () => {
		expect(findJpHarvestWindows('Pinus thunbergii', 'jp_honshu').length).toBeGreaterThan(0);
		expect(findJpHarvestWindows('Zelkova serrata', 'jp_honshu').length).toBeGreaterThan(0);
		expect(findJpHarvestWindows('Acer palmatum', 'jp_honshu').length).toBeGreaterThan(0);
	});
});

describe('JP climate profiles', () => {
	it('does not leave key cities on accidental Europe-only defaults', () => {
		expect(resolveClimateProfile(43.06, 141.35)).toBe('boreal'); // Sapporo
		expect(resolveClimateProfile(35.68, 139.65)).toBe('temperate_oceanic'); // Tokyo coastal
		expect(resolveClimateProfile(36.5, 138.0)).toBe('continental'); // inland Honshu
		expect(resolveClimateProfile(26.21, 127.68)).toBe('subtropical'); // Naha
	});
});

describe('JP GDD species', () => {
	it('classifies common yamadori taxa', () => {
		expect(getSpeciesGddCategory('Japanese black pine')).toBe('montagnarde');
		expect(getSpeciesGddCategory('Zelkova')).toBe('foret');
		expect(getSpeciesGddCategory('Japanese maple')).toBe('foret');
		expect(isEvergreenSpecies('Pinus thunbergii')).toBe(true);
	});
});

describe('JP harvest calendar prior', () => {
	it('applies in-window / out-of-window for Tokyo black pine', () => {
		const winter = resolveHarvestCalendarPrior(
			'Japanese black pine',
			35.68,
			139.65,
			new Date('2026-01-15T12:00:00')
		);
		const summer = resolveHarvestCalendarPrior(
			'Pinus thunbergii',
			35.68,
			139.65,
			new Date('2026-07-15T12:00:00')
		);
		expect(winter).toEqual({ applicable: true, inWindow: true, monthsFromWindow: 0 });
		expect(summer.applicable).toBe(true);
		expect(summer.inWindow).toBe(false);
		expect(summer.monthsFromWindow).toBeGreaterThan(0);
	});
});

describe('JP bonsai autocomplete coverage', () => {
	it('includes JP species in priority search list', () => {
		expect(BONSAI_SPECIES_PRIORITY).toEqual(expect.arrayContaining([...BONSAI_SPECIES_JP]));
		expect(getBonsaiPriorityRank('Japanese black pine')).toBeLessThan(999);
		expect(speciesDisplayName('Zelkova', 'en')).toMatch(/Zelkova/i);
	});
});

describe('JP i18n UTF-8', () => {
	it('has no U+FFFD in English JP disclaimer, examples, and harvest keys', async () => {
		const en = await import('../../../messages/en.json');
		const note = en.default.veto_disclaimer_note_jp as string;
		const title = en.default.veto_species_examples_title_jp as string;
		const body = en.default.veto_species_examples_body_jp as string;
		const intro = en.default.veto_property_intro_jp as string;
		const harvestTitle = en.default.jp_harvest_calendar_title as string;
		for (const value of [note, title, body, intro, harvestTitle]) {
			expect(value).not.toContain('\uFFFD');
		}
		expect(note.toLowerCase()).toContain('moe');
		expect(note.toLowerCase()).toContain('no link authorizes');
		expect(body).toMatch(/クロマツ|指定植物|種の保存法/);
		expect(intro.toLowerCase()).toContain('nominatim');
	});
});
