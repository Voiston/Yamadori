import { describe, expect, it } from 'vitest';
import {
	buildActaPlantarumSpeciesSearchUrl,
	buildBiodiversityAtlasAtSpeciesSearchUrl,
	buildNbnAtlasSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

describe('speciesSearchUrls (IT / GB / AT builders)', () => {
	it('returns FlorItaly base when Acta/FlorItaly query is empty', () => {
		expect(buildActaPlantarumSpeciesSearchUrl('')).toBe(SPECIES_SEARCH_BASE.floritaly);
		expect(buildActaPlantarumSpeciesSearchUrl('   ')).toBe(SPECIES_SEARCH_BASE.floritaly);
	});

	it('encodes FlorItaly basic_query for a taxon', () => {
		const url = buildActaPlantarumSpeciesSearchUrl('Taxus baccata');
		expect(url).toContain('dryades.units.it/floritaly');
		expect(url).toContain('procedure=basic_query');
		expect(url).toContain('query=Taxus');
		expect(url).toContain('baccata');
	});

	it('returns NBN Atlas base when query is empty', () => {
		expect(buildNbnAtlasSpeciesSearchUrl('')).toBe(SPECIES_SEARCH_BASE.nbnAtlas);
	});

	it('encodes NBN Atlas q param', () => {
		const url = buildNbnAtlasSpeciesSearchUrl('Ilex aquifolium');
		expect(url).toContain('species.nbnatlas.org/search');
		expect(url).toContain('q=Ilex');
		expect(url).toContain('aquifolium');
	});

	it('returns Biodiversitäts-Atlas AT base when query is empty', () => {
		expect(buildBiodiversityAtlasAtSpeciesSearchUrl('')).toBe(
			SPECIES_SEARCH_BASE.biodiversityAtlasAt
		);
	});

	it('encodes Biodiversitäts-Atlas AT q param (not FloraWeb)', () => {
		const url = buildBiodiversityAtlasAtSpeciesSearchUrl('Taxus baccata');
		expect(url).toContain('bie.biodiversityatlas.at/search');
		expect(url).toContain('q=Taxus');
		expect(url).not.toContain('floraweb.de');
	});
});
