import type { CountryCode } from '$lib/geo/countries';
import { resolveCountry } from '$lib/geo/resolveCountry';
import type { MunicipalityContact } from '$lib/geo/providers/municipality/types';
import { lookupMunicipalityFr } from '$lib/geo/providers/municipality/fr';
import { lookupMunicipalityIntl } from '$lib/geo/providers/municipality/intl';
import {
	lookupMunicipalityViaNominatim,
	roleForCountry
} from '$lib/geo/providers/municipality/nominatimLookup';
import { getApiDisabledError, isApiEnabled } from '$lib/utils/apiPolicy';

/**
 * FR uses Service-public annuaire; other countries use Nominatim locality + search link.
 */
export async function lookupMunicipalityNear(
	latitude: number,
	longitude: number,
	adminCodeOrCommune: string,
	options?: { signal?: AbortSignal }
): Promise<MunicipalityContact | null> {
	const country = resolveCountry(latitude, longitude);
	if (!country) return null;

	if (country === 'FR') {
		if (!isApiEnabled('servicePublicAnnuaire')) {
			throw new Error(getApiDisabledError('servicePublicAnnuaire'));
		}
		return lookupMunicipalityFr(adminCodeOrCommune, options);
	}

	if (!isApiEnabled('nominatim')) {
		throw new Error(getApiDisabledError('nominatim'));
	}

	return lookupMunicipalityIntl(
		country as Exclude<CountryCode, 'FR'>,
		latitude,
		longitude,
		adminCodeOrCommune,
		options
	);
}

export async function lookupMunicipalityForCountry(
	country: CountryCode | null,
	adminCode: string,
	options?: { signal?: AbortSignal }
): Promise<MunicipalityContact | null> {
	if (!country || !adminCode.trim()) return null;
	if (country === 'FR') {
		if (!isApiEnabled('servicePublicAnnuaire')) {
			throw new Error(getApiDisabledError('servicePublicAnnuaire'));
		}
		return lookupMunicipalityFr(adminCode, options);
	}
	if (!isApiEnabled('nominatim')) {
		throw new Error(getApiDisabledError('nominatim'));
	}
	return lookupMunicipalityViaNominatim(
		Number.NaN,
		Number.NaN,
		roleForCountry(country),
		adminCode,
		options
	);
}
