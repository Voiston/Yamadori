import {
	appearanceSettingsState,
	initAppearanceSettings
} from '$lib/stores/appearanceSettings.svelte';
import {
	getApiSettingsSnapshot,
	initApiSettings
} from '$lib/stores/apiSettings.svelte';
import { parkingStore, initParking } from '$lib/stores/parking.svelte';
import { initTrees, treeStore } from '$lib/stores/trees.svelte';
import {
	archiveFilename,
	buildArchive,
	deliverArchive,
	type ArchiveDeliveryMode,
	type ArchiveDeliveryResult
} from '$lib/utils/archive';
import { markBackupExported } from '$lib/utils/backupReminder.svelte';
import { getAppVersionLabel } from '$lib/utils/nativeInit';
import pkg from '../../../package.json';

export type ExportAppBackupOptions = {
	password?: string;
	appVersion?: string;
};

async function resolveAppVersion(): Promise<string> {
	const label = await getAppVersionLabel();
	return label ?? pkg.version;
}

export async function exportAppBackup(
	mode: ArchiveDeliveryMode,
	options?: ExportAppBackupOptions
): Promise<ArchiveDeliveryResult> {
	if (!appearanceSettingsState.loaded) {
		await initAppearanceSettings();
	}
	if (!treeStore.loaded) {
		await initTrees();
	}
	if (!parkingStore.loaded) {
		await initParking();
	}
	await initApiSettings();

	const filename = archiveFilename();
	const appVersion = options?.appVersion ?? (await resolveAppVersion());
	const blob = await buildArchive(
		{
			trees: treeStore.trees,
			parking: parkingStore.position,
			appearanceSettings: {
				outdoorMode: appearanceSettingsState.outdoorMode,
				darkMode: appearanceSettingsState.darkMode,
				simpleMode: appearanceSettingsState.simpleMode,
				locale: appearanceSettingsState.locale
			},
			apiSettings: getApiSettingsSnapshot(),
			appVersion
		},
		{ password: options?.password }
	);
	const result = await deliverArchive(blob, filename, mode);
	await markBackupExported(treeStore.trees, parkingStore.position);
	return result;
}
