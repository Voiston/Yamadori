import { beforeEach, describe, expect, it, vi } from 'vitest';

const memoryStore = new Map<string, unknown>();
const mockEnabled = vi.fn(async () => false);
const mockKeyMaterial = vi.fn(async () => new Uint8Array(32).fill(9));

vi.mock('idb-keyval', () => ({
	createStore: () => ({}),
	get: vi.fn(async (key: string) => memoryStore.get(String(key))),
	set: vi.fn(async (key: string, value: unknown) => {
		memoryStore.set(String(key), value);
	}),
	del: vi.fn(async (key: string) => {
		memoryStore.delete(String(key));
	}),
	keys: vi.fn(async () => [...memoryStore.keys()])
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: () => true
}));

vi.mock('$lib/utils/secure-idb', () => ({
	isLocalEncryptionEnabled: () => mockEnabled(),
	getLocalEncryptionKeyMaterial: () => mockKeyMaterial(),
	ensureLocalEncryptionKeyMaterial: () => mockKeyMaterial()
}));

import {
	encryptedCacheEntries,
	encryptedCacheGet,
	encryptedCacheSet,
	isOpaqueCacheKey,
	OPAQUE_CACHE_KEY_PREFIX
} from './encryptedCacheStore';
import { keys } from 'idb-keyval';

const store = {} as never;
const STORE_ID = 'cadastre';
const PLAIN_KEY = '45.1234,6.6543';

describe('encryptedCacheStore', () => {
	beforeEach(() => {
		memoryStore.clear();
		mockEnabled.mockReset();
		mockKeyMaterial.mockReset();
		mockEnabled.mockResolvedValue(false);
		mockKeyMaterial.mockResolvedValue(new Uint8Array(32).fill(9));
	});

	it('stores plaintext keys when encryption is off', async () => {
		await encryptedCacheSet(store, STORE_ID, PLAIN_KEY, { ok: true });
		expect([...memoryStore.keys()]).toEqual([PLAIN_KEY]);
		await expect(encryptedCacheGet(store, STORE_ID, PLAIN_KEY)).resolves.toEqual({ ok: true });
	});

	it('uses opaque HMAC keys and encrypts values when encryption is on', async () => {
		mockEnabled.mockResolvedValue(true);
		await encryptedCacheSet(store, STORE_ID, PLAIN_KEY, { fetchedAt: '2026-01-01', value: 'parcel' });

		const storedKeys = [...memoryStore.keys()];
		expect(storedKeys).toHaveLength(1);
		expect(storedKeys[0]).toMatch(new RegExp(`^${OPAQUE_CACHE_KEY_PREFIX}`));
		expect(storedKeys[0]).not.toContain('45.1234');
		expect(JSON.stringify([...memoryStore.values()])).not.toContain('45.1234');

		await expect(encryptedCacheGet(store, STORE_ID, PLAIN_KEY)).resolves.toEqual({
			fetchedAt: '2026-01-01',
			value: 'parcel'
		});
	});

	it('lazy-migrates a leftover plaintext key', async () => {
		memoryStore.set(PLAIN_KEY, { fetchedAt: '2026-01-01', value: 'legacy' });
		mockEnabled.mockResolvedValue(true);

		await expect(encryptedCacheGet(store, STORE_ID, PLAIN_KEY)).resolves.toEqual({
			fetchedAt: '2026-01-01',
			value: 'legacy'
		});

		expect(memoryStore.has(PLAIN_KEY)).toBe(false);
		const remaining = await keys();
		expect(remaining.every((key) => isOpaqueCacheKey(String(key)))).toBe(true);
		const entries = await encryptedCacheEntries(store, STORE_ID);
		expect(entries).toEqual([{ key: PLAIN_KEY, value: { fetchedAt: '2026-01-01', value: 'legacy' } }]);
	});
});
