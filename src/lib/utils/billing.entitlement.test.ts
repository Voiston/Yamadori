import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	PRO_OFFLINE_GRACE_MS,
	PRO_PRODUCT_ID,
	PRO_PROMO_PRODUCT_ID,
	PRO_PROMO_DURATION_MS
} from '$lib/constants/pro';
import {
	clearEntitlement,
	isOfflineEntitlementFresh,
	proEntitlementState
} from '$lib/stores/proEntitlement.svelte';
import { proPromoState } from '$lib/stores/proPromo.svelte';

const {
	mockGetPurchases,
	mockAcknowledgePurchase,
	mockGet,
	mockSet,
	mockRemove,
	mockIsNativeApp,
	mockIsAndroidApp
} = vi.hoisted(() => ({
	mockGetPurchases: vi.fn(),
	mockAcknowledgePurchase: vi.fn(),
	mockGet: vi.fn(),
	mockSet: vi.fn(),
	mockRemove: vi.fn(),
	mockIsNativeApp: vi.fn(() => true),
	mockIsAndroidApp: vi.fn(() => true)
}));

vi.mock('@capgo/native-purchases', () => ({
	NativePurchases: {
		getPurchases: mockGetPurchases,
		acknowledgePurchase: mockAcknowledgePurchase
	},
	PURCHASE_TYPE: { INAPP: 'inapp' }
}));

vi.mock('capacitor-secure-storage-plugin', () => ({
	SecureStoragePlugin: {
		get: mockGet,
		set: mockSet,
		remove: mockRemove
	}
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: mockIsNativeApp,
	isAndroidApp: mockIsAndroidApp
}));

import {
	findValidProPurchase,
	getPurchaseToken,
	isValidProPurchase,
	syncProEntitlementFromStore
} from './billing';

const NOW = Date.parse('2026-07-20T12:00:00.000Z');

function freshVerifiedAt(nowMs: number = NOW): string {
	return new Date(nowMs - 60_000).toISOString();
}

function staleVerifiedAt(nowMs: number = NOW): string {
	return new Date(nowMs - PRO_OFFLINE_GRACE_MS - 60_000).toISOString();
}

describe('billing entitlement helpers', () => {
	it('accepts a valid Pro purchase token', () => {
		expect(
			isValidProPurchase({
				productIdentifier: PRO_PRODUCT_ID,
				purchaseToken: 'token-123',
				purchaseState: '1'
			})
		).toBe(true);
		expect(
			isValidProPurchase({
				productIdentifier: PRO_PROMO_PRODUCT_ID,
				purchaseToken: 'promo-token',
				purchaseState: 1
			})
		).toBe(true);
		expect(
			isValidProPurchase({
				productIdentifier: PRO_PRODUCT_ID,
				purchaseToken: 'token-123',
				purchaseState: 'PURCHASED'
			})
		).toBe(true);
	});

	it('rejects purchases without an explicit purchased state', () => {
		expect(
			isValidProPurchase({
				productIdentifier: PRO_PRODUCT_ID,
				purchaseToken: 'token-123'
			})
		).toBe(false);
	});

	it('rejects purchases for other products or invalid state', () => {
		expect(
			isValidProPurchase({
				productIdentifier: 'other_product',
				purchaseToken: 'token-123'
			})
		).toBe(false);
		expect(
			isValidProPurchase({
				productIdentifier: PRO_PRODUCT_ID,
				purchaseToken: 'token-123',
				purchaseState: '0'
			})
		).toBe(false);
	});

	it('finds the first valid purchase and extracts its token', () => {
		const purchase = findValidProPurchase([
			{ productIdentifier: 'other', purchaseToken: 'x', purchaseState: '1' },
			{ productIdentifier: PRO_PRODUCT_ID, purchaseToken: 'valid-token', purchaseState: '1' }
		]);
		expect(purchase?.purchaseToken).toBe('valid-token');
		expect(getPurchaseToken(purchase!)).toBe('valid-token');
	});
});

describe('isOfflineEntitlementFresh', () => {
	it('accepts verifiedAt within the grace window', () => {
		expect(isOfflineEntitlementFresh(freshVerifiedAt(NOW), NOW)).toBe(true);
		expect(
			isOfflineEntitlementFresh(new Date(NOW - PRO_OFFLINE_GRACE_MS).toISOString(), NOW)
		).toBe(true);
	});

	it('rejects missing, invalid, or expired verifiedAt', () => {
		expect(isOfflineEntitlementFresh(staleVerifiedAt(NOW), NOW)).toBe(false);
		expect(isOfflineEntitlementFresh('not-a-date', NOW)).toBe(false);
	});
});

