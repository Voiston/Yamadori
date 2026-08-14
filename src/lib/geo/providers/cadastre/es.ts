import type { CadastreInfo } from '$lib/types/cadastre';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';

/**
 * Sede Electrónica del Catastro — conversor de coordenadas (service public,
 * sans clé). Note : malgré la documentation officielle qui nomme les
 * paramètres `Coordenada_X`/`Coordenada_Y`, seul l'alias REST `CoorX`/`CoorY`
 * fonctionne réellement sur cet endpoint JSON.
 */
const CATASTRO_URLS = [
	'https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCoordenadas.svc/json/Consulta_RCCOOR',
	'http://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCoordenadas.svc/json/Consulta_RCCOOR'
];

const FETCH_TIMEOUT_MS = 8_000;

/** Peninsula, Balears, and Canarias (EXTRA bbox). */
export function isInSpainCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInCountryBboxes(latitude, longitude, 'ES');
}

type CatastroCoord = {
	pc?: { pc1?: string; pc2?: string };
	ldt?: string;
};

type CatastroResponse = {
	Consulta_RCCOORResult?: {
		coordenadas?: {
			coord?: CatastroCoord | CatastroCoord[];
		};
	};
	consulta_coordenadas?: {
		coordenadas?: {
			coord?: CatastroCoord | CatastroCoord[];
		};
	};
};

function firstCoord(coord: CatastroCoord | CatastroCoord[] | undefined): CatastroCoord | null {
	if (!coord) return null;
	return Array.isArray(coord) ? (coord[0] ?? null) : coord;
}

function extractCoord(data: CatastroResponse): CatastroCoord | null {
	return (
		firstCoord(data.Consulta_RCCOORResult?.coordenadas?.coord) ??
		firstCoord(data.consulta_coordenadas?.coordenadas?.coord)
	);
}

/**
 * Best-effort : l'adresse renvoyée (`ldt`) mélange voie et localité, par ex.
 * `"AV CERVANTES 12 CORDOBA (CÓRDOBA)"`. On isole la province entre
 * parenthèses puis on prend le texte suivant le dernier numéro de voie comme
 * nom de commune ; à défaut on retombe sur la province.
 */
function parseLocality(ldt: string): string {
	const provinceMatch = ldt.match(/\(([^)]+)\)\s*$/);
	const province = provinceMatch?.[1]?.trim() ?? '';
	const withoutProvince = provinceMatch ? ldt.slice(0, provinceMatch.index).trim() : ldt.trim();

	const afterHouseNumber = withoutProvince.match(/\d+\s*[-]?\s*([^\d]+)$/);
	const commune = (afterHouseNumber?.[1] ?? withoutProvince).trim();

	return commune || province;
}

async function fetchCoord(
	url: string,
	options?: { signal?: AbortSignal }
): Promise<CatastroCoord | null> {
	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);

	try {
		const response = await fetch(url, { signal });
		if (!response.ok) return null;
		const data = (await response.json()) as CatastroResponse;
		return extractCoord(data);
	} catch (error) {
		if (isAbortError(error)) throw error;
		return null;
	} finally {
		dispose();
	}
}

async function fetchCoordWithFallback(
	longitude: number,
	latitude: number,
	options?: { signal?: AbortSignal }
): Promise<CatastroCoord | null> {
	const params = new URLSearchParams({
		SRS: 'EPSG:4326',
		CoorX: String(longitude),
		CoorY: String(latitude)
	});

	for (const baseUrl of CATASTRO_URLS) {
		throwIfAborted(options?.signal);
		const coord = await fetchCoord(`${baseUrl}?${params}`, options);
		if (coord) return coord;
	}

	return null;
}

export async function lookupCadastreEs(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInSpainCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const coord = await fetchCoordWithFallback(longitude, latitude, options);
	const pc1 = coord?.pc?.pc1?.trim();
	const pc2 = coord?.pc?.pc2?.trim();
	if (!pc1 || !pc2) {
		return null;
	}

	const commune = coord?.ldt ? parseLocality(coord.ldt) : '';

	return {
		commune,
		section: pc2,
		parcelNumber: pc1,
		codeInsee: `${pc1}${pc2}`,
		zoneType: 'private',
		fetchedAt: new Date().toISOString(),
		collectStatus: 'owner_permission'
	};
}
