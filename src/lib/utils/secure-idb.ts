import { del, get, keys, set } from 'idb-keyval';
import { Preferences } from '@capacitor/preferences';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import {
	TREE_STORAGE_SENSITIVE_KEYS,
	TREE_STORAGE_SENSITIVE_PREFIXES
} from '$lib/utils/tree-storage/types';
import {
	base64ToBytes,
	decryptPayload,
	encryptPayload,
	generateArchiveKeyMaterial,
	ivToBase64
} from '$lib/utils/archive/crypto';
import { isNativeApp } from '$lib/utils/platform';

const PREF_KEY_ENABLED = 'yamadori-local-encryption-enabled';
const SECURE_KEY = 'yamadori-local-encryption-key';

export const SENSITIVE_IDB_KEYS = [
	'yamadori-trees',
	'yamadori-parking',
	'yamadori-backup-password-config',
	'yamadori-backup-reminder',
	'yamadori-location-settings',
	...TREE_STORAGE_SENSITIVE_KEYS
] as const;

async function listSensitiveStorageKeys(): Promise<string[]> {
	const discovered = new Set<string>(SENSITIVE_IDB_KEYS);
	const allKeys = await keys();
	for (const key of allKeys) {
		if (typeof key !== 'string') continue;
		if (TREE_STORAGE_SENSITIVE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
			discovered.add(key);
		}
	}
	return [...discovered];
}

type EncryptedEnvelope = {
	__yamadori_enc_v1: true;
	iv: string;
	ciphertext: string;
};

let encryptionEnabledCache: boolean | null = null;
let cachedKeyMaterial: Uint8Array | undefined;
let migrationInProgress = false;

function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as EncryptedEnvelope).__yamadori_enc_v1 === true &&
		typeof (value as EncryptedEnvelope).iv === 'string' &&
		typeof (value as EncryptedEnvelope).ciphertext === 'string'
	);
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

async function readEncryptionEnabledPref(): Promise<boolean> {
	try {
		const { value } = await Preferences.get({ key: PREF_KEY_ENABLED });
		return value === 'true';
	} catch {
		return false;
	}
}

async function writeEncryptionEnabledPref(enabled: boolean): Promise<void> {
	await Preferences.set({ key: PREF_KEY_ENABLED, value: enabled ? 'true' : 'false' });
	encryptionEnabledCache = enabled;
}

export function refreshLocalEncryptionCache(enabled: boolean): void {
	encryptionEnabledCache = enabled;
}

export async function isLocalEncryptionEnabled(): Promise<boolean> {
	if (encryptionEnabledCache !== null) {
		return encryptionEnabledCache;
	}
	encryptionEnabledCache = await readEncryptionEnabledPref();
	return encryptionEnabledCache;
}

export function isLocalEncryptionEnabledSync(): boolean {
	return encryptionEnabledCache ?? false;
}

export function isMigrationInProgress(): boolean {
	return migrationInProgress;
}

export const MIGRATION_IN_PROGRESS_ERROR = 'migration_in_progress';
export const LOCAL_ENCRYPTION_KEY_MISSING_ERROR = 'local_encryption_key_missing';

export function isLocalEncryptionKeyMissingError(error: unknown): boolean {
	return error instanceof Error && error.message === LOCAL_ENCRYPTION_KEY_MISSING_ERROR;
}

export function assertSensitiveStorageWritable(): void {
	if (migrationInProgress) {
		throw new Error(MIGRATION_IN_PROGRESS_ERROR);
	}
}

export function isMigrationBlockedError(error: unknown): boolean {
	return error instanceof Error && error.message === MIGRATION_IN_PROGRESS_ERROR;
}

async function getEncryptionKeyMaterial(): Promise<Uint8Array | null> {
	if (!isNativeApp()) return null;
	if (cachedKeyMaterial !== undefined) {
		return cachedKeyMaterial;
	}

	try {
		const { value } = await SecureStoragePlugin.get({ key: SECURE_KEY });
		if (value) {
			cachedKeyMaterial = base64ToBytes(value);
			return cachedKeyMaterial;
		}
	} catch {
		return null;
	}

	return null;
}

async function getOrCreateEncryptionKeyMaterial(): Promise<Uint8Array> {
	const existing = await getEncryptionKeyMaterial();
	if (existing) return existing;

	const material = generateArchiveKeyMaterial();
	await SecureStoragePlugin.set({
		key: SECURE_KEY,
		value: bytesToBase64(material)
	});
	cachedKeyMaterial = material;
	return material;
}

