import { get, set } from 'idb-keyval';
import type { ParkingPosition } from '$lib/types/parking';
import type { GpsCapture } from '$lib/utils/geo';
import { toStorable } from '$lib/utils/idb-store';

const STORAGE_KEY = 'yamadori-parking';

export const parkingStore = $state({
	position: null as ParkingPosition | null,
	loaded: false
});

export async function initParking(): Promise<void> {
	const stored = await get<ParkingPosition>(STORAGE_KEY);
	parkingStore.position = stored ?? null;
	parkingStore.loaded = true;
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
