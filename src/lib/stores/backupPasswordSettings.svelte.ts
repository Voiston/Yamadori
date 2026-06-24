import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { del, get, set } from 'idb-keyval';
import {
	hashPasswordForVerification,
	verifyPassword
} from '$lib/utils/archive/crypto';
import { isNativeApp } from '$lib/utils/platform';

const CONFIG_STORAGE_KEY = 'yamadori-backup-password-config';
const SECURE_PASSWORD_KEY = 'yamadori-backup-export-password';
export const MAX_BACKUP_PASSWORD_HINT_LENGTH = 120;

type StoredBackupPasswordConfig = {
	configured: boolean;
	verifierSalt: string;
	verifierHash: string;
	hint?: string;
};

export const backupPasswordSettingsState = $state({
	loaded: false,
	configured: false,
	hint: null as string | null
});

let memoryPasswordCache: string | null = null;

function normalizeHint(hint?: string): string | undefined {
	const trimmed = hint?.trim();
	if (!trimmed) return undefined;
	return trimmed.slice(0, MAX_BACKUP_PASSWORD_HINT_LENGTH);
}

async function readConfig(): Promise<StoredBackupPasswordConfig | undefined> {
	return get<StoredBackupPasswordConfig>(CONFIG_STORAGE_KEY);
}

async function writeConfig(config: StoredBackupPasswordConfig | undefined): Promise<void> {
	if (!config) {
		await del(CONFIG_STORAGE_KEY);
		return;
	}
	await set(CONFIG_STORAGE_KEY, config);
}

async function storePasswordSecure(password: string): Promise<void> {
	memoryPasswordCache = password;
	if (!isNativeApp()) return;

	await SecureStoragePlugin.set({ key: SECURE_PASSWORD_KEY, value: password });
}

async function readPasswordSecure(): Promise<string | null> {
	if (memoryPasswordCache) return memoryPasswordCache;
	if (!isNativeApp()) return null;

	try {
		const { value } = await SecureStoragePlugin.get({ key: SECURE_PASSWORD_KEY });
		if (value) {
			memoryPasswordCache = value;
			return value;
		}
	} catch {
		return null;
	}

	return null;
}

async function clearPasswordSecure(): Promise<void> {
	memoryPasswordCache = null;
	if (!isNativeApp()) return;

	try {
		await SecureStoragePlugin.remove({ key: SECURE_PASSWORD_KEY });
	} catch {
		// Secure storage may already be empty.
	}
}

export async function initBackupPasswordSettings(): Promise<void> {
	try {
		const config = await readConfig();
		backupPasswordSettingsState.configured = config?.configured ?? false;
		backupPasswordSettingsState.hint = config?.hint ?? null;
		if (config?.configured) {
			await readPasswordSecure();
		}
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

export async function getBackupPasswordForExport(): Promise<string | null> {
	if (!backupPasswordSettingsState.configured) return null;
	return readPasswordSecure();
}

export async function setupBackupPassword(password: string, hint?: string): Promise<void> {
	const { salt, hash } = await hashPasswordForVerification(password);
	const normalizedHint = normalizeHint(hint);

	await storePasswordSecure(password);
	await writeConfig({
		configured: true,
		verifierSalt: salt,
		verifierHash: hash,
		hint: normalizedHint
	});

	backupPasswordSettingsState.configured = true;
	backupPasswordSettingsState.hint = normalizedHint ?? null;
}

export async function verifyBackupPassword(password: string): Promise<boolean> {
	const config = await readConfig();
	if (!config?.configured) return false;
	return verifyPassword(password, config.verifierSalt, config.verifierHash);
}

export async function changeBackupPassword(
	oldPassword: string,
	newPassword: string,
	hint?: string
): Promise<boolean> {
	if (!(await verifyBackupPassword(oldPassword))) return false;

	const { salt, hash } = await hashPasswordForVerification(newPassword);
	const normalizedHint = hint !== undefined ? normalizeHint(hint) : normalizeHint(backupPasswordSettingsState.hint ?? undefined);

	await storePasswordSecure(newPassword);
	await writeConfig({
		configured: true,
		verifierSalt: salt,
		verifierHash: hash,
		hint: normalizedHint
	});

	backupPasswordSettingsState.hint = normalizedHint ?? null;
	return true;
}

export async function removeBackupPassword(oldPassword: string): Promise<boolean> {
	if (!(await verifyBackupPassword(oldPassword))) return false;

	await clearPasswordSecure();
	await writeConfig(undefined);
	backupPasswordSettingsState.configured = false;
	backupPasswordSettingsState.hint = null;
	return true;
}

export async function resetBackupPasswordConfig(): Promise<void> {
	await clearPasswordSecure();
	await writeConfig(undefined);
	backupPasswordSettingsState.configured = false;
	backupPasswordSettingsState.hint = null;
}
