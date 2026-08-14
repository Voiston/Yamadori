/**
 * Swiss canton helpers — ISO 3166-2 codes without the CH- prefix.
 */

export const SWISS_CANTON_CODES = [
	'ZH',
	'BE',
	'LU',
	'UR',
	'SZ',
	'OW',
	'NW',
	'GL',
	'ZG',
	'FR',
	'SO',
	'BS',
	'BL',
	'SH',
	'AR',
	'AI',
	'SG',
	'GR',
	'AG',
	'TG',
	'TI',
	'VD',
	'VS',
	'NE',
	'GE',
	'JU'
] as const;

export type SwissCantonCode = (typeof SWISS_CANTON_CODES)[number];

const CANTON_SET = new Set<string>(SWISS_CANTON_CODES);

/** Short display labels (language-neutral official forms). */
const CANTON_LABELS: Record<SwissCantonCode, string> = {
	ZH: 'Zürich',
	BE: 'Bern',
	LU: 'Luzern',
	UR: 'Uri',
	SZ: 'Schwyz',
	OW: 'Obwalden',
	NW: 'Nidwalden',
	GL: 'Glarus',
	ZG: 'Zug',
	FR: 'Fribourg',
	SO: 'Solothurn',
	BS: 'Basel-Stadt',
	BL: 'Basel-Landschaft',
	SH: 'Schaffhausen',
	AR: 'Appenzell Ausserrhoden',
	AI: 'Appenzell Innerrhoden',
	SG: 'St. Gallen',
	GR: 'Graubünden',
	AG: 'Aargau',
	TG: 'Thurgau',
	TI: 'Ticino',
	VD: 'Vaud',
	VS: 'Valais',
	NE: 'Neuchâtel',
	GE: 'Genève',
	JU: 'Jura'
};

/** Nominatim / free-text state names → canton code. */
const STATE_NAME_TO_CODE: Array<{ match: RegExp; code: SwissCantonCode }> = [
	{ match: /z[uü]rich|zurich/i, code: 'ZH' },
	{ match: /\bbern\b|berne/i, code: 'BE' },
	{ match: /luzern|lucerne/i, code: 'LU' },
	{ match: /\buri\b/i, code: 'UR' },
	{ match: /schwyz/i, code: 'SZ' },
	{ match: /obwalden/i, code: 'OW' },
	{ match: /nidwalden/i, code: 'NW' },
	{ match: /glarus/i, code: 'GL' },
	{ match: /\bzug\b/i, code: 'ZG' },
	{ match: /fribourg|freiburg/i, code: 'FR' },
	{ match: /solothurn|soleure/i, code: 'SO' },
	{ match: /basel[- ]?stadt|bâle[- ]?ville/i, code: 'BS' },
	{ match: /basel[- ]?land|bâle[- ]?campagne/i, code: 'BL' },
	{ match: /schaffhausen|schaffhouse/i, code: 'SH' },
	{ match: /appenzell[- ]?ausserrhoden|appenzell rhodes[- ]?ext/i, code: 'AR' },
	{ match: /appenzell[- ]?innerrhoden|appenzell rhodes[- ]?int/i, code: 'AI' },
	{ match: /st\.?\s*gallen|saint[- ]?gall/i, code: 'SG' },
	{ match: /graub[uü]nden|grisons/i, code: 'GR' },
	{ match: /aargau|argovie/i, code: 'AG' },
	{ match: /thurgau|thurgovie/i, code: 'TG' },
	{ match: /ticino|tessin/i, code: 'TI' },
	{ match: /\bvaud\b|waadt/i, code: 'VD' },
	{ match: /valais|wallis/i, code: 'VS' },
	{ match: /neuch[aâ]tel/i, code: 'NE' },
	{ match: /gen[eè]ve|geneva/i, code: 'GE' },
	{ match: /\bjura\b/i, code: 'JU' }
];

export function isSwissCantonCode(value: string): value is SwissCantonCode {
	return CANTON_SET.has(value.trim().toUpperCase());
}

export function swissCantonLabel(code: SwissCantonCode): string {
	return CANTON_LABELS[code];
}

/**
 * Normalize raw canton tokens from federal identify (`ak`, `kanton`) or
 * Nominatim ISO / state strings into a SwissCantonCode.
 */
export function parseSwissCantonCode(raw: string | null | undefined): SwissCantonCode | null {
	if (!raw) return null;
	const text = raw.trim();
	if (!text) return null;

	const isoMatch = text.match(/CH-([A-Z]{2})/i);
	if (isoMatch && isSwissCantonCode(isoMatch[1])) {
		return isoMatch[1].toUpperCase() as SwissCantonCode;
	}

	const upper = text.toUpperCase();
	if (isSwissCantonCode(upper)) return upper;

	for (const entry of STATE_NAME_TO_CODE) {
		if (entry.match.test(text)) return entry.code;
	}
	return null;
}

import { nominatimReverseRaw } from '$lib/utils/geocoding';

/**
 * Resolve canton from optional federal attributes, else Nominatim reverse.
 */
export async function resolveSwissCanton(
	latitude: number,
	longitude: number,
	options?: {
		signal?: AbortSignal;
		/** Prefer these tokens first (e.g. identify `ak` / `kanton`). */
		hints?: Array<string | null | undefined>;
		nominatimEnabled?: boolean;
	}
): Promise<SwissCantonCode | null> {
	for (const hint of options?.hints ?? []) {
		const fromHint = parseSwissCantonCode(hint ?? '');
		if (fromHint) return fromHint;
	}

	if (options?.nominatimEnabled === false) return null;

	try {
		const parseFromRaw = (addr: Record<string, string | undefined>) =>
			parseSwissCantonCode(addr['ISO3166-2-lvl4']) ||
			parseSwissCantonCode(addr.state) ||
			parseSwissCantonCode(addr.county);

		// Prefer shared zoom-14 reverse; zoom 8 only if canton tokens are missing.
		const at14 = await nominatimReverseRaw(latitude, longitude, {
			signal: options?.signal,
			zoom: 14
		});
		const from14 = parseFromRaw(at14?.address ?? {});
		if (from14) return from14;

		const at8 = await nominatimReverseRaw(latitude, longitude, {
			signal: options?.signal,
			zoom: 8
		});
		return parseFromRaw(at8?.address ?? {});
	} catch {
		return null;
	}
}
