import {
	COUNTRY_BBOXES,
	COUNTRY_CODES,
	pointInCountryBboxes,
	type CountryCode
} from '$lib/geo/countries';

export { hasCadastreProvider } from '$lib/geo/countries';

/**
 * Distance normalisée au centre de la boîte englobante d'un pays (0 = centre,
 * ~1 = bord). Sert uniquement à départager les points situés dans plusieurs
 * boîtes à la fois (zones frontalières type Alsace ou Riviera).
 */
function centeredness(latitude: number, longitude: number, country: CountryCode): number {
	const bbox = COUNTRY_BBOXES[country];
	const centerLat = (bbox.minLat + bbox.maxLat) / 2;
	const centerLon = (bbox.minLon + bbox.maxLon) / 2;
	const halfLat = (bbox.maxLat - bbox.minLat) / 2;
	const halfLon = (bbox.maxLon - bbox.minLon) / 2;

	const dLat = (latitude - centerLat) / halfLat;
	const dLon = (longitude - centerLon) / halfLon;
	return Math.sqrt(dLat * dLat + dLon * dLon);
}

export function resolveCountry(latitude: number, longitude: number): CountryCode | null {
	const matches = COUNTRY_CODES.filter((country) =>
		pointInCountryBboxes(latitude, longitude, country)
	);

	// JP mainland bbox is a rectangle over the Sea of Japan — drop false hits
	// on the Korean east coast / Russian Primorye (Vladivostok) before scoring.
	if (matches.includes('JP') && !isPlausibleJapanLand(latitude, longitude)) {
		matches.splice(
			0,
			matches.length,
			...matches.filter((country) => country !== 'JP')
		);
	}

	if (matches.length === 0) return null;

	// Legacy: Copenhagen / Zealand sat in loose SE bbox west of Øresund.
	// Prefer DK when present; otherwise still drop SE so the point is not Sweden.
	if (matches.includes('SE') && longitude < 12.65 && latitude < 56.05) {
		if (matches.includes('DK')) {
			matches.splice(0, matches.length, ...matches.filter((country) => country !== 'SE'));
		} else {
			matches.splice(0, matches.length, ...matches.filter((country) => country !== 'SE'));
		}
	}

	if (matches.length === 0) return null;
	if (matches.length === 1) return matches[0];

	// Tight country bboxes that overlap larger neighbours.
	if (matches.includes('CH')) return 'CH';

	// DK ↔ SE (Øresund) / DK ↔ DE (Schleswig).
	if (matches.includes('DK') && (matches.includes('SE') || matches.includes('DE'))) {
		return resolveDenmarkBorders(latitude, longitude, matches);
	}
	if (matches.includes('DK')) return 'DK';

	// BE ↔ NL overlap (Flanders vs Zeeland/Brabant/Limburg).
	// Antwerp-like (south-west) → BE; Dutch Brabant/Limburg → NL; Aachen → DE later.
	if (matches.includes('BE') && matches.includes('NL')) {
		const aachenish = longitude > 5.95 && latitude < 51.1;
		if (!aachenish && (latitude > 51.3 || longitude > 5.5)) return 'NL';
	}

	// BE overlaps northern FR (Lille) and western DE (Aachen); Luxembourg City
	// sits in the SE corner of a simple BE box. Prefer BE except those pockets.
	if (matches.includes('BE')) {
		const lillePocket = matches.includes('FR') && longitude < 3.2 && latitude > 50.5 && latitude < 50.8;
		const aachenPocket = matches.includes('DE') && longitude > 5.95 && latitude > 50.65;
		const luxembourgPocket = latitude < 49.7 && longitude > 5.9;
		if (!lillePocket && !aachenPocket && !luxembourgPocket) return 'BE';
		if (aachenPocket) return 'DE';
		const withoutBe = matches.filter((country) => country !== 'BE');
		if (withoutBe.length === 0) return 'BE';
		if (withoutBe.length === 1) return withoutBe[0];
		return withoutBe.reduce((closest, candidate) =>
			centeredness(latitude, longitude, candidate) < centeredness(latitude, longitude, closest)
				? candidate
				: closest
		);
	}

	// NL overlaps western DE (Aachen corridor); prefer DE there.
	if (matches.includes('NL')) {
		if (matches.includes('DE') && longitude > 5.95 && latitude > 50.65 && latitude < 51.1) {
			return 'DE';
		}
		return 'NL';
	}

	// AT overlaps Bavaria (DE) in a simple bbox. West-north of the Alpine crest
	// (Munich corridor) is Germany; prefer AT elsewhere when AT is a candidate.
	if (matches.includes('AT') && matches.includes('DE') && longitude < 12.9 && latitude > 47.8) {
		const withoutAt = matches.filter((country) => country !== 'AT');
		if (withoutAt.length === 1) return withoutAt[0];
		return withoutAt.reduce((closest, candidate) =>
			centeredness(latitude, longitude, candidate) < centeredness(latitude, longitude, closest)
				? candidate
				: closest
		);
	}
	if (matches.includes('AT')) return 'AT';

	// Skåne overlaps northern DE bbox — prefer SE.
	if (matches.includes('SE') && matches.includes('DE')) return 'SE';

	// FI ↔ SE (Bothnia / Torne) / FI ↔ NO (Lapland).
	if (matches.includes('FI') && (matches.includes('SE') || matches.includes('NO'))) {
		return resolveFinlandBorders(latitude, longitude, matches);
	}
	if (matches.includes('FI')) return 'FI';

	// SE ↔ NO border (Trøndelag / Jämtland / Oslo–Karlstad corridor).
	if (matches.includes('SE') && matches.includes('NO')) {
		return centeredness(latitude, longitude, 'NO') < centeredness(latitude, longitude, 'SE')
			? 'NO'
			: 'SE';
	}
	if (matches.includes('NO')) return 'NO';
	if (matches.includes('SE')) return 'SE';

	// US ↔ CA border (49th parallel west; Great Lakes / Detroit–Windsor; Alaska–Yukon).
	if (matches.includes('US') && matches.includes('CA')) {
		return resolveUsCanadaBorder(latitude, longitude);
	}
	if (matches.includes('CA')) return 'CA';
	if (matches.includes('US')) return 'US';

	// PT ↔ ES Iberian border (Galicia / Extremadura / Andalusia).
	if (matches.includes('PT') && matches.includes('ES')) {
		return resolvePortugalSpainBorder(latitude, longitude);
	}
	if (matches.includes('PT')) return 'PT';

	// IE ↔ GB / Northern Ireland (ROI vs NI pocket).
	if (matches.includes('IE') && matches.includes('GB')) {
		return resolveIrelandUkBorder(latitude, longitude);
	}
	if (matches.includes('IE')) return 'IE';

	return matches.reduce((closest, candidate) =>
		centeredness(latitude, longitude, candidate) < centeredness(latitude, longitude, closest)
			? candidate
			: closest
	);
}

