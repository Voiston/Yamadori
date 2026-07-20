import * as m from '$lib/paraglide/messages.js';
import { getApiDisabledError, isApiEnabled } from '$lib/utils/apiPolicy';
import type { Tree } from '$lib/types/tree';
import { getCachedGeocodeLabel, saveCachedGeocodeLabel, getCachedGeocodeRaw, saveCachedGeocodeRaw } from '$lib/utils/geocodingCache';
import { regionalApiCoordinates } from '$lib/utils/geo';
import { getAcceptLanguage } from '$lib/utils/i18n/locale';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { createInFlightMap } from '$lib/utils/inFlight';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'Yamadori/0.6.4 (bonsai field app)';
const MIN_REQUEST_INTERVAL_MS = 1_000;

export type NominatimAddress = {
	village?: string;
	town?: string;
	city?: string;
	hamlet?: string;
	municipality?: string;
	forest?: string;
	natural?: string;
	county?: string;
	state?: string;
	country_code?: string;
	[key: string]: string | undefined;
};

export type NominatimReverseResult = {
	display_name?: string;
	address?: NominatimAddress;
};

let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();
const rawInFlight = createInFlightMap<NominatimReverseResult | null>();

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

/**
 * Shared Nominatim reverse (1 req/s throttle + in-flight coalesce).
 * Returns null on soft failures; rethrows abort errors.
 */
export async function nominatimReverseRaw(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal; zoom?: number }
): Promise<NominatimReverseResult | null> {
	throwIfAborted(options?.signal);

	if (!isApiEnabled('nominatim')) {
		return null;
	}

	const { latitude: apiLat, longitude: apiLon } = regionalApiCoordinates(latitude, longitude);
	const zoom = options?.zoom ?? 14;
	const acceptLanguage = getAcceptLanguage();
	const inflightKey = `${apiLat.toFixed(2)}_${apiLon.toFixed(2)}:${zoom}:${acceptLanguage}`;

	const cachedRaw = await getCachedGeocodeRaw(apiLat, apiLon, zoom, acceptLanguage);
	if (cachedRaw) {
		return cachedRaw as NominatimReverseResult;
	}

	return rawInFlight.run(inflightKey, () =>
		throttleRequest(async () => {
			throwIfAborted(options?.signal);

			const cachedAgain = await getCachedGeocodeRaw(apiLat, apiLon, zoom, acceptLanguage);
			if (cachedAgain) {
				return cachedAgain as NominatimReverseResult;
			}

			const params = new URLSearchParams({
				lat: String(apiLat),
				lon: String(apiLon),
				format: 'json',
				addressdetails: '1',
				zoom: String(zoom),
				'accept-language': acceptLanguage
			});

			const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);

			try {
				const response = await fetch(`${NOMINATIM_URL}?${params}`, {
					signal,
					headers: {
						Accept: 'application/json',
						'Accept-Language': acceptLanguage,
						'User-Agent': USER_AGENT
					}
				});

				if (!response.ok) {
					return null;
				}

				const payload = (await response.json()) as NominatimReverseResult;
				await saveCachedGeocodeRaw(apiLat, apiLon, zoom, payload, acceptLanguage);
				return payload;
			} catch (error) {
				if (isAbortError(error)) throw error;
				return null;
			} finally {
				dispose();
			}
		})
	);
}

export async function reverseGeocode(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<string> {
	throwIfAborted(options?.signal);
	const { latitude: apiLat, longitude: apiLon } = regionalApiCoordinates(latitude, longitude);
	const cacheLang = getAcceptLanguage();
	const cached = await getCachedGeocodeLabel(apiLat, apiLon, cacheLang);
	if (cached) {
		return cached;
	}

	if (!navigator.onLine) {
		throw new Error(m.geocode_online_required());
	}

	if (!isApiEnabled('nominatim')) {
		throw new Error(getApiDisabledError('nominatim'));
	}

	const cachedAgain = await getCachedGeocodeLabel(apiLat, apiLon, cacheLang);
	if (cachedAgain) {
		return cachedAgain;
	}

	try {
		// Canonical reverse zoom 14 — shared with cadastre / municipality caches.
		let data = await nominatimReverseRaw(latitude, longitude, {
			signal: options?.signal,
			zoom: 14
		});
		let label = data?.address
			? formatAddressLabel(data.address, data.display_name)
			: null;

		// Zoom 18 only when the coarser reverse cannot produce a usable label.
		if (!label) {
			data = await nominatimReverseRaw(latitude, longitude, {
				signal: options?.signal,
				zoom: 18
			});
			label = data?.address
				? formatAddressLabel(data.address, data.display_name)
				: null;
		}

		if (!label) {
			throw new Error(m.geocode_not_found());
		}

		await saveCachedGeocodeLabel(apiLat, apiLon, label, cacheLang);
		return label;
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new Error(m.geocode_timeout());
		}
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(m.geocode_error());
	}
}
