import { get, set } from 'idb-keyval';
import * as m from '$lib/paraglide/messages.js';
import type { ParkingPosition } from '$lib/types/parking';
import type { GpsCapture } from '$lib/utils/geo';
import { toStorable } from '$lib/utils/idb-store';

const STORAGE_KEY = 'yamadori-parking';

export const parkingStore = $state({
	position: null as ParkingPosition | null,
	loaded: false,
	loadError: null as string | null
});

export async function initParking(): Promise<void> {
	try {
		const stored = await get<ParkingPosition>(STORAGE_KEY);
		parkingStore.position = stored ?? null;
		parkingStore.loadError = null;
	} catch (error) {
		console.error('initParking failed:', error);
		parkingStore.position = null;
		parkingStore.loadError = m.parking_load_error();
	} finally {
		parkingStore.loaded = true;
	}
}

async function persist(): Promise<void> {
	if (parkingStore.position === null) {
		await set(STORAGE_KEY, null);
		return;
	}
	await set(STORAGE_KEY, toStorable($state.snapshot(parkingStore.position)));
}

export async function saveParking(capture: GpsCapture): Promise<ParkingPosition | null> {
	if (capture.latitude === null || capture.longitude === null) {
		return null;
	}

	const position: ParkingPosition = {
		latitude: capture.latitude,
		longitude: capture.longitude,
		accuracyMeters: capture.accuracyMeters,
		savedAt: new Date().toISOString()
	};

	parkingStore.position = position;
	await persist();
	return position;
}

export async function clearParking(): Promise<void> {
	parkingStore.position = null;
	await persist();
}

export async function restoreParking(position: ParkingPosition | null): Promise<void> {
	parkingStore.position = position;
	await persist();
}
