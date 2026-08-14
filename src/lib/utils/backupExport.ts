import {
	appearanceSettingsState,
	initAppearanceSettings
} from '$lib/stores/appearanceSettings.svelte';
import {
	getApiSettingsSnapshot,
	initApiSettings
} from '$lib/stores/apiSettings.svelte';
import { parkingStore, initParking } from '$lib/stores/parking.svelte';
import { flushTreesPersist, initTrees, treeStore } from '$lib/stores/trees.svelte';
import {
	archiveFilename,
	buildArchive,
	deliverArchive,
	type ArchiveDeliveryMode,
	type ArchiveDeliveryResult
} from '$lib/utils/archive';
import { countTreesWithMissingPhotos } from '$lib/utils/archive/missingPhotos';
import { markBackupExported } from '$lib/utils/backupReminder.svelte';
import { getAppVersionLabel } from '$lib/utils/nativeInit';
import { loadTreesFromStorage } from '$lib/utils/tree-storage/repository';
import * as m from '$lib/paraglide/messages.js';
import pkg from '../../../package.json';

export type ExportAppBackupOptions = {
	password?: string;
	appVersion?: string;
};

export type ExportAppBackupOutcome = {
	delivery: ArchiveDeliveryResult;
	/** Always 0 on success — incomplete media aborts before deliver. */
	missingPhotoTrees: number;
};

export class IncompleteBackupExportError extends Error {
	readonly missingPhotoTrees: number;

	constructor(missingPhotoTrees: number) {
		super(
			m.settings_backup_export_missing_photos_warning({
				count: String(missingPhotoTrees)
			})
		);
		this.name = 'IncompleteBackupExportError';
		this.missingPhotoTrees = missingPhotoTrees;
	}
}

async function resolveAppVersion(): Promise<string> {
	const label = await getAppVersionLabel();
	return label ?? pkg.version;
}

export async function exportAppBackup(
	mode: ArchiveDeliveryMode,
	options?: ExportAppBackupOptions
): Promise<ExportAppBackupOutcome> {
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

	// Persist pending edits, then load full media from IndexedDB.
	// treeStore is thumbs-only after boot; exporting it would omit photos.
	await flushTreesPersist();
	const trees = await loadTreesFromStorage('full');

	const missingPhotoTrees = countTreesWithMissingPhotos(trees);
	if (missingPhotoTrees > 0) {
		console.warn(
			`[yamadori] export blocked: ${missingPhotoTrees} tree(s) have empty photo slots after full load`
		);
		throw new IncompleteBackupExportError(missingPhotoTrees);
	}

	const filename = archiveFilename();
	const appVersion = options?.appVersion ?? (await resolveAppVersion());
	const blob = await buildArchive(
		{
			trees,
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
	const delivery = await deliverArchive(blob, filename, mode);
	await markBackupExported(treeStore.trees, parkingStore.position);
	return { delivery, missingPhotoTrees: 0 };
}
