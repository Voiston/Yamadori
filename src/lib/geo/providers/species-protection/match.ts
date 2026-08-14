import { normalizeSpeciesQuery } from '$lib/utils/species-filter';
import type { SpeciesProtectionEntry } from '$lib/geo/providers/species-protection/types';

const MIN_QUERY_LEN = 3;
const MIN_ALIAS_LEN = 4;
/** Prefer stronger overlap for short aliases (e.g. "daphne"). */
const MIN_SCORE = 0.55;

export function normalizeProtectionQuery(text: string): string {
	return normalizeSpeciesQuery(text)
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Match a free-text species against curated protection aliases.
 * Exact alias wins; otherwise best contains/contained score ≥ MIN_SCORE.
 */
export function matchSpeciesProtectionEntry(
	query: string,
	entries: readonly SpeciesProtectionEntry[]
): { entry: SpeciesProtectionEntry; matchedName: string } | null {
	const q = normalizeProtectionQuery(query);
	if (q.length < MIN_QUERY_LEN) return null;

	let best: { entry: SpeciesProtectionEntry; matchedName: string; score: number } | null = null;

	for (const entry of entries) {
		for (const name of entry.names) {
			const n = normalizeProtectionQuery(name);
			if (n.length < MIN_ALIAS_LEN && n !== q) continue;

			if (q === n) {
				return { entry, matchedName: name };
			}

			const contained = q.includes(n) || n.includes(q);
			if (!contained) continue;

			const score = Math.min(q.length, n.length) / Math.max(q.length, n.length);
			if (score < MIN_SCORE) continue;
			if (!best || score > best.score) {
				best = { entry, matchedName: name, score };
			}
		}
	}

	return best ? { entry: best.entry, matchedName: best.matchedName } : null;
}
