import { describe, expect, it } from 'vitest';
import { buildLegifranceSearchUrl, LEGIFRANCE_SEARCH_BASE } from './legifrance';

describe('buildLegifranceSearchUrl', () => {
	it('builds a code search URL with required parameters', () => {
		const url = buildLegifranceSearchUrl('article 552 du code civil');
		expect(url).toContain('tab_selection=code');
		expect(url).toContain('searchField=ALL');
		expect(url).toContain('page=1');
		expect(url).toContain('init=true');
	});

	it('encodes query with spaces, accents and hyphens', () => {
		const url = buildLegifranceSearchUrl('article L331-2 du code forestier');
		expect(url).toContain('query=article+L331-2+du+code+forestier');

		const penalUrl = buildLegifranceSearchUrl('article 311-1 du code pénal');
		expect(penalUrl).toContain('p%C3%A9nal');
	});

	it('returns base URL without parameters for empty query', () => {
		expect(buildLegifranceSearchUrl('')).toBe(LEGIFRANCE_SEARCH_BASE);
		expect(buildLegifranceSearchUrl('   ')).toBe(LEGIFRANCE_SEARCH_BASE);
	});
});
