import { tick } from 'svelte';
import { isNativeApp } from '$lib/utils/platform';
import {
	ensureLocalEncryptionDefaultForNewInstalls,
	isLocalEncryptionEnabled,
	migrateLocalEncryption,
	refreshLocalEncryptionCache
} from '$lib/utils/secure-idb';
import * as m from '$lib/paraglide/messages.js';

const MIGRATION_TIMEOUT_MS = 120_000;

function withMigrationTimeout<T>(promise: Promise<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error('migration_timeout'));
		}, MIGRATION_TIMEOUT_MS);

		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			}
		);
	});
}

export function formatMigrationErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		if (error.message === 'migration_timeout') {
			return m.settings_local_encryption_migration_timeout();
		}
		if (error.message === 'migration_in_progress') {
			return m.settings_storage_locked();
		}
		if (error.message === 'local_encryption_native_only') {
			return m.settings_local_encryption_hint();
		}
		return error.message;
	}
	return m.settings_local_encryption_migration_failed();
}

export const securitySettingsState = $state({
	loaded: false,
	localEncryptionEnabled: false,
	migrationPending: false,
	migrationProgress: 0,
	migrationPhase: null as 'scan' | 'migrate' | 'finalize' | null,
	migrationCurrentKey: null as string | null,
	lastError: null as string | null
});

export async function initSecuritySettings(): Promise<void> {
	try {
		await ensureLocalEncryptionDefaultForNewInstalls();
	} catch (error) {
		console.error('ensureLocalEncryptionDefaultForNewInstalls failed:', error);
	}
	try {
		securitySettingsState.localEncryptionEnabled = await isLocalEncryptionEnabled();
	} catch {
		securitySettingsState.localEncryptionEnabled = false;
	} finally {
		securitySettingsState.loaded = true;
	}
}

export function isLocalEncryptionAvailable(): boolean {
	return isNativeApp();
}

export async function setLocalEncryptionEnabled(enabled: boolean): Promise<boolean> {
	if (!isLocalEncryptionAvailable()) {
		return false;
	}

	securitySettingsState.migrationPending = true;
	securitySettingsState.migrationProgress = 1;
	securitySettingsState.migrationPhase = null;
	securitySettingsState.migrationCurrentKey = null;
	securitySettingsState.lastError = null;

	try {
		await withMigrationTimeout(
			migrateLocalEncryption(enabled, async (progress) => {
				securitySettingsState.migrationProgress = progress.percent;
				securitySettingsState.migrationPhase = progress.phase;
				securitySettingsState.migrationCurrentKey = progress.currentKey ?? null;
				await tick();
			})
		);
		securitySettingsState.localEncryptionEnabled = enabled;
		refreshLocalEncryptionCache(enabled);
		return true;
	} catch (error) {
		securitySettingsState.lastError =
			error instanceof Error ? error.message : 'migration_failed';
		securitySettingsState.localEncryptionEnabled = await isLocalEncryptionEnabled();
		return false;
	} finally {
		securitySettingsState.migrationPending = false;
		securitySettingsState.migrationProgress = 0;
		securitySettingsState.migrationPhase = null;
		securitySettingsState.migrationCurrentKey = null;
	}
}
