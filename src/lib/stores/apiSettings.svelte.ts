import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'yamadori-api-settings';

export type ApiService =
	| 'ignMap'
	| 'ignCadastre'
	| 'ignProtectedAreas'
	| 'openMeteoForecast'
	| 'openMeteoArchive'
	| 'nominatim'
	| 'servicePublicAnnuaire';

export type StoredApiSettings = Record<ApiService, boolean>;

export const API_SERVICES: ApiService[] = [
	'ignMap',
	'ignCadastre',
	'ignProtectedAreas',
	'openMeteoForecast',
	'openMeteoArchive',
	'nominatim',
	'servicePublicAnnuaire'
];

const DEFAULT_SETTINGS: StoredApiSettings = {
	ignMap: true,
	ignCadastre: true,
	ignProtectedAreas: true,
	openMeteoForecast: true,
	openMeteoArchive: true,
	nominatim: true,
	servicePublicAnnuaire: true
};

export const apiSettingsState = $state({
	loaded: false,
	ignMap: true,
	ignCadastre: true,
	ignProtectedAreas: true,
	openMeteoForecast: true,
	openMeteoArchive: true,
	nominatim: true,
	servicePublicAnnuaire: true
});

function applySettings(settings: StoredApiSettings): void {
	for (const service of API_SERVICES) {
		apiSettingsState[service] = settings[service];
	}
}

function readSnapshot(): StoredApiSettings {
	return {
		ignMap: apiSettingsState.ignMap,
		ignCadastre: apiSettingsState.ignCadastre,
		ignProtectedAreas: apiSettingsState.ignProtectedAreas,
		openMeteoForecast: apiSettingsState.openMeteoForecast,
		openMeteoArchive: apiSettingsState.openMeteoArchive,
		nominatim: apiSettingsState.nominatim,
		servicePublicAnnuaire: apiSettingsState.servicePublicAnnuaire
	};
}

export function getApiSettingsSnapshot(): StoredApiSettings {
	return readSnapshot();
}

export async function initApiSettings(): Promise<void> {
	try {
		const stored = await get<Partial<StoredApiSettings>>(STORAGE_KEY);
		if (stored) {
			applySettings({ ...DEFAULT_SETTINGS, ...stored });
		}
	} catch {
		applySettings(DEFAULT_SETTINGS);
	} finally {
		apiSettingsState.loaded = true;
	}
}

export async function setApiEnabled(service: ApiService, enabled: boolean): Promise<void> {
	apiSettingsState[service] = enabled;
	await set(STORAGE_KEY, readSnapshot() satisfies StoredApiSettings);
}

export async function restoreApiSettings(settings: Partial<StoredApiSettings>): Promise<void> {
	const merged = { ...DEFAULT_SETTINGS, ...settings };
	applySettings(merged);
	await set(STORAGE_KEY, merged);
}

export { DEFAULT_SETTINGS as DEFAULT_API_SETTINGS };
