import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { proPromoState, initProPromo, startPromoWindowIfNeeded } from './proPromo.svelte';
import { openProPaywall, proPaywallState } from './proPaywall.svelte';
import { proEntitlementState } from './proEntitlement.svelte';

const STORAGE_KEY = 'yamadori-pro-promo-ends-at';
const STORAGE_VERSION_KEY = 'yamadori-pro-promo-storage-v2';
const STORAGE_VERSION = 'pricing-only';
const CONSUMED_KEY = 'yamadori-pro-promo-consumed';

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: vi.fn(),
		set: vi.fn(),
		remove: vi.fn()
	}
}));

function mockMigratedStorage(endsAt: string | null = null, consumed = false): void {
	vi.mocked(Preferences.get).mockImplementation(({ key }) => {
		if (key === STORAGE_VERSION_KEY) {
			return Promise.resolve({ value: STORAGE_VERSION });
		}
		if (key === STORAGE_KEY) {
			return Promise.resolve({ value: endsAt });
		}
		if (key === CONSUMED_KEY) {
			return Promise.resolve({ value: consumed ? '1' : null });
		}
		return Promise.resolve({ value: null });
	});
}

function mockLegacyStorage(endsAt: string): void {
	let storageCleared = false;
	vi.mocked(Preferences.get).mockImplementation(({ key }) => {
		if (key === STORAGE_VERSION_KEY) {
			return Promise.resolve({ value: null });
		}
		if (key === STORAGE_KEY) {
			return Promise.resolve({ value: storageCleared ? null : endsAt });
		}
		if (key === CONSUMED_KEY) {
			return Promise.resolve({ value: null });
		}
		return Promise.resolve({ value: null });
	});
	vi.mocked(Preferences.remove).mockImplementation(async ({ key }) => {
		if (key === STORAGE_KEY) {
			storageCleared = true;
		}
	});
}

describe('proPromo pricing window', () => {
	beforeEach(() => {
		proPromoState.loaded = true;
		proPromoState.promoEndsAt = null;
		proPromoState.promoConsumed = false;
		proEntitlementState.loaded = true;
		proEntitlementState.isPro = false;
		proPaywallState.open = false;
		vi.clearAllMocks();
		mockMigratedStorage();
		vi.mocked(Preferences.set).mockResolvedValue();
		vi.mocked(Preferences.remove).mockResolvedValue();
	});

	it('starts promo when opening tree_limit paywall', async () => {
		openProPaywall('tree_limit');

		expect(proPaywallState.open).toBe(true);
		expect(proPaywallState.reason).toBe('tree_limit');
		await vi.waitFor(() => {
			expect(proPromoState.promoEndsAt).not.toBeNull();
		});
		expect(Preferences.set).toHaveBeenCalledWith(
			expect.objectContaining({
				key: STORAGE_KEY,
				value: proPromoState.promoEndsAt
			})
		);
		expect(Preferences.set).toHaveBeenCalledWith({
			key: CONSUMED_KEY,
			value: '1'
		});
		expect(proPromoState.promoConsumed).toBe(true);
	});

	it('does not start promo for other paywall reasons', () => {
		openProPaywall('yrs_details');

		expect(proPaywallState.open).toBe(true);
		expect(proPaywallState.reason).toBe('yrs_details');
		expect(proPromoState.promoEndsAt).toBeNull();
		expect(Preferences.set).not.toHaveBeenCalled();
	});

	it('restores persisted promo deadline on init after migration', async () => {
		const endsAt = '2099-12-31T12:00:00.000Z';
		mockMigratedStorage(endsAt);
		proPromoState.promoEndsAt = null;
		proPromoState.loaded = false;

		await initProPromo();

		expect(proPromoState.promoEndsAt).toBe(endsAt);
		expect(proPromoState.promoConsumed).toBe(true);
		expect(proPromoState.loaded).toBe(true);
	});

	it('does not clear an in-memory promo deadline when init finishes late', async () => {
		const endsAt = '2099-12-31T12:00:00.000Z';
		proPromoState.promoEndsAt = endsAt;
		proPromoState.loaded = false;
		mockMigratedStorage(null);

		await initProPromo();

		expect(proPromoState.promoEndsAt).toBe(endsAt);
		expect(proPromoState.loaded).toBe(true);
	});

	it('clears legacy trial-era promo deadline on first migration', async () => {
		const legacyEndsAt = '2026-01-01T12:00:00.000Z';
		mockLegacyStorage(legacyEndsAt);
		proPromoState.promoEndsAt = null;
		proPromoState.loaded = false;

		await initProPromo();

		expect(Preferences.remove).toHaveBeenCalledWith({ key: STORAGE_KEY });
		expect(Preferences.set).toHaveBeenCalledWith({
			key: STORAGE_VERSION_KEY,
			value: STORAGE_VERSION
		});
		expect(proPromoState.promoEndsAt).toBeNull();
		expect(proPromoState.loaded).toBe(true);
	});

	it('clears active legacy promo deadline on first migration', async () => {
		const activeEndsAt = '2099-12-31T12:00:00.000Z';
		mockLegacyStorage(activeEndsAt);
		proPromoState.promoEndsAt = null;
		proPromoState.loaded = false;

		await initProPromo();

		expect(Preferences.remove).toHaveBeenCalledWith({ key: STORAGE_KEY });
		expect(proPromoState.promoEndsAt).toBeNull();
	});

	it('does not restart promo while an active window is running', async () => {
		const endsAt = '2099-12-31T12:00:00.000Z';
		proPromoState.promoEndsAt = endsAt;
		proPromoState.promoConsumed = true;

		await startPromoWindowIfNeeded();

		expect(proPromoState.promoEndsAt).toBe(endsAt);
		expect(Preferences.set).not.toHaveBeenCalled();
	});

	it('does not restart promo after an expired one-shot window', async () => {
		proPromoState.promoEndsAt = '2020-01-01T12:00:00.000Z';
		proPromoState.promoConsumed = false;

		await startPromoWindowIfNeeded();

		expect(Preferences.remove).toHaveBeenCalledWith({ key: STORAGE_KEY });
		expect(proPromoState.promoEndsAt).toBeNull();
		expect(proPromoState.promoConsumed).toBe(true);
		expect(Preferences.set).toHaveBeenCalledWith({
			key: CONSUMED_KEY,
			value: '1'
		});
		// No new ends-at written after expiry.
		expect(
			vi.mocked(Preferences.set).mock.calls.some(
				([arg]) => arg.key === STORAGE_KEY && typeof arg.value === 'string' && arg.value.length > 0
			)
		).toBe(false);
	});

	it('skips starting promo when already consumed', async () => {
		proPromoState.promoConsumed = true;
		proPromoState.promoEndsAt = null;

		await startPromoWindowIfNeeded();

		expect(proPromoState.promoEndsAt).toBeNull();
		expect(Preferences.set).not.toHaveBeenCalledWith(
			expect.objectContaining({ key: STORAGE_KEY })
		);
	});
});
