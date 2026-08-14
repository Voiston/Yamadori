import type { CadastreInfo } from '$lib/types/cadastre';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Maanmittauslaitos kiinteistö APIs require an API key.
 * v1 uses Nominatim locality fallback without fabricating kiinteistötunnus
 * (same honesty as AT/SE/DK).
 */
export function isInFiCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInCountryBboxes(latitude, longitude, 'FI');
}

async function reverseLocality(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ commune: string; region: string; adminCode: string }> {
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
	return {
		commune,
		region: a.state?.trim() || a.county?.trim() || '',
		adminCode
	};
}

/**
 * Finland: locality-level CadastreInfo via Nominatim (no fake kiinteistötunnus).
 */
export async function lookupCadastreFi(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInFiCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const { commune, region, adminCode } = await reverseLocality(latitude, longitude, signal);
		if (!commune) return null;
		return {
			commune,
			section: region || '—',
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
