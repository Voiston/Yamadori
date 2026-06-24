import { getBonsaiPriorityRank } from '$lib/constants/bonsai-species';
import { compareLocalized } from '$lib/utils/i18n/locale';

const MAX_RESULTS = 8;

export function normalizeSpeciesQuery(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '');
}

function sortByPriority(a: string, b: string): number {
	const diff = getBonsaiPriorityRank(a) - getBonsaiPriorityRank(b);
	return diff !== 0 ? diff : compareLocalized(a, b);
}

export function filterSpeciesDictionary(
	query: string,
	dictionary: readonly string[],
	maxResults = MAX_RESULTS
): string[] {
	const normalized = normalizeSpeciesQuery(query.trim());
	if (!normalized) {
		return [];
	}

	const prefixMatches: string[] = [];
	const containsMatches: string[] = [];

	for (const name of dictionary) {
		const normalizedName = normalizeSpeciesQuery(name);
		if (normalizedName.startsWith(normalized)) {
			prefixMatches.push(name);
		} else if (normalizedName.includes(normalized)) {
			containsMatches.push(name);
		}
	}

	prefixMatches.sort(sortByPriority);
	containsMatches.sort(sortByPriority);

	return [...prefixMatches, ...containsMatches].slice(0, maxResults);
}
