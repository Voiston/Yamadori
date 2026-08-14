import type { CadastreInfo } from '$lib/types/cadastre';
import { COUNTRY_BBOXES, pointInBbox } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Sweden: Fastighetsindelning / Lantmäteriet parcel APIs need Geotorget account.
 * v1 uses Nominatim locality without fabricating parcel numbers (pattern AT).
 */
export function isInSeCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInBbox(latitude, longitude, COUNTRY_BBOXES.SE);
}

async function reverseLocality(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ commune: string; state: string; adminCode: string }> {
	const data = await nominatimReverseRaw(latitude, longitude, { signal, zoom: 14 });
	const a = data?.address ?? {};
	const commune =
		a.village?.trim() ||
		a.town?.trim() ||
		a.city?.trim() ||
		a.municipality?.trim() ||
		a.county?.trim() ||
		'';
	const adminCode =
		a['ISO3166-2-lvl8']?.trim() ||
		a['ISO3166-2-lvl6']?.trim() ||
		a['ISO3166-2-lvl4']?.trim() ||
		'';
	return { commune, state: a.state?.trim() || '', adminCode };
}

export async function lookupCadastreSe(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInSeCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const { commune, state, adminCode } = await reverseLocality(latitude, longitude, signal);
		if (!commune) return null;
		return {
			commune,
			section: state || '—',
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
