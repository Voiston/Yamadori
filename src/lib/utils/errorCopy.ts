import * as m from '$lib/paraglide/messages.js';
import { isNativeApp } from '$lib/utils/platform';
import { UserFacingError, type ErrorAction, type ErrorCopy } from '$lib/utils/userFacingError';
import type { LocationPermissionStatus } from '$lib/utils/locationProvider';

export function retryAction(label = m.action_retry()): ErrorAction {
	return { label, kind: 'retry' };
}

export function settingsAction(): ErrorAction {
	return { label: m.error_action_open_settings(), kind: 'settings' };
}

export function importBackupAction(): ErrorAction {
	return {
		label: m.layout_init_error_import_action(),
		kind: 'link',
		href: '/settings#backup-import'
	};
}

export function goHomeAction(): ErrorAction {
	return { label: m.error_action_go_home(), kind: 'link', href: '/' };
}

export function continueAction(): ErrorAction {
	return { label: m.error_action_continue(), kind: 'dismiss' };
}

export function locationDeniedCopy(options?: { yrs?: boolean }): ErrorCopy {
	return {
		what: m.location_denied_what(),
		why: options?.yrs ? m.location_denied_yrs_why() : m.location_denied_why(),
		action: isNativeApp() ? settingsAction() : retryAction(),
		code: 'location_denied'
	};
}

export function locationUnavailableCopy(): ErrorCopy {
	return {
		what: m.location_unavailable_what(),
		why: m.location_unavailable_why(),
		action: retryAction(),
		code: 'location_unavailable'
	};
}

export function locationPreciseRequiredCopy(): ErrorCopy {
	return {
		what: m.location_precise_required_what(),
		why: m.location_precise_required_why(),
		action: isNativeApp() ? settingsAction() : retryAction(),
		code: 'location_precise'
	};
}

export function locationUnsupportedCopy(): ErrorCopy {
	return {
		what: m.location_unsupported_what(),
		why: m.location_unsupported_why(),
		action: continueAction(),
		code: 'location_unsupported'
	};
}

export function locationPermissionErrorCopy(status: LocationPermissionStatus): ErrorCopy {
	switch (status) {
		case 'coarse-only':
			return locationPreciseRequiredCopy();
		case 'prompt':
		case 'denied':
			return locationDeniedCopy();
		case 'unsupported':
			return locationUnsupportedCopy();
		default:
			return locationUnavailableCopy();
	}
}

export function geolocationErrorCopy(error: unknown): ErrorCopy {
	if (error instanceof UserFacingError) return error.copy;
	if (error && typeof error === 'object' && 'code' in error) {
		const code = Number((error as GeolocationPositionError).code);
		if (code === 1) return locationDeniedCopy();
		if (code === 2 || code === 3) return locationUnavailableCopy();
	}
	return locationUnavailableCopy();
}

export function captureSaveErrorCopy(): ErrorCopy {
	return {
		what: m.capture_save_error_what(),
		why: m.capture_save_error_why(),
		action: retryAction(),
		code: 'capture_save'
	};
}

export function photoFailedCopy(why?: string): ErrorCopy {
	return {
		what: m.photo_failed_what(),
		why: why ?? m.photo_failed_why(),
		action: retryAction(),
		code: 'photo_failed'
	};
}

export function climateErrorCopy(): ErrorCopy {
	return {
		what: m.climate_error_what(),
		why: m.climate_error_why(),
		action: retryAction(),
		code: 'climate'
	};
}

export function climateChunkErrorCopy(): ErrorCopy {
	return {
		what: m.climate_chunk_error_what(),
		why: m.climate_chunk_error_why(),
		action: retryAction(),
		code: 'climate_chunk'
	};
}

export function agriErrorCopy(): ErrorCopy {
	return {
		what: m.agri_error_what(),
		why: m.agri_error_why(),
		action: retryAction(),
		code: 'agri'
	};
}

export function mapDownloadFailedCopy(): ErrorCopy {
	return {
		what: m.map_download_failed_what(),
		why: m.map_download_failed_why(),
		action: retryAction(),
		code: 'map_download'
	};
}

export function mapTilesErrorCopy(): ErrorCopy {
	return {
		what: m.map_tiles_error_what(),
		why: m.map_tiles_error_why(),
		action: retryAction(),
		code: 'map_tiles'
	};
}

export function mapTilesCadastreErrorCopy(): ErrorCopy {
	return {
		what: m.map_tiles_error_cadastre_what(),
		why: m.map_tiles_error_why(),
		action: retryAction(),
		code: 'map_tiles_cadastre'
	};
}

export function mapTilesProtectedErrorCopy(): ErrorCopy {
	return {
		what: m.map_tiles_error_protected_what(),
		why: m.map_tiles_error_why(),
		action: retryAction(),
		code: 'map_tiles_protected'
	};
}

export function mapRecenterGpsCopy(): ErrorCopy {
	return locationUnavailableCopy();
}

export function compassTreeMissingCopy(): ErrorCopy {
	return {
		what: m.compass_tree_missing_what(),
		why: m.compass_tree_missing_why(),
		action: goHomeAction(),
		code: 'compass_tree_missing'
	};
}

