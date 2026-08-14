import type { CadastreInfo } from '$lib/types/cadastre';
import { COUNTRY_BBOXES, pointInBbox } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'Yamadori/0.7.8 (bonsai field app)';

/**
 * Kartverket open Eiendom API — parcel at point (no owner data, no token).
 * https://api.kartverket.no/eiendom/v1/punkt — koordsys 4258 = ETRS89 lat/lon.
 */
const EIENDOM_PUNKT_URL = 'https://api.kartverket.no/eiendom/v1/punkt';

export function isInNoCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInBbox(latitude, longitude, COUNTRY_BBOXES.NO);
}

type EiendomHit = {
	matrikkelnummertekst?: string;
	gardsnummer?: number;
	bruksnummer?: number;
	kommunenummer?: string;
	meterFraPunkt?: number;
};

type EiendomResponse = {
	eiendom?: EiendomHit[];
};

/**
 * Norway: nationwide matrikkel parcel text via Kartverket (no owner).
 */
export async function lookupCadastreNo(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInNoCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const params = new URLSearchParams({
		nord: String(latitude),
		ost: String(longitude),
		koordsys: '4258'
	});

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const response = await fetch(`${EIENDOM_PUNKT_URL}?${params}`, {
			signal,
			headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }
		});
		if (!response.ok) return null;

		const data = (await response.json()) as EiendomResponse;
		const hits = [...(data.eiendom ?? [])].sort(
			(a, b) => (a.meterFraPunkt ?? 999) - (b.meterFraPunkt ?? 999)
		);
		const best = hits[0];
		if (!best) return null;

		const parcelNumber =
			best.matrikkelnummertekst?.trim() ||
			(best.gardsnummer != null && best.bruksnummer != null
				? `${best.gardsnummer}/${best.bruksnummer}`
				: '');
		if (!parcelNumber) return null;

		const section =
			best.gardsnummer != null ? `gnr ${best.gardsnummer}` : (best.kommunenummer?.trim() ?? '');

		return {
			commune: '',
			section,
			parcelNumber,
			codeInsee: best.kommunenummer?.trim() ?? '',
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
