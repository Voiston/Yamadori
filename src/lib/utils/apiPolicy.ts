import * as m from '$lib/paraglide/messages.js';
import { apiSettingsState, type ApiService } from '$lib/stores/apiSettings.svelte';
import { onlineState } from '$lib/utils/online.svelte';

const DISABLED_MESSAGES: Record<ApiService, () => string> = {
	ignMap: () => m.api_disabled_ign_map(),
	ignCadastre: () => m.api_disabled_ign_cadastre(),
	ignProtectedAreas: () => m.api_disabled_ign_protected_areas(),
	openMeteoForecast: () => m.api_disabled_open_meteo_forecast(),
	openMeteoArchive: () => m.api_disabled_open_meteo_archive(),
	nominatim: () => m.api_disabled_nominatim(),
	servicePublicAnnuaire: () => m.api_disabled_service_public_annuaire()
};

export function isApiEnabled(service: ApiService): boolean {
	if (!apiSettingsState.loaded) {
		return false;
	}
	return apiSettingsState[service];
}

export function canUseApi(service: ApiService): boolean {
	return isApiEnabled(service) && onlineState.online;
}

export function getApiDisabledError(service: ApiService): string {
	return DISABLED_MESSAGES[service]();
}