async function clearEncryptionKeyMaterial(): Promise<void> {
	if (!isNativeApp()) return;

	try {
		await SecureStoragePlugin.remove({ key: SECURE_KEY });
	} catch {
		// Already cleared.
	}
	cachedKeyMaterial = undefined;
}

async function encryptValue(plaintext: string, keyMaterial: Uint8Array): Promise<EncryptedEnvelope> {
	const { ciphertext, iv } = await encryptPayload(plaintext, keyMaterial);
	return {
		__yamadori_enc_v1: true,
		iv: ivToBase64(iv),
		ciphertext: bytesToBase64(ciphertext)
	};
}

async function decryptValue<T>(envelope: EncryptedEnvelope, keyMaterial: Uint8Array): Promise<T> {
	const plaintext = await decryptPayload(
		base64ToBytes(envelope.ciphertext),
		base64ToBytes(envelope.iv),
		keyMaterial
	);
	return JSON.parse(plaintext) as T;
}

async function resolvePlaintext<T>(raw: unknown, keyMaterial: Uint8Array | null): Promise<T> {
	if (!isEncryptedEnvelope(raw)) {
		return raw as T;
	}
	if (!keyMaterial) {
		throw new Error('local_encryption_key_missing');
	}
	return decryptValue<T>(raw, keyMaterial);
}

export async function secureIdbGet<T>(key: string): Promise<T | undefined> {
	const raw = await get<unknown>(key);
	if (raw === undefined) return undefined;

	const enabled = await isLocalEncryptionEnabled();
	if (!enabled || !isEncryptedEnvelope(raw)) {
		return raw as T;
	}

	const keyMaterial = await getEncryptionKeyMaterial();
	if (!keyMaterial) {
		throw new Error(LOCAL_ENCRYPTION_KEY_MISSING_ERROR);
	}
	return decryptValue<T>(raw, keyMaterial);
}

export async function secureIdbSet<T>(key: string, value: T): Promise<void> {
	assertSensitiveStorageWritable();
	const enabled = await isLocalEncryptionEnabled();
	if (!enabled || !isNativeApp()) {
		await set(key, value);
		return;
	}

	const keyMaterial = await getOrCreateEncryptionKeyMaterial();
	const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
	const envelope = await encryptValue(plaintext, keyMaterial);
	await set(key, envelope);
}

export async function secureIdbDel(key: string): Promise<void> {
	assertSensitiveStorageWritable();
	await del(key);
}

export type LocalEncryptionMigrationPhase = 'scan' | 'migrate' | 'finalize';

export type LocalEncryptionMigrationProgress = {
	percent: number;
	currentKey?: string;
	phase: LocalEncryptionMigrationPhase;
};

export type LocalEncryptionMigrationProgressCallback = (
	progress: LocalEncryptionMigrationProgress
) => void | Promise<void>;

function estimatePayloadWeight(raw: unknown): number {
	if (isEncryptedEnvelope(raw)) {
		return raw.ciphertext.length;
	}
	if (Array.isArray(raw)) {
		if (raw.length === 0) return 1;
		try {
			const sampleSize = JSON.stringify(raw[0]).length;
			return Math.max(sampleSize * raw.length, raw.length);
		} catch {
			return raw.length * 1024;
		}
	}
	try {
		return JSON.stringify(raw).length;
	} catch {
		return 1;
	}
}

function migrationPercent(completedWeight: number, totalWeight: number, keyFraction = 0, keyWeight = 0): number {
	const weighted = completedWeight + keyWeight * keyFraction;
	return Math.min(95, Math.round(5 + (weighted / totalWeight) * 90));
}

