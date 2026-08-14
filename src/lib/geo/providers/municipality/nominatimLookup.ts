import type { CountryCode } from '$lib/geo/countries';
import type { MunicipalityContact } from '$lib/geo/providers/municipality/types';
import { isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { isApiEnabled, getApiDisabledError } from '$lib/utils/apiPolicy';
import { nominatimReverseRaw, type NominatimAddress } from '$lib/utils/geocoding';

function pickLocality(address: NominatimAddress): string {
	for (const key of ['village', 'town', 'city', 'hamlet', 'municipality'] as const) {
		const value = address[key]?.trim();
		if (value) return value;
	}
	return address.county?.trim() || address.state?.trim() || '';
}

export type MunicipalityRole =
	| 'ayuntamiento'
	| 'comune'
	| 'gemeinde'
	| 'gemeente'
	| 'kommun'
	| 'kommune'
	| 'kunta'
	| 'council'
	| 'commune'
	| 'county'
	| 'mairie'
	| 'camara'
	| 'district'
	| 'shichoson';

const SEARCH_QUERIES: Record<MunicipalityRole, (name: string, cantonLabel?: string) => string> = {
	ayuntamiento: (name) => `ayuntamiento ${name}`,
	comune: (name) => `comune di ${name}`,
	gemeinde: (name) => `Gemeinde ${name}`,
	gemeente: (name) => `gemeente ${name}`,
	kommun: (name) => `kommun ${name} Sverige`,
	/** Default Norge; DK overrides via `country` in `searchWebsite`. */
	kommune: (name) => `kommune ${name} Norge`,
	kunta: (name) => `kunta ${name} Suomi`,
	council: (name) => `${name} council`,
	commune: (name, cantonLabel) =>
		cantonLabel
			? `Gemeinde OR commune ${name} ${cantonLabel} Schweiz`
			: `commune OR gemeente OR mairie ${name}`,
	county: (name) => `${name} county office OR city hall`,
	mairie: (name) => `mairie ${name}`,
	camara: (name) => `câmara municipal ${name} Portugal`,
	district: (name) => `${name} district council New Zealand OR city council`,
	shichoson: (name) => `${name} 役場 OR 市役所 Japan`
};

function searchWebsite(
	role: MunicipalityRole,
	name: string,
	options?: { cantonLabel?: string; country?: CountryCode }
): string {
	const cantonLabel = options?.cantonLabel;
	const query =
		role === 'kommune' && options?.country === 'DK'
			? `kommune ${name} Danmark`
			: SEARCH_QUERIES[role](name, cantonLabel);
	return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Best-effort municipality contact from Nominatim reverse + search link.
 * No phone numbers outside FR (no national directory wired).
 */
export async function lookupMunicipalityViaNominatim(
	latitude: number,
	longitude: number,
	role: MunicipalityRole,
	fallbackName: string,
	options?: { signal?: AbortSignal; cantonLabel?: string; country?: CountryCode }
): Promise<MunicipalityContact | null> {
	throwIfAborted(options?.signal);

	const nameFallback = fallbackName.trim();
	const cantonLabel = options?.cantonLabel?.trim() || undefined;
	const country = options?.country;
	const searchOpts = { cantonLabel, country };
	const coordsValid =
		Number.isFinite(latitude) &&
		Number.isFinite(longitude) &&
		Math.abs(latitude) <= 90 &&
		Math.abs(longitude) <= 180;

	if (!coordsValid || !isApiEnabled('nominatim')) {
		if (!nameFallback) return null;
		return {
			name: nameFallback,
			phoneDisplay: '',
			phoneTel: '',
			website: searchWebsite(role, nameFallback, searchOpts),
			fetchedAt: new Date().toISOString()
		};
	}

	try {
		const data = await nominatimReverseRaw(latitude, longitude, {
			signal: options?.signal,
			zoom: 14
		});
		const name = pickLocality(data?.address ?? {}) || fallbackName.trim();
		if (!name) return null;
		return {
			name,
			phoneDisplay: '',
			phoneTel: '',
			website: searchWebsite(role, name, searchOpts),
			fetchedAt: new Date().toISOString()
		};
	} catch (error) {
		if (isAbortError(error)) throw error;
		const name = fallbackName.trim();
		if (!name) return null;
		return {
			name,
			phoneDisplay: '',
			phoneTel: '',
			website: searchWebsite(role, name, searchOpts),
			fetchedAt: new Date().toISOString()
		};
	}
}

export function roleForCountry(country: CountryCode): MunicipalityRole {
	switch (country) {
		case 'ES':
			return 'ayuntamiento';
		case 'IT':
			return 'comune';
		case 'DE':
			return 'gemeinde';
		case 'AT':
			return 'gemeinde';
		case 'GB':
			return 'council';
		case 'IE':
			return 'council';
		case 'AU':
			return 'council';
		case 'CH':
			return 'commune';
		case 'BE':
			return 'commune';
		case 'NL':
			return 'gemeente';
		case 'SE':
			return 'kommun';
		case 'NO':
			return 'kommune';
		case 'DK':
			return 'kommune';
		case 'FI':
			return 'kunta';
		case 'US':
			return 'county';
		case 'CA':
			return 'county';
		case 'NZ':
			return 'district';
		case 'PT':
			return 'camara';
		case 'JP':
			return 'shichoson';
		default:
			return 'mairie';
	}
}

export { getApiDisabledError };
