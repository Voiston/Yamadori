import type { CadastreInfo } from '$lib/types/cadastre';
import { lookupCadastreForCoords } from '$lib/geo/providers/cadastre/dispatch';
import { cadastreCacheKey } from '$lib/utils/cadastre';
import { createInFlightMap } from '$lib/utils/inFlight';

export const cadastreLookup = $state({
	loading: false,
	data: null as CadastreInfo | null,
	error: '',
	latitude: null as number | null,
	longitude: null as number | null
});

let lastFetchKey = '';
const inFlight = createInFlightMap<CadastreInfo | null>();

export function resetCadastreLookup(): void {
	cadastreLookup.loading = false;
	cadastreLookup.data = null;
	cadastreLookup.error = '';
	cadastreLookup.latitude = null;
	cadastreLookup.longitude = null;
	lastFetchKey = '';
	inFlight.clear();
}

export async function resolveCadastre(
	latitude: number,
	longitude: number,
	online: boolean,
	stored: CadastreInfo | null = null
): Promise<CadastreInfo | null> {
	const key = cadastreCacheKey(latitude, longitude);

	if (stored) {
		cadastreLookup.loading = false;
		cadastreLookup.error = '';
		cadastreLookup.latitude = latitude;
		cadastreLookup.longitude = longitude;
		cadastreLookup.data = stored;
		lastFetchKey = key;
		return stored;
	}

	if (key === lastFetchKey && cadastreLookup.data && !cadastreLookup.loading && !inFlight.has(key)) {
		return cadastreLookup.data;
	}

	return inFlight.run(key, async () => {
		lastFetchKey = key;
		cadastreLookup.loading = true;
		cadastreLookup.error = '';
		cadastreLookup.latitude = latitude;
		cadastreLookup.longitude = longitude;

		try {
			const data = await lookupCadastreForCoords(latitude, longitude);
			cadastreLookup.data = data;
			return data;
		} catch {
			if (!online) {
				return cadastreLookup.data;
			}
			cadastreLookup.data = null;
			cadastreLookup.error = 'lookup_failed';
			return null;
		} finally {
			cadastreLookup.loading = false;
		}
	});
}
