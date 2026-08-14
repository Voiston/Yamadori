import type { CadastreInfo } from '$lib/types/cadastre';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Tailte Éireann / PRA parcel APIs are not freely available for field apps.
 * v1 uses Nominatim locality fallback without fabricating folio numbers
 * (same honesty as AT/SE).
 */
export function isInIeCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInCountryBboxes(latitude, longitude, 'IE');
}

async function reverseLocality(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ commune: string; county: string; adminCode: string }> {
	const data = await nominatimReverseRaw(latitude, longitude, { signal, zoom: 14 });
	const a = data?.address ?? {};
	const commune =
		a.village?.trim() ||
		a.town?.trim() ||
		a.city?.trim() ||
		a.municipality?.trim() ||
		a.suburb?.trim() ||
		a.county?.trim() ||
		'';
	const adminCode =
		a['ISO3166-2-lvl6']?.trim() ||
		a['ISO3166-2-lvl5']?.trim() ||
		a['ISO3166-2-lvl4']?.trim() ||
		'';
	return { commune, county: a.county?.trim() || '', adminCode };
}

/**
 * Ireland: locality-level CadastreInfo via Nominatim (no fake folio / parcel id).
 */
export async function lookupCadastreIe(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInIeCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const { commune, county, adminCode } = await reverseLocality(latitude, longitude, signal);
		if (!commune) return null;
		return {
			commune,
			section: county || '—',
			parcelNumber: '—',
			codeInsee: adminCode,
			zoneType: 'private',
			fetchedAt: new Date().toISOString()
		};
	} catch (error) {
		if (isAbortError(error)) throw error;
		return null;
	} finally {
		dispose();
	}
}