/**
 * Disambiguate FI vs SE (Gulf of Bothnia / Torne) and FI vs NO (Lapland).
 * Approximate borders only — not cadastral.
 */
function resolveFinlandBorders(
	latitude: number,
	longitude: number,
	matches: CountryCode[]
): CountryCode {
	// Åland sits in SE's loose bbox; prefer FI when FI matches.
	if (
		matches.includes('FI') &&
		latitude >= 59.7 &&
		latitude <= 60.6 &&
		longitude >= 19.3 &&
		longitude <= 21.4
	) {
		return 'FI';
	}

	if (matches.includes('SE') && matches.includes('FI')) {
		// Torne valley: Haparanda (SE) west of ~24.15; Tornio (FI) east.
		if (latitude >= 65.5) {
			return longitude >= 24.15 ? 'FI' : 'SE';
		}
		// Swedish Bothnia coast (e.g. Umeå ~20.3) vs Finnish west coast (Turku ~22.3).
		if (longitude < 21.5) return 'SE';
		return 'FI';
	}

	if (matches.includes('NO') && matches.includes('FI')) {
		// Norwegian land border with Finland is only in the far north.
		// Southern / central Finland sits inside NO's loose continental bbox.
		if (latitude < 68.0) return 'FI';
		// Kirkenes / eastern Finnmark sits east of Finnish Lapland bulge.
		if (latitude >= 69.2 && longitude >= 28.5) return 'NO';
		return centeredness(latitude, longitude, 'FI') < centeredness(latitude, longitude, 'NO')
			? 'FI'
			: 'NO';
	}

	if (matches.includes('FI')) return 'FI';
	if (matches.includes('SE')) return 'SE';
	if (matches.includes('NO')) return 'NO';
	return 'FI';
}

/**
 * Disambiguate DK vs SE (Øresund) and DK vs DE (Schleswig).
 * Approximate borders only — not cadastral.
 */
function resolveDenmarkBorders(
	latitude: number,
	longitude: number,
	matches: CountryCode[]
): CountryCode {
	// East of Øresund → Sweden (Malmö / Helsingborg).
	if (matches.includes('SE') && longitude >= 12.65) return 'SE';

	// Swedish west coast across Kattegat (Halland / Bohuslän / Gothenburg).
	// Keep Danish islands west of ~11.7 (e.g. Anholt ~11.54) as DK.
	if (matches.includes('SE') && latitude >= 56.2 && longitude >= 11.7) return 'SE';

	// Flensburg corridor (DE) just south of the land border.
	if (
		matches.includes('DE') &&
		latitude < 54.85 &&
		longitude > 9.0 &&
		longitude < 9.75
	) {
		return 'DE';
	}

	if (matches.includes('DK')) return 'DK';
	if (matches.includes('SE')) return 'SE';
	if (matches.includes('DE')) return 'DE';
	return 'DK';
}

