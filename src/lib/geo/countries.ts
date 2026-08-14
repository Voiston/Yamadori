export type CountryCode =
	| 'FR'
	| 'ES'
	| 'IT'
	| 'DE'
	| 'GB'
	| 'CH'
	| 'AT'
	| 'BE'
	| 'NL'
	| 'SE'
	| 'NO'
	| 'US'
	| 'CA'
	| 'NZ'
	| 'PT'
	| 'IE'
	| 'AU'
	| 'DK'
	| 'FI'
	| 'JP';

export const COUNTRY_CODES: CountryCode[] = [
	'FR',
	'ES',
	'IT',
	'DE',
	'GB',
	'CH',
	'AT',
	'BE',
	'NL',
	'SE',
	'NO',
	'US',
	'CA',
	'NZ',
	'PT',
	'IE',
	'AU',
	'DK',
	'FI',
	'JP'
];

export type BoundingBox = {
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
};

/**
 * Boîtes englobantes approximatives par pays — suffisantes pour un routage
 * grossier vers le bon fournisseur cadastral, pas pour tracer une frontière.
 */
export const COUNTRY_BBOXES: Record<CountryCode, BoundingBox> = {
	/** Métropole + Corse (hors DOM-TOM), aligné sur src/lib/utils/cadastre.ts. */
	FR: { minLat: 41, maxLat: 51.5, minLon: -5.5, maxLon: 10 },
	/**
	 * Espagne péninsulaire + Baléares. Canaries via EXTRA.
	 * minLon resserré pour ne plus englober le Portugal continental.
	 */
	ES: { minLat: 35.9, maxLat: 43.9, minLon: -9.35, maxLon: 4.5 },
	/** Italie continentale + Sicile + Sardaigne. */
	IT: { minLat: 35, maxLat: 47.5, minLon: 6.5, maxLon: 19 },
	/** Allemagne (hors enclaves). */
	DE: { minLat: 47, maxLat: 55.5, minLon: 5.5, maxLon: 15.5 },
	/**
	 * Grande-Bretagne (Angleterre, Pays de Galles, Écosse) + Hebrides.
	 * Irlande du Nord via COUNTRY_EXTRA_BBOXES. Overlap ROI géré dans resolveCountry.
	 */
	GB: { minLat: 49.8, maxLat: 61, minLon: -8.7, maxLon: 2 },
	/**
	 * Suisse — bbox serrée pour gagner face à FR/DE/IT via centeredness
	 * (Genève / Zurich / Tessin tombent sinon dans les boîtes voisines).
	 */
	CH: { minLat: 45.8, maxLat: 47.85, minLon: 5.9, maxLon: 10.55 },
	/**
	 * Autriche — bbox serrée pour gagner face à DE/IT/CH (Vienne / Tyrol / Carinthie).
	 */
	AT: { minLat: 46.35, maxLat: 49.05, minLon: 9.45, maxLon: 17.25 },
	/**
	 * Belgique — bbox serrée pour gagner face à FR/DE (Bruxelles / Anvers / Ardennes).
	 * Exclut grosso modo Lille (FR) et Aix-la-Chapelle (DE) ; Luxembourg hors boîte.
	 */
	BE: { minLat: 49.45, maxLat: 51.55, minLon: 2.5, maxLon: 6.5 },
	/**
	 * Pays-Bas — bbox serrée ; overlap BE (Flandre / Limburg) géré dans resolveCountry.
	 */
	NL: { minLat: 50.7, maxLat: 53.7, minLon: 3.2, maxLon: 7.4 },
	/**
	 * Suède — bbox large (Skåne → Norrland) ; exclut grosso modo DK/FI via resolve.
	 */
	SE: { minLat: 55.2, maxLat: 69.1, minLon: 10.5, maxLon: 24.2 },
	/**
	 * Norvège — bbox continentale (+ partiel) ; overlap SE géré dans resolveCountry.
	 */
	NO: { minLat: 57.9, maxLat: 71.2, minLon: 4.5, maxLon: 31.5 },
	/**
	 * USA — CONUS (48 États contigus). Alaska / Hawaii via COUNTRY_EXTRA_BBOXES.
	 */
	US: { minLat: 24.3, maxLat: 49.5, minLon: -125, maxLon: -66.5 },
	/**
	 * Canada — continent + zones sud (Point Pelee ~41.7). Yukon/NWT inclus.
	 * Overlap US géré dans resolveCountry (49e parallèle, Great Lakes, Alaska).
	 */
	CA: { minLat: 41.5, maxLat: 83.2, minLon: -141.2, maxLon: -52.0 },
	/**
	 * New Zealand — North + South Island (+ Stewart). Chatham via EXTRA.
	 */
	NZ: { minLat: -47.5, maxLat: -34.0, minLon: 166.0, maxLon: 179.0 },
	/**
	 * Portugal continental. Madère / Açores via COUNTRY_EXTRA_BBOXES.
	 * Overlap ES (Galice / Extremadure / Andalousie) géré dans resolveCountry.
	 */
	PT: { minLat: 36.9, maxLat: 42.2, minLon: -9.6, maxLon: -6.1 },
	/**
	 * Irlande (île entière, ROI + NI). Overlap GB / NI géré dans resolveCountry
	 * (Belfast / Derry → GB ; Dublin / Donegal → IE).
	 */
	IE: { minLat: 51.35, maxLat: 55.45, minLon: -10.7, maxLon: -5.85 },
	/**
	 * Australia — mainland + Tasmania. Lord Howe / Norfolk via EXTRA.
	 * Ocean gap to NZ (minLon 166) — no land-border helper needed.
	 */
	AU: { minLat: -44.0, maxLat: -10.0, minLon: 112.5, maxLon: 154.0 },
	/**
	 * Denmark — Jutland + Zealand / Funen (maxLon before Malmö).
	 * Bornholm via EXTRA. Overlap SE/DE géré dans resolveCountry.
	 */
	DK: { minLat: 54.5, maxLat: 57.8, minLon: 8.0, maxLon: 12.65 },
	/**
	 * Finland — mainland. Åland via EXTRA.
	 * Overlap SE (Gulf of Bothnia) / NO (Lapland) géré dans resolveCountry.
	 */
	FI: { minLat: 59.5, maxLat: 70.1, minLon: 19.5, maxLon: 31.6 },
	/**
	 * Japan — Honshu / Hokkaido / Kyushu / Shikoku (main islands).
	 * Okinawa / Ogasawara / remote islands via EXTRA.
	 * Kept east of Korea / west of open Pacific; no land-border helper needed.
	 */
	JP: { minLat: 30.2, maxLat: 45.6, minLon: 128.5, maxLon: 146.0 }
};

