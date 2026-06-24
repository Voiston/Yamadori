import { describe, expect, it } from 'vitest';
import {
	articlesForGroup,
	buildInpnSpeciesSearchUrl,
	getRegionalSpeciesHint,
	LEGAL_ARTICLES
} from './veto-legal';

describe('getRegionalSpeciesHint', () => {
	it('detects Pays de la Loire around Nantes', () => {
		expect(getRegionalSpeciesHint(47.218, -1.554)).toBe('pays_de_la_loire');
	});

	it('returns null outside regional bbox', () => {
		expect(getRegionalSpeciesHint(48.8566, 2.3522)).toBeNull();
	});
});

describe('buildInpnSpeciesSearchUrl', () => {
	it('adds species query when provided', () => {
		expect(buildInpnSpeciesSearchUrl('Pin sylvestre')).toContain('q=Pin');
	});

	it('returns base URL without species', () => {
		expect(buildInpnSpeciesSearchUrl('')).toBe(
			'https://inpn.mnhn.fr/accueil/recherche-de-donnees/especes'
		);
	});
});

describe('articlesForGroup', () => {
	it('groups property articles', () => {
		expect(articlesForGroup('property').map((a) => a.id)).toEqual(['cc_552', 'cc_547', 'cp_311_1']);
	});
});

describe('LEGAL_ARTICLES urls', () => {
	it('uses Légifrance search URLs instead of direct LEGIARTI links', () => {
		for (const article of LEGAL_ARTICLES) {
			expect(article.url).toContain('/search/all');
			expect(article.url).not.toContain('LEGIARTI');
		}
	});
});
