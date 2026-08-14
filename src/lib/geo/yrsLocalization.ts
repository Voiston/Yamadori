/**
 * Whether YRS interpretation is locally calibrated for this GPS point.
 * Weather inputs remain global (Open-Meteo); this flags threshold/calendar coverage.
 */

import { resolveCountry } from '$lib/geo/resolveCountry';

export type YrsLocalization = 'local' | 'generic';

/**
 * `local` — point falls in an app CountryCode (climate heuristics and/or harvest calendars).
 * `generic` — outside supported countries; Western-Europe defaults, no harvest prior.
 */
export function resolveYrsLocalization(latitude: number, longitude: number): YrsLocalization {
	return resolveCountry(latitude, longitude) ? 'local' : 'generic';
}