/**
 * Boîtes supplémentaires (territoires disjoints). `resolveCountry` les fusionne
 * avec la bbox principale.
 */
export const COUNTRY_EXTRA_BBOXES: Partial<Record<CountryCode, BoundingBox[]>> = {
	US: [
		/** Alaska (hors îles Aléoutiennes extrêmes). */
		{ minLat: 51, maxLat: 71.5, minLon: -180, maxLon: -129 },
		/** Hawaï (îles principales). */
		{ minLat: 18.8, maxLat: 22.4, minLon: -160.5, maxLon: -154.7 }
	],
	NZ: [
		/** Chatham Islands (antimeridian / eastern longitudes as negative). */
		{ minLat: -44.5, maxLat: -43.5, minLon: -177.0, maxLon: -175.5 }
	],
	ES: [
		/** Îles Canaries. */
		{ minLat: 27.5, maxLat: 29.5, minLon: -18.3, maxLon: -13.3 }
	],
	PT: [
		/** Madère + Porto Santo. */
		{ minLat: 32.4, maxLat: 33.2, minLon: -17.3, maxLon: -16.2 },
		/** Açores (groupe principal). */
		{ minLat: 36.9, maxLat: 39.8, minLon: -31.3, maxLon: -24.9 }
	],
	GB: [
		/**
		 * Irlande du Nord — explicite pour rester GB quand IE est aussi candidat.
		 * Donegal (ROI) reste départagé dans resolveIrelandUkBorder.
		 */
		{ minLat: 54.0, maxLat: 55.35, minLon: -8.25, maxLon: -5.4 }
	],
	AU: [
		/** Lord Howe Island. */
		{ minLat: -31.8, maxLat: -31.4, minLon: 159.0, maxLon: 159.2 },
		/** Norfolk Island (well west of NZ minLon 166). */
		{ minLat: -29.2, maxLat: -28.9, minLon: 167.8, maxLon: 168.1 }
	],
	DK: [
		/** Bornholm (east of Øresund / main DK maxLon). */
		{ minLat: 54.95, maxLat: 55.35, minLon: 14.65, maxLon: 15.25 }
	],
	FI: [
		/** Åland (west of mainland minLon 19.5). */
		{ minLat: 59.7, maxLat: 60.6, minLon: 19.3, maxLon: 21.4 }
	],
	JP: [
		/** Okinawa main island + nearby. */
		{ minLat: 24.0, maxLat: 27.2, minLon: 122.8, maxLon: 131.5 },
		/** Ogasawara (Bonin) — Chichijima area. */
		{ minLat: 26.5, maxLat: 27.2, minLon: 142.0, maxLon: 142.3 },
		/** Amami / northern Ryukyu gap north of Okinawa bbox. */
		{ minLat: 27.2, maxLat: 28.6, minLon: 128.0, maxLon: 130.5 }
	]
};

