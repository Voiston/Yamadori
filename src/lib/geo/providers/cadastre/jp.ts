import type { CadastreInfo } from '$lib/types/cadastre';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Japanese parcel registry (登記 / 地番) is not freely available for field apps.
 * v1 uses Nominatim locality fallback without fabricating chiban / parcel ids
 * (same honesty as IE/DK/AT/SE).
 */
export function isInJpCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInCountryBboxes(latitude, longitude, 'JP');
}

async function reverseLocality(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ commune: string; prefecture: string; adminCode: string }> {
	const data = await nominatimReverseRaw(latitude, longitude, { signal, zoom: 14 });
	const a = data?.address ?? {};
	const commune =
		a.city?.trim() ||
		a.town?.trim() ||
		a.village?.trim() ||
		a.municipality?.trim() ||
		a.suburb?.trim() ||
		a.county?.trim() ||
		'';
		const prefecture = a.state?.trim() || '';
	const adminCode =
		a['ISO3166-2-lvl4']?.trim() ||
		a['ISO3166-2-lvl5']?.trim() ||
		a['ISO3166-2-lvl6']?.trim() ||
		'';
	return { commune, prefecture, adminCode };
}

/**
 * Japan: locality-level CadastreInfo via Nominatim (no fake 地番).
 */
export async function lookupCadastreJp(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInJpCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const { commune, prefecture, adminCode } = await reverseLocality(latitude, longitude, signal);
		if (!commune) return null;
		return {
			commune,
			section: prefecture || '—',
			parcelNumber: '—',
			codeInsee: adminCode,
			zoneType: 'crown_unverified',
			fetchedAt: new Date().toISOString()
		};
	} catch (error) {
		if (isAbortError(error)) throw error;
		return null;
	} finally {
		dispose();
	}
}
