import { del, get, keys, set } from 'idb-keyval';
import {
	base64ToBytes,
	decryptPayload,
	encryptPayload,
	ivToBase64
} from '$lib/utils/archive/crypto';
import { isNativeApp } from '$lib/utils/platform';
import {
	ensureLocalEncryptionKeyMaterial,
	getLocalEncryptionKeyMaterial,
	isLocalEncryptionEnabled
} from '$lib/utils/secure-idb';

type CacheStore = NonNullable<Parameters<typeof get>[1]>;

export const OPAQUE_CACHE_KEY_PREFIX = 'enc1:';

type EncryptedEnvelope = {
	__yamadori_enc_v1: true;
	iv: string;
	ciphertext: string;
};

type EncryptedCacheRecord<T> = {
	k: string;
	v: T;
};

const CADASTRE_STORE_ID = 'cadastre';
const PROTECTED_STORE_ID = 'protected';
const GEOCODE_STORE_ID = 'geocode';

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function copyBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
	return new Uint8Array(data);
}

function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as EncryptedEnvelope).__yamadori_enc_v1 === true &&
		typeof (value as EncryptedEnvelope).iv === 'string' &&
		typeof (value as EncryptedEnvelope).ciphertext === 'string'
	);
}

export function isOpaqueCacheKey(key: string): boolean {
	return key.startsWith(OPAQUE_CACHE_KEY_PREFIX);
}

async function encryptionActive(): Promise<boolean> {
	if (!isNativeApp()) return false;
	return isLocalEncryptionEnabled();
}

async function hmacHex(keyMaterial: Uint8Array, message: string): Promise<string> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		copyBytes(keyMaterial),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
	return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function opaqueCacheKey(
	storeId: string,
	plainKey: string,
	keyMaterial: Uint8Array
): Promise<string> {
	const digest = await hmacHex(keyMaterial, `${storeId}\0${plainKey}`);
	return `${OPAQUE_CACHE_KEY_PREFIX}${digest}`;
}

async function encryptRecord<T>(value: EncryptedCacheRecord<T>, keyMaterial: Uint8Array): Promise<EncryptedEnvelope> {
	const { ciphertext, iv } = await encryptPayload(JSON.stringify(value), keyMaterial);
	return {
		__yamadori_enc_v1: true,
		iv: ivToBase64(iv),
		ciphertext: bytesToBase64(ciphertext)
	};
}

async function decryptRecord<T>(
	envelope: EncryptedEnvelope,
	keyMaterial: Uint8Array
): Promise<EncryptedCacheRecord<T>> {
	const plaintext = await decryptPayload(
		base64ToBytes(envelope.ciphertext),
		base64ToBytes(envelope.iv),
		keyMaterial
	);
	return JSON.parse(plaintext) as EncryptedCacheRecord<T>;
}

async function readDecryptedValue<T>(
	raw: unknown,
	keyMaterial: Uint8Array | null
): Promise<{ plainKey?: string; value: T } | undefined> {
	if (raw === undefined) return undefined;
	if (isEncryptedEnvelope(raw)) {
		if (!keyMaterial) return undefined;
		try {
			const record = await decryptRecord<T>(raw, keyMaterial);
			return { plainKey: record.k, value: record.v };
		} catch {
			return undefined;
		}
	}
	return { value: raw as T };
}

export async function encryptedCacheGet<T>(
	store: CacheStore,
	storeId: string,
	plainKey: string
): Promise<T | undefined> {
	const encrypt = await encryptionActive();
	if (encrypt) {
		const keyMaterial = await getLocalEncryptionKeyMaterial();
		if (keyMaterial) {
			const opaque = await opaqueCacheKey(storeId, plainKey, keyMaterial);
			const opaqueRaw = await get<unknown>(opaque, store);
			const opaqueHit = await readDecryptedValue<T>(opaqueRaw, keyMaterial);
			if (opaqueHit) {
				return opaqueHit.value;
			}
		}
	}

	const plainRaw = await get<unknown>(plainKey, store);
	if (plainRaw === undefined) return undefined;

	if (encrypt) {
		try {
			await encryptedCacheSet(store, storeId, plainKey, plainRaw as T);
			await del(plainKey, store);
		} catch {
			// Keep serving the plaintext hit if rewrite fails.
		}
	}

	return plainRaw as T;
}

