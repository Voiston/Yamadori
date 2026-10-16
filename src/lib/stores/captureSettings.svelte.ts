import { get, set } from 'idb-keyval';
import {
	MAX_FAVORITE_SPECIES,
	normalizeFavoriteSpecies
} from '$lib/utils/species-suggestions';

const STORAGE_KEY = 'yamadori-capture-settings';

type StoredCaptureSettings = {
	terrainModeEnabled: boolean;
	speciesShortcutsEnabled: boolean;
	favoriteSpecies: string[];
};

const DEFAULT_SETTINGS: StoredCaptureSettings = {
	terrainModeEnabled: false,
	speciesShortcutsEnabled: true,
	favoriteSpecies: []
};

export const captureSettingsState = $state({
	loaded: false,
	terrainModeEnabled: DEFAULT_SETTINGS.terrainModeEnabled,
	speciesShortcutsEnabled: DEFAULT_SETTINGS.speciesShortcutsEnabled,
	favoriteSpecies: [...DEFAULT_SETTINGS.favoriteSpecies]
});

function parseFavoriteSpecies(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return normalizeFavoriteSpecies(value.filter((item): item is string => typeof item === 'string'));
}

function applySettings(settings: StoredCaptureSettings): void {
	captureSettingsState.terrainModeEnabled = settings.terrainModeEnabled;
	captureSettingsState.speciesShortcutsEnabled = settings.speciesShortcutsEnabled;
	captureSettingsState.favoriteSpecies = [...settings.favoriteSpecies];
}

function snapshot(): StoredCaptureSettings {
	return {
		terrainModeEnabled: captureSettingsState.terrainModeEnabled,
		speciesShortcutsEnabled: captureSettingsState.speciesShortcutsEnabled,
		favoriteSpecies: [...captureSettingsState.favoriteSpecies]
	};
}

async function persistSettings(): Promise<void> {
	await set(STORAGE_KEY, snapshot() satisfies StoredCaptureSettings);
}

export async function initCaptureSettings(): Promise<void> {
	try {
		const stored = await get<Partial<StoredCaptureSettings>>(STORAGE_KEY);
		if (stored) {
			applySettings({
				terrainModeEnabled: stored.terrainModeEnabled ?? DEFAULT_SETTINGS.terrainModeEnabled,
				speciesShortcutsEnabled:
					typeof stored.speciesShortcutsEnabled === 'boolean'
						? stored.speciesShortcutsEnabled
						: DEFAULT_SETTINGS.speciesShortcutsEnabled,
				favoriteSpecies: parseFavoriteSpecies(stored.favoriteSpecies)
			});
		}
	} catch {
		applySettings(DEFAULT_SETTINGS);
	} finally {
		captureSettingsState.loaded = true;
	}
}

export async function setTerrainModeEnabled(enabled: boolean): Promise<void> {
	captureSettingsState.terrainModeEnabled = enabled;
	await persistSettings();
}

export async function setSpeciesShortcutsEnabled(enabled: boolean): Promise<void> {
	captureSettingsState.speciesShortcutsEnabled = enabled;
	await persistSettings();
}

export async function setFavoriteSpecies(names: readonly string[]): Promise<void> {
	captureSettingsState.favoriteSpecies = normalizeFavoriteSpecies(names);
	await persistSettings();
}

export async function addFavoriteSpecies(name: string): Promise<boolean> {
	const [next] = normalizeFavoriteSpecies([name]);
	if (!next) {
		return false;
	}
	const current = normalizeFavoriteSpecies(captureSettingsState.favoriteSpecies);
	if (
		current.length >= MAX_FAVORITE_SPECIES ||
		current.some((item) => item.toLowerCase() === next.toLowerCase())
	) {
		return false;
	}
	const merged = normalizeFavoriteSpecies([...current, next]);
	if (merged.length === current.length) {
		return false;
	}
	captureSettingsState.favoriteSpecies = merged;
	await persistSettings();
	return true;
}

export async function removeFavoriteSpecies(name: string): Promise<void> {
	const key = name.trim().toLowerCase();
	captureSettingsState.favoriteSpecies = captureSettingsState.favoriteSpecies.filter(
		(item) => item.toLowerCase() !== key
	);
	await persistSettings();
}

export { DEFAULT_SETTINGS as DEFAULT_CAPTURE_SETTINGS };
