export const LEGIFRANCE_SEARCH_BASE = 'https://www.legifrance.gouv.fr/search/all';

export function buildLegifranceSearchUrl(query: string): string {
	const trimmed = query.trim();
	if (!trimmed) return LEGIFRANCE_SEARCH_BASE;
	const params = new URLSearchParams({
		tab_selection: 'code',
		searchField: 'ALL',
		query: trimmed,
		page: '1',
		init: 'true'
	});
	return `${LEGIFRANCE_SEARCH_BASE}?${params}`;
}