async function yieldForPaint(): Promise<void> {
	if (typeof requestAnimationFrame === 'function') {
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function reportMigrationProgress(
	onProgress: LocalEncryptionMigrationProgressCallback | undefined,
	progress: LocalEncryptionMigrationProgress
): Promise<void> {
	await onProgress?.(progress);
	await yieldForPaint();
}

async function encryptPlaintextForMigration(
	plaintext: unknown,
	keyMaterial: Uint8Array
): Promise<EncryptedEnvelope> {
	await yieldForPaint();
	const serialized = JSON.stringify(plaintext);
	await yieldForPaint();
	const { ciphertext, iv } = await encryptPayload(serialized, keyMaterial);
	return {
		__yamadori_enc_v1: true,
		iv: ivToBase64(iv),
		ciphertext: bytesToBase64(ciphertext)
	};
}

export async function migrateLocalEncryption(
	enabled: boolean,
	onProgress?: LocalEncryptionMigrationProgressCallback
): Promise<void> {
	if (migrationInProgress) {
		throw new Error(MIGRATION_IN_PROGRESS_ERROR);
	}

	if (enabled && !isNativeApp()) {
		throw new Error('local_encryption_native_only');
	}

	migrationInProgress = true;

	const wasEnabled = await isLocalEncryptionEnabled();
	const originals = new Map<string, unknown>();

	try {
		const storageKeys = await listSensitiveStorageKeys();

		for (const storageKey of storageKeys) {
			const raw = await get<unknown>(storageKey);
			if (raw !== undefined) {
				originals.set(storageKey, raw);
			}
		}

		await reportMigrationProgress(onProgress, { percent: 1, phase: 'scan' });

		const entries: { storageKey: string; raw: unknown; weight: number }[] = [];
		for (let index = 0; index < storageKeys.length; index += 1) {
			const storageKey = storageKeys[index]!;
			const raw = originals.get(storageKey);
			if (raw !== undefined) {
				entries.push({ storageKey, raw, weight: estimatePayloadWeight(raw) });
			}
			await reportMigrationProgress(onProgress, {
				percent: Math.round(((index + 1) / storageKeys.length) * 5),
				currentKey: storageKey,
				phase: 'scan'
			});
		}

		if (enabled === wasEnabled) {
			await writeEncryptionEnabledPref(enabled);
			await reportMigrationProgress(onProgress, { percent: 100, phase: 'finalize' });
			return;
		}

		const decryptKeyMaterial = wasEnabled ? await getEncryptionKeyMaterial() : null;
		const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0) || 1;
		let completedWeight = 0;

		const pendingWrites: { storageKey: string; value: unknown }[] = [];
		let encryptKeyMaterial: Uint8Array | null = null;

		if (enabled && !wasEnabled) {
			encryptKeyMaterial = await getOrCreateEncryptionKeyMaterial();
		}

		for (const { storageKey, raw, weight } of entries) {
			const progressBase = {
				currentKey: storageKey,
				phase: 'migrate' as const
			};

			await reportMigrationProgress(onProgress, {
				...progressBase,
				percent: migrationPercent(completedWeight, totalWeight, 0, weight)
			});

			const plaintext = await resolvePlaintext(raw, decryptKeyMaterial);
			await reportMigrationProgress(onProgress, {
				...progressBase,
				percent: migrationPercent(completedWeight, totalWeight, 0.35, weight)
			});

			if (enabled && !wasEnabled) {
				const envelope = await encryptPlaintextForMigration(plaintext, encryptKeyMaterial!);
				pendingWrites.push({ storageKey, value: envelope });
			} else if (!enabled && wasEnabled) {
				pendingWrites.push({ storageKey, value: plaintext });
			}

			completedWeight += weight;
			await reportMigrationProgress(onProgress, {
				...progressBase,
				percent: migrationPercent(completedWeight, totalWeight)
			});
		}

		await reportMigrationProgress(onProgress, { percent: 95, phase: 'finalize' });

		for (const { storageKey, value } of pendingWrites) {
			await set(storageKey, value);
		}

		if (!enabled) {
			await clearEncryptionKeyMaterial();
		} else if (!wasEnabled && encryptKeyMaterial) {
			cachedKeyMaterial = encryptKeyMaterial;
		}

		await writeEncryptionEnabledPref(enabled);

		await reportMigrationProgress(onProgress, { percent: 100, phase: 'finalize' });
	} catch (error) {
		for (const [storageKey, value] of originals) {
			await set(storageKey, value);
		}
		if (enabled && !wasEnabled) {
			await clearEncryptionKeyMaterial();
		}
		await writeEncryptionEnabledPref(wasEnabled);
		refreshLocalEncryptionCache(wasEnabled);
		throw error;
	} finally {
		migrationInProgress = false;
	}
}

export function __resetLocalEncryptionStateForTests(): void {
	encryptionEnabledCache = null;
	cachedKeyMaterial = undefined;
	migrationInProgress = false;
}

export function __isEncryptedEnvelopeForTests(value: unknown): boolean {
	return isEncryptedEnvelope(value);
}
