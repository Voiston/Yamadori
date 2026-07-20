import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	PRO_PRODUCT_ID,
	PRO_PROMO_PRODUCT_ID,
	PRO_PROMO_DURATION_MS
} from '$lib/constants/pro';
import { proEntitlementState } from '$lib/stores/proEntitlement.svelte';
import { proPromoState } from '$lib/stores/proPromo.svelte';

const { mockGetPurchases, mockGetProducts, mockIsAndroidApp, mockAcknowledgePurchase } =
	vi.hoisted(() => ({
		mockGetPurchases: vi.fn(),
		mockGetProducts: vi.fn(),
		mockIsAndroidApp: vi.fn(),
		mockAcknowledgePurchase: vi.fn()
	}));

vi.mock('@capgo/native-purchases', () => ({
	NativePurchases: {
		getPurchases: mockGetPurchases,
		getProducts: mockGetProducts,
		acknowledgePurchase: mockAcknowledgePurchase
	},
	PURCHASE_TYPE: { INAPP: 'inapp' }
}));

vi.mock('capacitor-secure-storage-plugin', () => ({
	SecureStoragePlugin: {
		get: vi.fn(),
		set: vi.fn(),
		remove: vi.fn()
	}
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: vi.fn(() => true),
	isAndroidApp: (...args: unknown[]) => mockIsAndroidApp(...args)
}));

import { resetBillingQueueForTests } from './billing-native-queue';
import { getActiveProOffer, restoreProPurchase } from './billing';

const NOW = Date.parse('2026-06-01T12:00:00.000Z');

function setPromoWindow(nowMs: number = NOW): void {
	proPromoState.promoEndsAt = new Date(nowMs + PRO_PROMO_DURATION_MS).toISOString();
}

function mockPlayCatalog(): void {
	mockGetProducts.mockImplementation(({ productIdentifiers }: { productIdentifiers: string[] }) => {
		const products = productIdentifiers.flatMap((id) => {
			if (id === PRO_PROMO_PRODUCT_ID) {
				return [
					{
						productIdentifier: PRO_PROMO_PRODUCT_ID,
						priceString: '19,00 €',
						title: 'Pro Promo'
					}
				];
			}
			if (id === PRO_PRODUCT_ID) {
				return [
					{
						productIdentifier: PRO_PRODUCT_ID,
						priceString: '29,00 €',
						title: 'Pro'
					}
				];
			}
			return [];
		});
		return Promise.resolve({ products });
	});
}

describe('restoreProPurchase', () => {
	beforeEach(() => {
		resetBillingQueueForTests();
		mockIsAndroidApp.mockReturnValue(true);
		proEntitlementState.isPro = false;
		proEntitlementState.purchasePending = false;
		proEntitlementState.lastError = null;
		mockGetPurchases.mockReset();
		mockAcknowledgePurchase.mockReset();
		mockAcknowledgePurchase.mockResolvedValue(undefined);
	});

	it('returns true when Play sync grants Pro', async () => {
		mockGetPurchases.mockResolvedValue({
			purchases: [
				{
					productIdentifier: PRO_PRODUCT_ID,
					purchaseToken: 'restore-token',
					purchaseState: '1'
				}
			]
		});

		await expect(restoreProPurchase()).resolves.toBe(true);
		expect(proEntitlementState.isPro).toBe(true);
		expect(proEntitlementState.purchasePending).toBe(false);
	});

	it('returns false when no valid purchase is found after sync', async () => {
		mockGetPurchases.mockResolvedValue({ purchases: [] });

		await expect(restoreProPurchase()).resolves.toBe(false);
		expect(proEntitlementState.isPro).toBe(false);
		expect(proEntitlementState.lastError).toBeNull();
		expect(proEntitlementState.purchasePending).toBe(false);
	});

	it('surfaces a restore error when Play sync fails without a cached purchase', async () => {
		mockGetPurchases.mockRejectedValue(new Error('billing_unavailable'));

		await expect(restoreProPurchase()).resolves.toBe(false);
		expect(proEntitlementState.isPro).toBe(false);
		expect(proEntitlementState.lastError).toBe('restore_failed');
		expect(proEntitlementState.purchasePending).toBe(false);
	});

	it('returns false immediately when billing is unsupported', async () => {
		mockIsAndroidApp.mockReturnValue(false);

		await expect(restoreProPurchase()).resolves.toBe(false);
		expect(mockGetPurchases).not.toHaveBeenCalled();
	});
});

describe('getActiveProOffer', () => {
	beforeEach(() => {
		resetBillingQueueForTests();
		mockIsAndroidApp.mockReturnValue(true);
		proPromoState.promoEndsAt = null;
		proEntitlementState.purchasePending = false;
		mockGetProducts.mockReset();
		vi.useRealTimers();
	});

	it('returns promo phase and prices when promo window is active', async () => {
		setPromoWindow(NOW);
		mockPlayCatalog();

		await expect(getActiveProOffer(NOW)).resolves.toEqual({
			phase: 'promo',
			productId: PRO_PROMO_PRODUCT_ID,
			priceString: '19,00 €',
			fullPriceString: '29,00 €',
			promoEndsAt: proPromoState.promoEndsAt,
			remainingMs: PRO_PROMO_DURATION_MS
		});
	});

	it('returns expired phase and standard prices after promo ends', async () => {
		proPromoState.promoEndsAt = '2026-06-01T12:00:00.000Z';
		mockPlayCatalog();

		await expect(getActiveProOffer(Date.parse('2026-06-02T13:00:00.000Z'))).resolves.toEqual({
			phase: 'expired',
			productId: PRO_PRODUCT_ID,
			priceString: '29,00 €',
			fullPriceString: '29,00 €',
			promoEndsAt: '2026-06-01T12:00:00.000Z',
			remainingMs: 0
		});
	});

	it('returns phase metadata without prices when billing is unsupported', async () => {
		mockIsAndroidApp.mockReturnValue(false);
		setPromoWindow(NOW);

		await expect(getActiveProOffer(NOW)).resolves.toMatchObject({
			phase: 'promo',
			productId: PRO_PROMO_PRODUCT_ID,
			priceString: null,
			fullPriceString: null
		});
		expect(mockGetProducts).not.toHaveBeenCalled();
	});
});
