import { secureIdbDel, secureIdbGet, secureIdbSet } from '$lib/utils/secure-idb';
import {
	hashPasswordForVerification,
	verifyPasswordCompatible
} from '$lib/utils/archive/crypto';
import { isNativeApp } from '$lib/utils/platform';

const CONFIG_STORAGE_KEY = 'yamadori-backup-password-config';
/** Legacy key — cleared on init; password is no longer persisted in Secure Storage. */
const LEGACY_SECURE_PASSWORD_KEY = 'yamadori-backup-export-password';
export const MAX_BACKUP_PASSWORD_HINT_LENGTH = 120;

type StoredBackupPasswordConfig = {
	configured: boolean;
	verifierSalt: string;
	verifierHash: string;
	/** PBKDF2 iterations used for verifierHash (absent = legacy 100k). */
	verifierIterations?: number;
	hint?: string;
};

export const backupPasswordSettingsState = $state({
	loaded: false,
	configured: false,
	hint: null as string | null
});

function normalizeHint(hint?: string): string | undefined {
	const trimmed = hint?.trim();
	if (!trimmed) return undefined;
	return trimmed.slice(0, MAX_BACKUP_PASSWORD_HINT_LENGTH);
}

async function readConfig(): Promise<StoredBackupPasswordConfig | undefined> {
	return secureIdbGet<StoredBackupPasswordConfig>(CONFIG_STORAGE_KEY);
}

async function writeConfig(config: StoredBackupPasswordConfig | undefined): Promise<void> {
	if (!config) {
		await secureIdbDel(CONFIG_STORAGE_KEY);
		return;
	}
	await secureIdbSet(CONFIG_STORAGE_KEY, config);
}

async function clearLegacySecurePassword(): Promise<void> {
	if (!isNativeApp()) return;
	try {
		const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
		await SecureStoragePlugin.remove({ key: LEGACY_SECURE_PASSWORD_KEY });
	} catch {
		// Legacy entry may already be absent.
	}
}

/** @deprecated Password is not retained in memory; export prompts each time. */
export function cacheBackupPasswordForSession(_password: string): void {}

/** Clears any legacy in-memory password state (no-op with current policy). */
export function clearBackupPasswordMemoryCache(): void {}

export async function initBackupPasswordSettings(): Promise<void> {
	try {
		await clearLegacySecurePassword();
		const config = await readConfig();
		backupPasswordSettingsState.configured = config?.configured ?? false;
		backupPasswordSettingsState.hint = config?.hint ?? null;
	} catch {
		backupPasswordSettingsState.configured = false;
		backupPasswordSettingsState.hint = null;
	} finally {
		backupPasswordSettingsState.loaded = true;
	}
}

export function isBackupPasswordConfigured(): boolean {
	return backupPasswordSettingsState.configured;
}

export function getBackupPasswordHint(): string | null {
	return backupPasswordSettingsState.hint;
}

export async function setupBackupPassword(password: string, hint?: string): Promise<void> {
	const { salt, hash, iterations } = await hashPasswordForVerification(password);
	const normalizedHint = normalizeHint(hint);

	const nextConfig: StoredBackupPasswordConfig = {
		configured: true,
		verifierSalt: salt,
		verifierHash: hash,
		verifierIterations: iterations,
		hint: normalizedHint
	};

	await writeConfig(nextConfig);

	backupPasswordSettingsState.configured = true;
	backupPasswordSettingsState.hint = normalizedHint ?? null;
}

export async function verifyBackupPassword(password: string): Promise<boolean> {
	const config = await readConfig();
	if (!config?.configured) return false;
	return verifyPasswordCompatible(
		password,
		config.verifierSalt,
		config.verifierHash,
		config.verifierIterations
	);
}

export async function changeBackupPassword(
	oldPassword: string,
	newPassword: string,
	hint?: string
): Promise<boolean> {
	if (!(await verifyBackupPassword(oldPassword))) return false;

	const { salt, hash, iterations } = await hashPasswordForVerification(newPassword);
	const normalizedHint =
		hint !== undefined
			? normalizeHint(hint)
			: normalizeHint(backupPasswordSettingsState.hint ?? undefined);

	const nextConfig: StoredBackupPasswordConfig = {
		configured: true,
		verifierSalt: salt,
		verifierHash: hash,
		verifierIterations: iterations,
		hint: normalizedHint
	};

	await writeConfig(nextConfig);

	backupPasswordSettingsState.hint = normalizedHint ?? null;
	return true;
}

export async function removeBackupPassword(oldPassword: string): Promise<boolean> {
	if (!(await verifyBackupPassword(oldPassword))) return false;

	await writeConfig(undefined);
	backupPasswordSettingsState.configured = false;
	backupPasswordSettingsState.hint = null;
	return true;
}

export async function resetBackupPasswordConfig(): Promise<void> {
	await writeConfig(undefined);
	backupPasswordSettingsState.configured = false;
	backupPasswordSettingsState.hint = null;
}
