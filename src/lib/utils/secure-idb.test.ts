import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockPreferencesGet = vi.fn();
const mockPreferencesSet = vi.fn();
const mockSecureGet = vi.fn();
const mockSecureSet = vi.fn();
const mockSecureRemove = vi.fn();

const mockKeys = vi.fn();

vi.mock('idb-keyval', () => ({
	get: (...args: unknown[]) => mockGet(...args),
	set: (...args: unknown[]) => mockSet(...args),
	del: (...args: unknown[]) => mockDel(...args),
	keys: (...args: unknown[]) => mockKeys(...args)
}));

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: (...args: unknown[]) => mockPreferencesGet(...args),
		set: (...args: unknown[]) => mockPreferencesSet(...args)
	}
}));

vi.mock('capacitor-secure-storage-plugin', () => ({
	SecureStoragePlugin: {
		get: (...args: unknown[]) => mockSecureGet(...args),
		set: (...args: unknown[]) => mockSecureSet(...args),
		remove: (...args: unknown[]) => mockSecureRemove(...args)
	}
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: () => true
}));

import {
	__isEncryptedEnvelopeForTests,
	__resetLocalEncryptionStateForTests,
	migrateLocalEncryption,
	secureIdbDel,
	secureIdbGet,
	secureIdbSet
} from './secure-idb';