describe('syncProEntitlementFromStore', () => {
	beforeEach(() => {
		proEntitlementState.isPro = false;
		proEntitlementState.loaded = true;
		proEntitlementState.lastError = null;
		mockGetPurchases.mockReset();
		mockAcknowledgePurchase.mockReset();
		mockGet.mockReset();
		mockSet.mockReset();
		mockRemove.mockReset();
		mockIsNativeApp.mockReturnValue(true);
		mockIsAndroidApp.mockReturnValue(true);
		mockSet.mockResolvedValue(undefined);
		mockRemove.mockResolvedValue(undefined);
		mockAcknowledgePurchase.mockResolvedValue(undefined);
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('grants Pro and stores the purchase token when Google returns a valid purchase', async () => {
		mockGetPurchases.mockResolvedValue({
			purchases: [
				{
					productIdentifier: PRO_PRODUCT_ID,
					purchaseToken: 'google-token',
					purchaseState: '1',
					isAcknowledged: true
				}
			]
		});

		await syncProEntitlementFromStore();

		expect(proEntitlementState.isPro).toBe(true);
		expect(mockAcknowledgePurchase).not.toHaveBeenCalled();
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'yamadori-pro-purchase',
				value: expect.stringContaining('google-token')
			})
		);
	});

	it('acknowledges unacknowledged purchases before granting Pro', async () => {
		mockGetPurchases.mockResolvedValue({
			purchases: [
				{
					productIdentifier: PRO_PRODUCT_ID,
					purchaseToken: 'google-token',
					purchaseState: '1',
					isAcknowledged: false
				}
			]
		});

		await syncProEntitlementFromStore();

		expect(mockAcknowledgePurchase).toHaveBeenCalledWith({
			purchaseToken: 'google-token'
		});
		expect(proEntitlementState.isPro).toBe(true);
	});

	it('falls back to cached entitlement when acknowledgement fails', async () => {
		mockGetPurchases.mockResolvedValue({
			purchases: [
				{
					productIdentifier: PRO_PRODUCT_ID,
					purchaseToken: 'google-token',
					purchaseState: '1',
					isAcknowledged: false
				}
			]
		});
		mockAcknowledgePurchase.mockRejectedValue(new Error('ack_failed'));
		mockGet.mockResolvedValue({
			value: JSON.stringify({
				purchaseToken: 'cached-token',
				productId: PRO_PRODUCT_ID,
				verifiedAt: freshVerifiedAt()
			})
		});

		await syncProEntitlementFromStore();

		expect(proEntitlementState.isPro).toBe(true);
		expect(proEntitlementState.lastError).toBe('acknowledge_failed');
		expect(mockSet).not.toHaveBeenCalled();
	});

	it('revokes Pro and clears secure storage when no purchase is found', async () => {
		mockGetPurchases.mockResolvedValue({ purchases: [] });

		await syncProEntitlementFromStore();

		expect(proEntitlementState.isPro).toBe(false);
		expect(mockRemove).toHaveBeenCalledWith({ key: 'yamadori-pro-purchase' });
	});

	it('falls back to the cached secure token when Play is unavailable', async () => {
		mockGetPurchases.mockRejectedValue(new Error('billing_unavailable'));
		mockGet.mockResolvedValue({
			value: JSON.stringify({
				purchaseToken: 'cached-token',
				productId: PRO_PRODUCT_ID,
				verifiedAt: freshVerifiedAt()
			})
		});

		await syncProEntitlementFromStore();

		expect(proEntitlementState.isPro).toBe(true);
		expect(proEntitlementState.lastError).toBeNull();
		expect(mockSet).not.toHaveBeenCalled();
		expect(mockRemove).not.toHaveBeenCalled();
	});

	it('revokes Pro when Play is unavailable and the cached token is past grace', async () => {
		mockGetPurchases.mockRejectedValue(new Error('billing_unavailable'));
		mockGet.mockResolvedValue({
			value: JSON.stringify({
				purchaseToken: 'cached-token',
				productId: PRO_PRODUCT_ID,
				verifiedAt: staleVerifiedAt()
			})
		});

		await syncProEntitlementFromStore();

		expect(proEntitlementState.isPro).toBe(false);
		expect(mockRemove).toHaveBeenCalledWith({ key: 'yamadori-pro-purchase' });
		expect(proEntitlementState.lastError).toBe('restore_failed');
	});

	it('denies Pro when Play is unavailable and no cached token exists', async () => {
		mockGetPurchases.mockRejectedValue(new Error('billing_unavailable'));
		mockGet.mockRejectedValue(new Error('not_found'));

		await syncProEntitlementFromStore();

		expect(proEntitlementState.isPro).toBe(false);
		expect(proEntitlementState.lastError).toBe('restore_failed');
	});

	it('keeps the promo deadline when Pro entitlement is cleared', async () => {
		const now = Date.parse('2026-06-01T12:00:00.000Z');
		const endsAt = new Date(now + PRO_PROMO_DURATION_MS).toISOString();
		proPromoState.promoEndsAt = endsAt;
		proEntitlementState.isPro = true;

		await clearEntitlement();

		expect(proEntitlementState.isPro).toBe(false);
		expect(proPromoState.promoEndsAt).toBe(endsAt);
	});
});
