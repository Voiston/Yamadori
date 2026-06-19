import type { Tree } from '$lib/types/tree';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'Yamadori/0.0.1 (bonsai field app)';
const MIN_REQUEST_INTERVAL_MS = 1_000;

type NominatimAddress = {
	village?: string;
	town?: string;
	city?: string;
	hamlet?: string;
	municipality?: string;
	forest?: string;
	natural?: string;
	county?: string;
	state?: string;
};

type NominatimResponse = {
	display_name?: string;
	address?: NominatimAddress;
};

let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

function throttleRequest<T>(fn: () => Promise<T>): Promise<T> {
	const run = async (): Promise<T> => {
		const now = Date.now();
		const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastRequestAt));
		if (waitMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, waitMs));
		}
		lastRequestAt = Date.now();
		return fn();
	};

	const result = queue.then(run, run);
	queue = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}

function pickLocality(address: NominatimAddress): string | null {
	for (const key of [
		'village',
		'town',
		'city',
		'hamlet',
		'municipality',
		'forest',
		'natural'
	] as const) {
		const value = address[key];
		if (value?.trim()) {
			return value.trim();
		}
	}
	return null;
}

function pickRegion(address: NominatimAddress): string | null {
	const region = address.county?.trim() || address.state?.trim();
	return region || null;
}

export function formatAddressLabel(address: NominatimAddress, displayName?: string): string | null {
	const locality = pickLocality(address);
	const region = pickRegion(address);

	if (locality && region) {
		return `${locality}, ${region}`;
	}
	if (locality) {
		return locality;
	}
	if (region) {
		return region;
	}

	if (displayName?.trim()) {
		const firstSegment = displayName.split(',')[0]?.trim();
		if (firstSegment) {
			return firstSegment;
		}
	}

	return null;
}

export function formatLocationLabel(tree: Pick<Tree, 'locationLabel'>): string | null {
	return tree.locationLabel?.trim() || null;
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
	if (!navigator.onLine) {
		throw new Error('Connexion requise pour identifier le lieu.');
	}

	return throttleRequest(async () => {
		const params = new URLSearchParams({
			lat: String(latitude),
			lon: String(longitude),
			format: 'json',
			addressdetails: '1',
			'accept-language': 'fr'
		});

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const response = await fetch(`${NOMINATIM_URL}?${params}`, {
				signal: controller.signal,
				headers: {
					'Accept-Language': 'fr',
					'User-Agent': USER_AGENT
				}
			});

			if (!response.ok) {
				throw new Error('Impossible de récupérer le nom du lieu.');
			}

			const data = (await response.json()) as NominatimResponse;
			const label = data.address
				? formatAddressLabel(data.address, data.display_name)
				: null;

			if (!label) {
				throw new Error('Aucun lieu identifié pour ces coordonnées.');
			}

			return label;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				throw new Error('La requête de géocodage a expiré. Réessayez plus tard.');
			}
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Erreur lors du géocodage inverse.');
		} finally {
			clearTimeout(timeoutId);
		}
	});
}
