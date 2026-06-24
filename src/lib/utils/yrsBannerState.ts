import type { YrsSnapshot } from '$lib/types/yrs';

export type YrsBannerDisplayState =
	| 'score'
	| 'calculating'
	| 'pending_offline'
	| 'gps_required'
	| 'waiting_gps'
	| 'unavailable';

export function resolveYrsBannerDisplayState(input: {
	yrs: YrsSnapshot | null;
	loading: boolean;
	gpsReady: boolean;
	online: boolean;
	fromCache: boolean;
	locationError: string;
}): YrsBannerDisplayState {
	if (input.yrs) {
		return 'score';
	}
	if (input.loading && input.gpsReady) {
		return 'calculating';
	}
	if (!input.online && input.gpsReady && !input.fromCache) {
		return 'pending_offline';
	}
	if (!input.gpsReady && input.locationError) {
		return 'gps_required';
	}
	if (input.gpsReady) {
		return 'unavailable';
	}
	return 'waiting_gps';
}
