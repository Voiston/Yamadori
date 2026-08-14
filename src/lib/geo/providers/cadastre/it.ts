import type { CadastreInfo } from '$lib/types/cadastre';
import { COUNTRY_BBOXES, pointInBbox } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';

/**
 * Agenzia delle Entrate — cartografia catastale. Le service officiel n'expose
 * un point de requête que via WMS GetFeatureInfo (réponse HTML/XML fragile à
 * parser). Le visualiseur cartographique public utilise en réalité un
 * endpoint JSON non documenté (`getDatiOggetto`) qui renvoie directement les
 * attributs de la particule — plus robuste, on le préfère ici.
 * Ne couvre pas Trente et Bolzano (cadastre délégué aux provinces autonomes) :
 * l'API renvoie un tableau vide dans ce cas.
 */
const CATASTO_AJAX_URL = 'https://wms.cartografia.agenziaentrate.gov.it/inspire/ajax/ajax.php';

const FETCH_TIMEOUT_MS = 8_000;

export function isInItalyCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInBbox(latitude, longitude, COUNTRY_BBOXES.IT);
}

type CatastoOggetto = {
	SIGLA_PROV?: string;
	COD_COMUNE?: string;
	DENOM?: string;
	SEZIONE?: string;
	FOGLIO?: string;
	NUM_PART?: string;
};

function firstOggetto(data: unknown): CatastoOggetto | null {
	if (Array.isArray(data)) {
		return (data[0] as CatastoOggetto | undefined) ?? null;
	}
	if (data && typeof data === 'object') {
		return data as CatastoOggetto;
	}
	return null;
}

function parseCommune(denom: string): string {
	return denom.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export async function lookupCadastreIt(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInItalyCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const params = new URLSearchParams({
		op: 'getDatiOggetto',
		lon: String(longitude),
		lat: String(latitude)
	});

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);

	let oggetto: CatastoOggetto | null;
	try {
		const response = await fetch(`${CATASTO_AJAX_URL}?${params}`, { signal });
		if (!response.ok) return null;
		oggetto = firstOggetto(await response.json());
	} catch (error) {
		if (isAbortError(error)) throw error;
		return null;
	} finally {
		dispose();
	}

	const denom = oggetto?.DENOM?.trim();
	const foglio = oggetto?.FOGLIO?.trim();
	const numeroParticella = oggetto?.NUM_PART?.trim();
	const codComune = oggetto?.COD_COMUNE?.trim();

	if (!denom || !foglio || !numeroParticella) {
		return null;
	}

	const sezione = oggetto?.SEZIONE?.trim();
	const section = sezione ? `${sezione}${foglio}` : foglio;

	return {
		commune: parseCommune(denom),
		section,
		parcelNumber: numeroParticella,
		codeInsee: codComune ?? '',
		zoneType: 'private',
		fetchedAt: new Date().toISOString()
	};
}
