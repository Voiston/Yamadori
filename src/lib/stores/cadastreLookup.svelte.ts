import type { CadastreInfo } from '$lib/types/cadastre';
import { cadastreCacheKey, lookupCadastre } from '$lib/utils/cadastre';

export const cadastreLookup = $state({
	loading: false,
	data: null as CadastreInfo | null,
	error: '',
	latitude: null as number | null,
	longitude: null as number | null
});

let fetchInFlight = false;
let lastFetchKey = '';

export function resetCadastreLookup(): void {
	cadastreLookup.loading = false;
	cadastreLookup.data = null;
	cadastreLookup.error = '';
	cadastreLookup.latitude = null;
	cadastreLookup.longitude = null;
	lastFetchKey = '';
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

	if (!online) {
		cadastreLookup.loading = true;
		cadastreLookup.error = '';
		cadastreLookup.latitude = latitude;
		cadastreLookup.longitude = longitude;

		try {
			const data = await lookupCadastre(latitude, longitude);
			cadastreLookup.data = data;
			lastFetchKey = key;
			return data;
		} catch {
			return cadastreLookup.data;
		} finally {
			cadastreLookup.loading = false;
		}
	}

	if (fetchInFlight && key === lastFetchKey) {
		return cadastreLookup.data;
	}

	if (key === lastFetchKey && cadastreLookup.data && !cadastreLookup.loading) {
		return cadastreLookup.data;
	}

	fetchInFlight = true;
	lastFetchKey = key;
	cadastreLookup.loading = true;
	cadastreLookup.error = '';
	cadastreLookup.latitude = latitude;
	cadastreLookup.longitude = longitude;

	try {
		const data = await lookupCadastre(latitude, longitude);
		cadastreLookup.data = data;
		return data;
	} catch {
		cadastreLookup.data = null;
		cadastreLookup.error = 'lookup_failed';
		return null;
	} finally {
		cadastreLookup.loading = false;
		fetchInFlight = false;
	}
}