export function compassParkingEmptyCopy(): ErrorCopy {
	return {
		what: m.compass_parking_empty_what(),
		why: m.compass_parking_empty_why(),
		action: { label: m.nav_map(), kind: 'link', href: '/map' },
		code: 'compass_parking_empty'
	};
}

export function voiceLoadErrorCopy(): ErrorCopy {
	return {
		what: m.voice_load_error_what(),
		why: m.voice_load_error_why(),
		action: retryAction(),
		code: 'voice_load'
	};
}

export function voiceStartErrorCopy(why?: string): ErrorCopy {
	return {
		what: m.voice_start_error_what(),
		why,
		action: retryAction(),
		code: 'voice_start'
	};
}

export function voiceStopErrorCopy(why?: string): ErrorCopy {
	return {
		what: m.voice_stop_error_what(),
		why,
		action: retryAction(),
		code: 'voice_stop'
	};
}

export function treeSaveFailedCopy(): ErrorCopy {
	return {
		what: m.tree_save_failed_what(),
		why: m.tree_save_failed_why(),
		action: retryAction(),
		code: 'tree_save'
	};
}

export function treeVoiceSaveFailedCopy(): ErrorCopy {
	return {
		what: m.tree_voice_save_failed_what(),
		why: m.tree_save_failed_why(),
		action: retryAction(),
		code: 'tree_voice_save'
	};
}

export function persistFailedCopy(): ErrorCopy {
	return {
		what: m.persist_failed_what(),
		why: m.persist_failed_why(),
		action: retryAction(),
		code: 'persist'
	};
}

export function parkingSaveFailedCopy(): ErrorCopy {
	return {
		what: m.parking_save_failed_what(),
		why: m.persist_failed_why(),
		action: retryAction(),
		code: 'parking_save'
	};
}

export function treesCorruptCopy(): ErrorCopy {
	return {
		what: m.store_trees_corrupt_what(),
		why: m.store_trees_corrupt_why(),
		action: importBackupAction(),
		code: 'trees_corrupt'
	};
}

export function encryptionKeyMissingCopy(): ErrorCopy {
	return {
		what: m.store_encryption_key_missing_what(),
		why: m.store_encryption_key_missing_why(),
		action: importBackupAction(),
		code: 'encryption_key_missing'
	};
}

export function parkingLoadErrorCopy(): ErrorCopy {
	return {
		what: m.parking_load_error_what(),
		why: m.parking_load_error_why(),
		action: retryAction(),
		code: 'parking_load'
	};
}

export function appCrashCopy(): ErrorCopy {
	return {
		what: m.app_crash_what(),
		why: m.app_crash_why(),
		action: goHomeAction(),
		code: 'app_crash'
	};
}

export function cadastreErrorCopy(): ErrorCopy {
	return {
		what: m.cadastre_error_what(),
		why: m.cadastre_error_why(),
		action: retryAction(),
		code: 'cadastre_error'
	};
}

export function cadastreEmptyCopy(): ErrorCopy {
	return {
		what: m.cadastre_empty_what(),
		why: m.cadastre_empty_why(),
		action: continueAction(),
		code: 'cadastre_empty'
	};
}

export function vetoScanErrorCopy(): ErrorCopy {
	return {
		what: m.veto_scan_error_what(),
		why: m.veto_scan_error_why(),
		action: retryAction(),
		code: 'veto_scan'
	};
}

export function vetoScanOfflineMissCopy(): ErrorCopy {
	return {
		what: m.veto_scan_offline_miss(),
		action: retryAction(),
		code: 'veto_scan_offline_miss'
	};
}

export function copyFailedCopy(): ErrorCopy {
	return {
		what: m.copy_failed_what(),
		why: m.copy_failed_why(),
		action: retryAction(),
		code: 'copy_failed'
	};
}

export function onboardingPermissionDeniedCopy(why: string): ErrorCopy {
	return {
		what: m.onboarding_permission_denied_what(),
		why,
		action: isNativeApp() ? settingsAction() : continueAction(),
		code: 'onboarding_denied'
	};
}

export function archiveWrongPasswordCopy(): ErrorCopy {
	return {
		what: m.archive_wrong_password(),
		why: m.archive_wrong_password_why(),
		action: retryAction(),
		code: 'archive_wrong_password'
	};
}

export function settingsBackupFailedCopy(): ErrorCopy {
	return {
		what: m.settings_backup_failed(),
		why: m.persist_failed_why(),
		action: retryAction(),
		code: 'settings_backup'
	};
}

export function settingsRestoreFailedCopy(): ErrorCopy {
	return {
		what: m.settings_restore_failed(),
		why: m.persist_failed_why(),
		action: retryAction(),
		code: 'settings_restore'
	};
}

export function treeDeleteFailedCopy(): ErrorCopy {
	return {
		what: m.tree_delete_failed(),
		why: m.persist_failed_why(),
		action: retryAction(),
		code: 'tree_delete'
	};
}
