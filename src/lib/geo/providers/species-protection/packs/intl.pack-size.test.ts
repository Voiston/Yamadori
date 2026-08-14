import { describe, expect, it } from 'vitest';
import {
	atSpeciesProtectionPack,
	beSpeciesProtectionPack,
	chSpeciesProtectionPack,
	deSpeciesProtectionPack,
	gbSpeciesProtectionPack,
	itSpeciesProtectionPack,
	nlSpeciesProtectionPack,
	noSpeciesProtectionPack,
	ptSpeciesProtectionPack,
	ieSpeciesProtectionPack,
	dkSpeciesProtectionPack,
	fiSpeciesProtectionPack,
	seSpeciesProtectionPack
} from '$lib/geo/providers/species-protection/packs/intl';
import { usSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/us';
import { caSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/ca';
import { nzSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/nz';
import { auSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/au';
import { jpSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/jp';
import { matchSpeciesProtectionEntry } from '$lib/geo/providers/species-protection/match';
import { atLegalPack } from '$lib/geo/legal/at';
import { beLegalPack } from '$lib/geo/legal/be';
import { chLegalPack } from '$lib/geo/legal/ch';
import { dkLegalPack } from '$lib/geo/legal/dk';
import { fiLegalPack } from '$lib/geo/legal/fi';
import { gbLegalPack } from '$lib/geo/legal/gb';
import { ieLegalPack } from '$lib/geo/legal/ie';
import { itLegalPack } from '$lib/geo/legal/it';
import { jpLegalPack } from '$lib/geo/legal/jp';
import { nlLegalPack } from '$lib/geo/legal/nl';
import { noLegalPack } from '$lib/geo/legal/no';
import { ptLegalPack } from '$lib/geo/legal/pt';
import { seLegalPack } from '$lib/geo/legal/se';

describe('EU species protection packs', () => {
	it('keeps DE pack at least 6 curated entries with FloraWeb source', () => {
		expect(deSpeciesProtectionPack.entries.length).toBeGreaterThanOrEqual(6);
		expect(deSpeciesProtectionPack.sourceName).toContain('FloraWeb');
	});

	it('keeps SE pack at least 8 curated entries with Artfakta source', () => {
		expect(seSpeciesProtectionPack.entries.length).toBeGreaterThanOrEqual(8);
		expect(seSpeciesProtectionPack.sourceName).toMatch(/Artfakta/i);
		expect(seSpeciesProtectionPack.buildSourceUrl('Taxus')).toContain('artfakta.se');
	});

	it.each([
		{
			pack: ptSpeciesProtectionPack,
			min: 8,
			source: /Flora-On/i,
			urlHost: 'flora-on.pt',
			localName: 'Medronheiro'
		},
		{
			pack: ieSpeciesProtectionPack,
			min: 8,
			source: /NBDC|Biodiversity Ireland/i,
			urlHost: 'biodiversityireland.ie',
			localName: 'Caithne'
		},
		{
			pack: dkSpeciesProtectionPack,
			min: 8,
			source: /Arter\.dk/i,
			urlHost: 'arter.dk',
			localName: 'Kristtorn'
		},
		{
			pack: fiSpeciesProtectionPack,
			min: 8,
			source: /Laji\.fi|FinBIF/i,
			urlHost: 'laji.fi',
			localName: 'Kataja'
		},
		{
			pack: chSpeciesProtectionPack,
			min: 8,
			source: /Info Flora/i,
			urlHost: 'infoflora.ch',
			localName: 'Buis'
		},
		{
			pack: atSpeciesProtectionPack,
			min: 8,
			source: /Biodiversitäts-Atlas|biodiversityatlas/i,
			urlHost: 'biodiversityatlas.at',
			localName: 'Buchs'
		},
		{
			pack: beSpeciesProtectionPack,
			min: 8,
			source: /Waarnemingen/i,
			urlHost: 'waarnemingen.be',
			localName: 'Gagel'
		},
		{
			pack: nlSpeciesProtectionPack,
			min: 8,
			source: /Verspreidingsatlas/i,
			urlHost: 'verspreidingsatlas.nl',
			localName: 'Dwergberk'
		},
		{
			pack: noSpeciesProtectionPack,
			min: 8,
			source: /Artsdatabanken/i,
			urlHost: 'artsdatabanken.no',
			localName: 'Nøkleblom'
		}
	])(
		'$pack.country pack has ≥$min entries, national source, and local match',
		({ pack, min, source, urlHost, localName }) => {
			expect(pack.coverage).toBe('partial');
			expect(pack.entries.length).toBeGreaterThanOrEqual(min);
			expect(pack.sourceName).toMatch(source);
			expect(pack.buildSourceUrl('Taxus')).toContain(urlHost);
			expect(pack.buildSourceUrl('Taxus')).not.toMatch(/^https:\/\/www\.gbif\.org/);
			const hit = matchSpeciesProtectionEntry(localName, pack.entries);
			expect(hit).not.toBeNull();
		}
	);
});

describe('legal packs species search aligned with protection packs', () => {
	it.each([
		[ptLegalPack, ptSpeciesProtectionPack],
		[ieLegalPack, ieSpeciesProtectionPack],
		[dkLegalPack, dkSpeciesProtectionPack],
		[fiLegalPack, fiSpeciesProtectionPack],
		[chLegalPack, chSpeciesProtectionPack],
		[atLegalPack, atSpeciesProtectionPack],
		[beLegalPack, beSpeciesProtectionPack],
		[nlLegalPack, nlSpeciesProtectionPack],
		[seLegalPack, seSpeciesProtectionPack],
		[noLegalPack, noSpeciesProtectionPack],
		[itLegalPack, itSpeciesProtectionPack],
		[gbLegalPack, gbSpeciesProtectionPack]
	] as const)('%s.country speciesSource matches pack', (legal, pack) => {
		expect(legal.speciesSourceName).toBe(pack.sourceName);
		expect(legal.buildSpeciesSearchUrl('Taxus baccata')).toBe(
			pack.buildSourceUrl('Taxus baccata')
		);
	});

	it('aligns JP legal species search with protection pack', () => {
		expect(jpLegalPack.speciesSourceName).toBe(jpSpeciesProtectionPack.sourceName);
		expect(jpLegalPack.buildSpeciesSearchUrl('Pinus thunbergii')).toBe(
			jpSpeciesProtectionPack.buildSourceUrl('Pinus thunbergii')
		);
	});
});

describe('GB / US / CA / NZ species protection packs', () => {
	it('keeps GB pack at least 6 curated entries with NBN source', () => {
		expect(gbSpeciesProtectionPack.entries.length).toBeGreaterThanOrEqual(6);
		expect(gbSpeciesProtectionPack.coverage).toBe('partial');
		expect(gbSpeciesProtectionPack.sourceName).toMatch(/NBN/i);
		expect(gbSpeciesProtectionPack.buildSourceUrl('Taxus')).toContain('nbnatlas');
	});

	it('keeps US pack at least 6 curated entries with ECOS source', () => {
		expect(usSpeciesProtectionPack.entries.length).toBeGreaterThanOrEqual(6);
		expect(usSpeciesProtectionPack.coverage).toBe('partial');
		expect(usSpeciesProtectionPack.buildSourceUrl('Pinus')).toContain('ecos.fws.gov');
	});

	it('keeps CA pack at least 6 curated entries with SARA source', () => {
		expect(caSpeciesProtectionPack.entries.length).toBeGreaterThanOrEqual(6);
		expect(caSpeciesProtectionPack.coverage).toBe('partial');
		expect(caSpeciesProtectionPack.buildSourceUrl('Butternut')).toMatch(
			/species-registry|canada\.ca/i
		);
	});

	it('keeps NZ pack at least 6 curated entries with NZPCN source', () => {
		expect(nzSpeciesProtectionPack.entries.length).toBeGreaterThanOrEqual(6);
		expect(nzSpeciesProtectionPack.coverage).toBe('partial');
		expect(nzSpeciesProtectionPack.buildSourceUrl('Kauri')).toMatch(/nzpcn\.org\.nz/i);
	});

	it('keeps AU pack at least 8 curated entries with ALA source', () => {
		expect(auSpeciesProtectionPack.entries.length).toBeGreaterThanOrEqual(8);
		expect(auSpeciesProtectionPack.coverage).toBe('partial');
		expect(auSpeciesProtectionPack.sourceName).toMatch(/ALA|EPBC/i);
		expect(auSpeciesProtectionPack.buildSourceUrl('Banksia')).toContain('ala.org.au');
	});

	it('keeps JP pack at least 8 curated entries with MOE source', () => {
		expect(jpSpeciesProtectionPack.entries.length).toBeGreaterThanOrEqual(8);
		expect(jpSpeciesProtectionPack.coverage).toBe('partial');
		expect(jpSpeciesProtectionPack.sourceName).toMatch(/MOE|指定植物|種の保存法/i);
		expect(jpSpeciesProtectionPack.buildSourceUrl('Pinus')).toContain('env.go.jp');
		expect(jpSpeciesProtectionPack.buildSourceUrl('Pinus')).not.toContain('gbif.org');
	});
});
