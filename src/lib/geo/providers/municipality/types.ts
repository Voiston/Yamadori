import type { CountryCode } from '$lib/geo/countries';
import type { MairieContact } from '$lib/types/mairie-contact';

/** Alias kept for UI; same shape as French mairie contact. */
export type MunicipalityContact = MairieContact;

export type MunicipalityLookupResult = MunicipalityContact | null;

export type MunicipalityProvider = {
	country: CountryCode;
	lookup: (adminCode: string, options?: { signal?: AbortSignal }) => Promise<MunicipalityLookupResult>;
};