/**
 * Disambiguate IE/GB when both bboxes contain the point (island of Ireland).
 * Approximate border only — Belfast/Derry stay GB; Donegal/Dublin stay IE.
 */
function resolveIrelandUkBorder(latitude: number, longitude: number): CountryCode {
	// Eastern NI (Antrim / Down / Belfast).
	if (latitude >= 54.15 && latitude <= 55.3 && longitude >= -6.5 && longitude <= -5.4) {
		return 'GB';
	}
	// Derry city / north-central NI (exclude Donegal west of ~−7.5).
	if (latitude >= 54.7 && latitude <= 55.2 && longitude >= -7.45 && longitude <= -6.5) {
		return 'GB';
	}
	// Mid Ulster / Armagh corridor.
	if (latitude >= 54.15 && latitude <= 54.7 && longitude >= -7.5 && longitude <= -6.5) {
		return 'GB';
	}
	// Fermanagh / west Tyrone east of Donegal town.
	if (latitude >= 54.2 && latitude <= 54.65 && longitude >= -7.9 && longitude <= -7.5) {
		return 'GB';
	}
	return 'IE';
}

/**
 * Disambiguate PT/ES when both bboxes contain the point.
 * Approximate border only — not a cadastral boundary.
 */
function resolvePortugalSpainBorder(latitude: number, longitude: number): CountryCode {
	// Deep inside Portugal mainland → PT.
	if (longitude <= -8.2 && latitude >= 37 && latitude <= 42) return 'PT';
	// East of ~−6.9 along most of the border → usually Spain (Badajoz / Salamanca corridor).
	if (longitude >= -6.9) return 'ES';
	return centeredness(latitude, longitude, 'PT') < centeredness(latitude, longitude, 'ES')
		? 'PT'
		: 'ES';
}

/**
 * Disambiguate US/CA when both bboxes contain the point.
 * Approximate borders only — not a cadastral boundary.
 */
function resolveUsCanadaBorder(latitude: number, longitude: number): CountryCode {
	// Alaska (US extra) vs Yukon / NWT: east of ~141°W at high latitude → CA.
	if (latitude >= 54 && longitude <= -129 && longitude >= -180) {
		if (longitude >= -141 && latitude >= 59.5) return 'CA';
		if (longitude < -141) return 'US';
		// SE Alaska panhandle vs BC: coast south of ~59.5, west of Cascades → US when west of -130.
		if (latitude < 59.5 && longitude < -130) return 'US';
		return 'CA';
	}

	// Prairies / Rockies / Pacific: 49th parallel.
	if (longitude <= -95) {
		return latitude >= 49 ? 'CA' : 'US';
	}

	// Detroit River (Windsor CA is south of Detroit US).
	if (longitude >= -83.2 && longitude <= -82.85 && latitude >= 42.2 && latitude <= 42.45) {
		return latitude < 42.325 ? 'CA' : 'US';
	}

	// Niagara: Canadian side is generally north/west of the river (~43.08 N near falls).
	if (longitude >= -79.2 && longitude <= -78.85 && latitude >= 42.85 && latitude <= 43.2) {
		return latitude >= 43.08 ? 'CA' : 'US';
	}

	// Upper Great Lakes / Northern Ontario vs UP Michigan / Minnesota.
	if (longitude > -95 && longitude <= -82) {
		if (latitude >= 48) return 'CA';
		if (latitude < 46.5) return 'US';
	}

	// Eastern ON/QC vs NY/VT/ME — prefer CA north of ~45.
	if (longitude > -82) {
		if (latitude >= 45) return 'CA';
		if (latitude < 44) return 'US';
	}

	return centeredness(latitude, longitude, 'CA') < centeredness(latitude, longitude, 'US')
		? 'CA'
		: 'US';
}

/**
 * True for points that fall in JP bboxes and are plausibly Japanese land
 * (or nearshore), not the Korean east coast / Primorye rectangle false positives.
 * Okinawa / Amami / Ogasawara EXTRA bboxes are accepted as-is.
 */
function isPlausibleJapanLand(latitude: number, longitude: number): boolean {
	/** Ryukyu / Ogasawara extras — south of mainland minLat or far east. */
	if (latitude < 30.2 || longitude > 141.5) return true;

	/** Russian Primorye / northern Sea of Japan (e.g. Vladivostok) — Hokkaido is east of ~139.4. */
	if (latitude >= 41.0 && longitude < 139.4) return false;

	/** Korean peninsula east coast (e.g. Busan / Pohang) vs Kyushu / Tsushima. */
	if (latitude >= 33.0 && latitude <= 39.5 && longitude < 129.25) return false;

	return true;
}