export async function encryptedCacheSet<T>(
	store: CacheStore,
	storeId: string,
	plainKey: string,
	value: T
): Promise<void> {
	const encrypt = await encryptionActive();
	if (!encrypt) {
		await set(plainKey, value, store);
		return;
	}

	const keyMaterial = await ensureLocalEncryptionKeyMaterial();
	const opaque = await opaqueCacheKey(storeId, plainKey, keyMaterial);
	const envelope = await encryptRecord({ k: plainKey, v: value }, keyMaterial);
	await set(opaque, envelope, store);
	await del(plainKey, store);
}

export async function encryptedCacheDel(
	store: CacheStore,
	storeId: string,
	plainKey: string
): Promise<void> {
	await del(plainKey, store);
	if (!(await encryptionActive())) return;
	const keyMaterial = await getLocalEncryptionKeyMaterial();
	if (!keyMaterial) return;
	const opaque = await opaqueCacheKey(storeId, plainKey, keyMaterial);
	await del(opaque, store);
}

export async function encryptedCacheClear(store: CacheStore): Promise<void> {
	const allKeys = await keys(store);
	await Promise.all(allKeys.map((key) => del(key, store)));
}

export async function encryptedCacheEntries<T>(
	store: CacheStore,
	storeId: string
): Promise<{ key: string; value: T }[]> {
	const encrypt = await encryptionActive();
	const keyMaterial = encrypt ? await getLocalEncryptionKeyMaterial() : null;
	const allKeys = await keys(store);
	const entries: { key: string; value: T }[] = [];

	for (const rawKey of allKeys) {
		const storageKey = String(rawKey);
		const raw = await get<unknown>(rawKey, store);
		if (raw === undefined) continue;

		if (isOpaqueCacheKey(storageKey)) {
			const decrypted = await readDecryptedValue<T>(raw, keyMaterial);
			if (!decrypted?.plainKey) {
				await del(rawKey, store);
				continue;
			}
			entries.push({ key: decrypted.plainKey, value: decrypted.value });
			continue;
		}

		if (encrypt && keyMaterial) {
			try {
				await encryptedCacheSet(store, storeId, storageKey, raw as T);
				await del(storageKey, store);
			} catch {
				// Leave the plaintext entry readable.
			}
		}
		entries.push({ key: storageKey, value: raw as T });
	}

	return entries;
}

export async function rewriteStoreForEncryption(
	store: CacheStore,
	storeId: string,
	encrypt: boolean,
	keyMaterial: Uint8Array
): Promise<void> {
	const allKeys = await keys(store);
	for (const rawKey of allKeys) {
		const storageKey = String(rawKey);
		try {
			const raw = await get<unknown>(rawKey, store);
			if (raw === undefined) continue;

			if (encrypt) {
				if (isOpaqueCacheKey(storageKey)) continue;
				const opaque = await opaqueCacheKey(storeId, storageKey, keyMaterial);
				const envelope = await encryptRecord({ k: storageKey, v: raw }, keyMaterial);
				await set(opaque, envelope, store);
				await del(storageKey, store);
				continue;
			}

			if (!isOpaqueCacheKey(storageKey) || !isEncryptedEnvelope(raw)) continue;
			const record = await decryptRecord<unknown>(raw, keyMaterial);
			if (!record.k) continue;
			await set(record.k, record.v, store);
			await del(storageKey, store);
		} catch {
			// Skip broken entries; TTL refill replaces them.
		}
	}
}

const registeredGeoCaches: { store: CacheStore; storeId: string }[] = [];

export function registerGeoCacheStore(store: CacheStore, storeId: string): void {
	if (registeredGeoCaches.some((entry) => entry.storeId === storeId)) return;
	registeredGeoCaches.push({ store, storeId });
}

export async function rewriteGeoCachesForEncryption(
	encrypt: boolean,
	keyMaterial: Uint8Array
): Promise<void> {
	await import('$lib/utils/cadastreCache');
	await import('$lib/utils/protectedAreasCache');
	await import('$lib/utils/geocodingCache');
	await import('$lib/utils/offlineParcels');
	await import('$lib/utils/offlineProtectedAreas');
	for (const { store, storeId } of registeredGeoCaches) {
		await rewriteStoreForEncryption(store, storeId, encrypt, keyMaterial);
	}
}

export const GEO_CACHE_STORE_IDS = {
	cadastre: CADASTRE_STORE_ID,
	protected: PROTECTED_STORE_ID,
	geocode: GEOCODE_STORE_ID
} as const;