describe('secure-idb', () => {
	beforeEach(() => {
		__resetLocalEncryptionStateForTests();
		mockGet.mockReset();
		mockSet.mockReset();
		mockDel.mockReset();
		mockPreferencesGet.mockReset();
		mockPreferencesSet.mockReset();
		mockSecureGet.mockReset();
		mockSecureSet.mockReset();
		mockSecureRemove.mockReset();
		mockKeys.mockReset();
		mockKeys.mockResolvedValue([]);
		mockPreferencesGet.mockResolvedValue({ value: 'false' });
		mockPreferencesSet.mockResolvedValue(undefined);
		mockSecureGet.mockRejectedValue(new Error('missing'));
		mockSecureSet.mockResolvedValue(undefined);
		mockSecureRemove.mockResolvedValue(undefined);
	});

	it('stores plaintext when encryption is disabled', async () => {
		await secureIdbSet('yamadori-parking', { lat: 1, lon: 2 });
		expect(mockSet).toHaveBeenCalledWith('yamadori-parking', { lat: 1, lon: 2 });
	});

	it('encrypts values when encryption is enabled', async () => {
		mockPreferencesGet.mockResolvedValue({ value: 'true' });
		mockSecureGet.mockResolvedValue({
			value: btoa(String.fromCharCode(...new Uint8Array(32).fill(7)))
		});

		await secureIdbSet('yamadori-parking', { lat: 1, lon: 2 });

		const stored = mockSet.mock.calls.at(-1)?.[1];
		expect(__isEncryptedEnvelopeForTests(stored)).toBe(true);
	});

	it('throws when encrypted value cannot be decrypted without key material', async () => {
		mockPreferencesGet.mockResolvedValue({ value: 'true' });
		mockGet.mockResolvedValue({
			__yamadori_enc_v1: true,
			iv: 'aXY=',
			ciphertext: 'Y2lwaGVydGV4dA=='
		});
		mockSecureGet.mockResolvedValue({ value: null });

		await expect(secureIdbGet('yamadori-trees')).rejects.toThrow('local_encryption_key_missing');
	});

	it('round-trips encrypted values', async () => {
		mockPreferencesGet.mockResolvedValue({ value: 'true' });
		const keyMaterial = new Uint8Array(32).fill(9);
		mockSecureGet.mockResolvedValue({
			value: btoa(String.fromCharCode(...keyMaterial))
		});

		mockGet.mockImplementation(async () => mockSet.mock.calls.at(-1)?.[1]);

		await secureIdbSet('yamadori-parking', { lat: 48.1, lon: 2.3 });
		const restored = await secureIdbGet<{ lat: number; lon: number }>('yamadori-parking');
		expect(restored).toEqual({ lat: 48.1, lon: 2.3 });
	});

	it('migrates plaintext stores to encrypted envelopes', async () => {
		mockGet.mockImplementation(async (key: string) => {
			if (key === 'yamadori-trees') return [{ id: 'tree-1' }];
			return undefined;
		});

		await migrateLocalEncryption(true);

		expect(mockPreferencesSet).toHaveBeenCalledWith({
			key: 'yamadori-local-encryption-enabled',
			value: 'true'
		});
		const migrated = mockSet.mock.calls.find(([key]) => key === 'yamadori-trees')?.[1];
		expect(__isEncryptedEnvelopeForTests(migrated)).toBe(true);
	});

	it('reports monotonic migration progress weighted by payload size', async () => {
		const smallPayload = { lat: 1, lon: 2 };
		const largePayload = [{ id: 'tree-1', notes: 'x'.repeat(5000) }];

		mockGet.mockImplementation(async (key: string) => {
			if (key === 'yamadori-parking') return smallPayload;
			if (key === 'yamadori-trees') return largePayload;
			return undefined;
		});

		const progressCalls: number[] = [];
		await migrateLocalEncryption(true, (progress) => {
			progressCalls.push(progress.percent);
		});

		expect(progressCalls.length).toBeGreaterThan(1);
		for (let i = 1; i < progressCalls.length; i += 1) {
			expect(progressCalls[i]).toBeGreaterThanOrEqual(progressCalls[i - 1]!);
		}
		expect(progressCalls.at(-1)).toBe(100);
	});

	it('blocks secureIdbDel while migration is running', async () => {
		mockGet.mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve([{ id: 'tree-1' }]), 30);
				})
		);

		const migratePromise = migrateLocalEncryption(true);
		await new Promise((resolve) => setTimeout(resolve, 5));
		await expect(secureIdbDel('yamadori-parking')).rejects.toThrow('migration_in_progress');
		await migratePromise;
	});

	it('restores originals when migration final write fails', async () => {
		const originalTrees = [{ id: 'tree-1', species: 'oak' }];
		mockGet.mockImplementation(async (key: string) => {
			if (key === 'yamadori-trees') return originalTrees;
			return undefined;
		});

		mockSet.mockImplementation(async (key: string, value: unknown) => {
			if (key === 'yamadori-trees' && __isEncryptedEnvelopeForTests(value)) {
				throw new Error('write failed');
			}
		});

		await expect(migrateLocalEncryption(true)).rejects.toThrow('write failed');

		expect(mockPreferencesSet).toHaveBeenLastCalledWith({
			key: 'yamadori-local-encryption-enabled',
			value: 'false'
		});
		expect(mockSet).toHaveBeenCalledWith('yamadori-trees', originalTrees);
		expect(mockSecureRemove).toHaveBeenCalled();
	});

	it('reads encrypted data after key creation in the same session', async () => {
		let storedKey: string | null = null;

		mockSecureGet.mockImplementation(async () => {
			if (storedKey) {
				return { value: storedKey };
			}
			throw new Error('missing');
		});
		mockSecureSet.mockImplementation(async ({ value }: { value: string }) => {
			storedKey = value;
		});

		mockGet.mockImplementation(async (key: string) => {
			if (key === 'yamadori-trees') return [{ id: 'tree-1', species: 'oak' }];
			return mockSet.mock.calls.find(([setKey]) => setKey === key)?.[1];
		});

		await migrateLocalEncryption(true);
		mockPreferencesGet.mockResolvedValue({ value: 'true' });

		const restored = await secureIdbGet<{ id: string; species: string }[]>('yamadori-trees');
		expect(restored).toEqual([{ id: 'tree-1', species: 'oak' }]);
	});

	it('simulates tutorial flow: plaintext write, migration, second write and read', async () => {
		let storedKey: string | null = null;
		const idb = new Map<string, unknown>();

		mockSecureGet.mockImplementation(async () => {
			if (storedKey) return { value: storedKey };
			return { value: null };
		});
		mockSecureSet.mockImplementation(async ({ value }: { value: string }) => {
			storedKey = value;
		});
		mockGet.mockImplementation(async (key: string) => idb.get(key));
		mockSet.mockImplementation(async (key: string, value: unknown) => {
			idb.set(key, value);
		});

		await secureIdbSet('yamadori-trees', [{ id: 'tree-1', species: 'oak' }]);
		await migrateLocalEncryption(true);
		mockPreferencesGet.mockResolvedValue({ value: 'true' });

		const afterMigration = await secureIdbGet<{ id: string; species: string }[]>('yamadori-trees');
		expect(afterMigration).toEqual([{ id: 'tree-1', species: 'oak' }]);

		await secureIdbSet('yamadori-trees', [
			{ id: 'tree-2', species: 'beech' },
			{ id: 'tree-1', species: 'oak' }
		]);
		const afterSecondSave = await secureIdbGet<{ id: string; species: string }[]>('yamadori-trees');
		expect(afterSecondSave).toHaveLength(2);
	});
});
