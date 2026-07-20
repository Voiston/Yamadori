import type { MunicipalityContact } from '$lib/geo/providers/municipality/types';
import {
	lookupMunicipalityViaNominatim,
	roleForCountry
} from '$lib/geo/providers/municipality/nominatimLookup';
import type { CountryCode } from '$lib/geo/countries';
import { resolveSwissCanton, swissCantonLabel } from '$lib/geo/providers/ch/canton';
import { isApiEnabled } from '$lib/utils/apiPolicy';

export async function lookupMunicipalityIntl(
	country: CountryCode,
	latitude: number,
	longitude: number,
	fallbackName: string,
	options?: { signal?: AbortSignal }
): Promise<MunicipalityContact | null> {
	let cantonLabel: string | undefined;
	if (country === 'CH') {
		const canton = await resolveSwissCanton(latitude, longitude, {
			signal: options?.signal,
			nominatimEnabled: isApiEnabled('nominatim')
		});
		if (canton) cantonLabel = swissCantonLabel(canton);
	}

	return lookupMunicipalityViaNominatim(
		latitude,
		longitude,
		roleForCountry(country),
		fallbackName,
		{ ...options, cantonLabel }
	);
}
