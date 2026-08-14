import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRO_PRODUCT_ID } from '$lib/constants/pro';
import { proEntitlementState } from '$lib/stores/proEntitlement.svelte';

const { mockPurchaseProduct, mockGetPurchases, mockAcknowledgePurchase } = vi.hoisted(() => ({
	mockPurchaseProduct: vi.fn(),
	mockGetPurchases: vi.fn(),
	mockAcknowledgePurchase: vi.fn()
}));

vi.mock('@capgo/native-purchases', () => ({
	NativePurchases: {
		purchaseProduct: mockPurchaseProduct,
		getPurchases: mockGetPurchases,
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
	isAndroidApp: vi.fn(() => true)
}));

vi.mock('$lib/stores/proPromo.svelte', () => ({
	proPromoState: { promoEndsAt: null, loaded: true }
}));

import { purchasePro } from './billing';

describe('purchasePro', () => {
	beforeEach(() => {
		proEntitlementState.isPro = false;
		proEntitlementState.purchasePending = false;
		proEntitlementState.lastError = null;
		mockPurchaseProduct.mockReset();
		mockGetPurchases.mockReset();
		mockAcknowledgePurchase.mockReset();
		mockAcknowledgePurchase.mockResolvedValue(undefined);
	});

	it('acknowledges and activates Pro after a successful purchase', async () => {
		mockPurchaseProduct.mockResolvedValue({
			productIdentifier: PRO_PRODUCT_ID,
			purchaseToken: 'fresh-token',
			purchaseState: '1',
			isAcknowledged: false
		});

		const success = await purchasePro();

		expect(success).toBe(true);
		expect(proEntitlementState.isPro).toBe(true);
		expect(mockAcknowledgePurchase).toHaveBeenCalledWith({
			purchaseToken: 'fresh-token'
		});
	});

	it('skips acknowledgement when the purchase is already acknowledged', async () => {
		mockPurchaseProduct.mockResolvedValue({
			productIdentifier: PRO_PRODUCT_ID,
			purchaseToken: 'fresh-token',
			purchaseState: '1',
			isAcknowledged: true
		});

		const success = await purchasePro();

		expect(success).toBe(true);
		expect(mockAcknowledgePurchase).not.toHaveBeenCalled();
	});

	it('restores Pro when Play reports the item is already owned', async () => {
		mockPurchaseProduct.mockRejectedValue(new Error('ITEM_ALREADY_OWNED'));
		mockGetPurchases.mockResolvedValue({
			purchases: [
				{
					productIdentifier: PRO_PRODUCT_ID,
					purchaseToken: 'existing-token',
					purchaseState: '1',
					isAcknowledged: true
				}
			]
		});

		const success = await purchasePro();

		expect(success).toBe(true);
		expect(proEntitlementState.isPro).toBe(true);
		expect(mockGetPurchases).toHaveBeenCalled();
	});
});
