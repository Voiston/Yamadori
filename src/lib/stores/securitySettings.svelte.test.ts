import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
	mockIsNativeApp,
	mockIsLocalEncryptionEnabled,
	mockMigrateLocalEncryption,
	mockRefreshLocalEncryptionCache,
	mockEnsureLocalEncryptionDefault
} = vi.hoisted(() => ({
	mockIsNativeApp: vi.fn(),
	mockIsLocalEncryptionEnabled: vi.fn(),
	mockMigrateLocalEncryption: vi.fn(),
	mockRefreshLocalEncryptionCache: vi.fn(),
	mockEnsureLocalEncryptionDefault: vi.fn()
}));

vi.mock('$lib/paraglide/messages.js', () => ({
	settings_local_encryption_migration_timeout: () => 'Migration timeout',
	settings_storage_locked: () => 'Storage locked',
	settings_local_encryption_hint: () => 'Native only',
	settings_local_encryption_migration_failed: () => 'Migration failed'
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: (...args: unknown[]) => mockIsNativeApp(...args)
}));

vi.mock('$lib/utils/secure-idb', () => ({
	isLocalEncryptionEnabled: (...args: unknown[]) => mockIsLocalEncryptionEnabled(...args),
	migrateLocalEncryption: (...args: unknown[]) => mockMigrateLocalEncryption(...args),
	refreshLocalEncryptionCache: (...args: unknown[]) => mockRefreshLocalEncryptionCache(...args),
	ensureLocalEncryptionDefaultForNewInstalls: (...args: unknown[]) =>
		mockEnsureLocalEncryptionDefault(...args)
}));

import {
	formatMigrationErrorMessage,
	isLocalEncryptionAvailable,
	securitySettingsState,
	setLocalEncryptionEnabled
} from './securitySettings.svelte';

describe('formatMigrationErrorMessage', () => {
	it('maps known migration errors to localized messages', () => {
		expect(formatMigrationErrorMessage(new Error('migration_timeout'))).toBe('Migration timeout');
		expect(formatMigrationErrorMessage(new Error('migration_in_progress'))).toBe('Storage locked');
		expect(formatMigrationErrorMessage(new Error('local_encryption_native_only'))).toBe('Native only');
	});

	it('returns the raw message or generic failure', () => {
		expect(formatMigrationErrorMessage(new Error('disk_full'))).toBe('disk_full');
		expect(formatMigrationErrorMessage('unexpected')).toBe('Migration failed');
	});
});

describe('isLocalEncryptionAvailable', () => {
	it('returns true only on native app', () => {
		mockIsNativeApp.mockReturnValue(true);
		expect(isLocalEncryptionAvailable()).toBe(true);

		mockIsNativeApp.mockReturnValue(false);
		expect(isLocalEncryptionAvailable()).toBe(false);
	});
});

describe('setLocalEncryptionEnabled', () => {
	beforeEach(() => {
		vi.useRealTimers();
		mockIsNativeApp.mockReturnValue(true);
		mockIsLocalEncryptionEnabled.mockResolvedValue(false);
		mockMigrateLocalEncryption.mockReset();
		mockRefreshLocalEncryptionCache.mockReset();
		securitySettingsState.localEncryptionEnabled = false;
		securitySettingsState.migrationPending = false;
		securitySettingsState.migrationProgress = 0;
		securitySettingsState.migrationPhase = null;
		securitySettingsState.migrationCurrentKey = null;
		securitySettingsState.lastError = null;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns false immediately on web', async () => {
		mockIsNativeApp.mockReturnValue(false);

		await expect(setLocalEncryptionEnabled(true)).resolves.toBe(false);
		expect(mockMigrateLocalEncryption).not.toHaveBeenCalled();
	});

	it('updates state and cache after successful migration', async () => {
		mockMigrateLocalEncryption.mockImplementation(
			async (_enabled: boolean, onProgress: (progress: {
				percent: number;
				phase: 'scan' | 'migrate' | 'finalize';
				currentKey?: string;
			}) => Promise<void>) => {
				await onProgress({ percent: 50, phase: 'migrate', currentKey: 'trees' });
			}
		);

		await expect(setLocalEncryptionEnabled(true)).resolves.toBe(true);

		expect(securitySettingsState.localEncryptionEnabled).toBe(true);
		expect(securitySettingsState.migrationPending).toBe(false);
		expect(mockRefreshLocalEncryptionCache).toHaveBeenCalledWith(true);
	});

	it('rolls back state and records error on migration failure', async () => {
		mockMigrateLocalEncryption.mockRejectedValue(new Error('migration_in_progress'));
		mockIsLocalEncryptionEnabled.mockResolvedValue(true);

		await expect(setLocalEncryptionEnabled(false)).resolves.toBe(false);

		expect(securitySettingsState.lastError).toBe('migration_in_progress');
		expect(securitySettingsState.localEncryptionEnabled).toBe(true);
		expect(securitySettingsState.migrationPending).toBe(false);
	});

	it('times out long migrations and rolls back enabled flag', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		mockMigrateLocalEncryption.mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves.
				})
		);
		mockIsLocalEncryptionEnabled.mockResolvedValue(false);

		const migrationPromise = setLocalEncryptionEnabled(true);
		await vi.advanceTimersByTimeAsync(120_001);

		await expect(migrationPromise).resolves.toBe(false);
		expect(securitySettingsState.lastError).toBe('migration_timeout');
		expect(securitySettingsState.localEncryptionEnabled).toBe(false);
	});
});