export function pointInBbox(latitude: number, longitude: number, bbox: BoundingBox): boolean {
	return (
		latitude >= bbox.minLat &&
		latitude <= bbox.maxLat &&
		longitude >= bbox.minLon &&
		longitude <= bbox.maxLon
	);
}

export function bboxArea(bbox: BoundingBox): number {
	return (bbox.maxLat - bbox.minLat) * (bbox.maxLon - bbox.minLon);
}

const CADASTRE_PROVIDER_COUNTRIES: ReadonlySet<CountryCode> = new Set([
	'FR',
	'ES',
	'IT',
	'DE',
	'GB',
	'CH',
	'AT',
	'BE',
	'NL',
	'SE',
	'NO',
	'US',
	'CA',
	'NZ',
	'PT',
	'IE',
	'AU',
	'DK',
	'FI',
	'JP'
]);

/** DE/GB/CH/AT/SE/US/CA/NZ/PT/IE/AU/DK/FI/JP are partial. BE/NL/NO are full. US/CA/NZ/AU = public tenure, not parcels. */
export function hasCadastreProvider(country: CountryCode | null): boolean {
	return country != null && CADASTRE_PROVIDER_COUNTRIES.has(country);
}

export type CadastreCoverageLevel = 'full' | 'partial' | 'none';

export function getCadastreCoverageLevel(country: CountryCode | null): CadastreCoverageLevel {
	if (
		country === 'FR' ||
		country === 'ES' ||
		country === 'IT' ||
		country === 'BE' ||
		country === 'NL' ||
		country === 'NO'
	) {
		return 'full';
	}
	if (
		country === 'DE' ||
		country === 'GB' ||
		country === 'CH' ||
		country === 'AT' ||
		country === 'SE' ||
		country === 'US' ||
		country === 'CA' ||
		country === 'NZ' ||
		country === 'PT' ||
		country === 'IE' ||
		country === 'AU' ||
		country === 'DK' ||
		country === 'FI' ||
		country === 'JP'
	) {
		return 'partial';
	}
	return 'none';
}

/** True when the point falls in the country's primary bbox or any extra bbox. */
export function pointInCountryBboxes(
	latitude: number,
	longitude: number,
	country: CountryCode
): boolean {
	if (pointInBbox(latitude, longitude, COUNTRY_BBOXES[country])) return true;
	const extras = COUNTRY_EXTRA_BBOXES[country];
	if (!extras) return false;
	return extras.some((bbox) => pointInBbox(latitude, longitude, bbox));
}
