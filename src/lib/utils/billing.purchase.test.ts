import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportProductId } from '$lib/constants/support';
import { supportBillingState } from '$lib/stores/supportBilling.svelte';
import { resetBillingQueueForTests } from './billing-native-queue';

const { mockPurchaseProduct, mockGetPurchases, mockConsumePurchase, mockGetProducts } = vi.hoisted(
	() => ({
		mockPurchaseProduct: vi.fn(),
		mockGetPurchases: vi.fn(),
		mockConsumePurchase: vi.fn(),
		mockGetProducts: vi.fn()
	})
);

vi.mock('@capgo/native-purchases', () => ({
	NativePurchases: {
		purchaseProduct: mockPurchaseProduct,
		getPurchases: mockGetPurchases,
		consumePurchase: mockConsumePurchase,
		getProducts: mockGetProducts
	},
	PURCHASE_TYPE: { INAPP: 'inapp' }
}));

vi.mock('capacitor-secure-storage-plugin', () => ({
	SecureStoragePlugin: {
		get: vi.fn(),
		set: vi.fn(),
		remove: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		remove: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: vi.fn(() => true),
	isAndroidApp: vi.fn(() => true)
}));

import {
	initSupportBilling,
	purchaseSupport,
	reconcilePendingPurchase,
	resetSupportPurchaseSessionForTests,
	syncSupportPurchasesFromStore
} from './billing';

const TIP_2 = 'yamadori_support_2' as const;
const TIP_5 = 'yamadori_support_5' as const;

function purchased(productId: string, token: string) {
	return {
		productIdentifier: productId,
		purchaseToken: token,
		purchaseState: '1'
	};
}

describe('purchaseSupport', () => {
	beforeEach(() => {
		resetBillingQueueForTests();
		resetSupportPurchaseSessionForTests();
		mockPurchaseProduct.mockReset();
		mockGetPurchases.mockReset();
		mockConsumePurchase.mockReset();
		mockGetProducts.mockReset();
		mockConsumePurchase.mockResolvedValue(undefined);
		mockGetPurchases.mockResolvedValue({ purchases: [] });
	});

	it('consumes a successful tip and does not unlock a feature', async () => {
		mockPurchaseProduct.mockResolvedValue(purchased(TIP_2, 'token-a'));

		const success = await purchaseSupport(TIP_2);

		expect(success).toBe(true);
		expect(supportBillingState.lastError).toBeNull();
		expect(supportBillingState.purchasePending).toBe(false);
		expect(supportBillingState.legacySupporter).toBe(false);
		expect(Object.keys(supportBillingState)).toEqual([
			'purchasePending',
			'lastError',
			'legacySupporter'
		]);
		expect(mockPurchaseProduct).toHaveBeenCalledWith({
			productIdentifier: TIP_2,
			productType: 'inapp',
			quantity: 1,
			isConsumable: false,
			autoAcknowledgePurchases: false
		});
		expect(mockConsumePurchase).toHaveBeenCalledWith({ purchaseToken: 'token-a' });
	});

	it('consumes a new token on a second tip', async () => {
		mockPurchaseProduct
			.mockResolvedValueOnce(purchased(TIP_2, 'token-a'))
			.mockResolvedValueOnce(purchased(TIP_5, 'token-b'));

		await expect(purchaseSupport(TIP_2)).resolves.toBe(true);
		await expect(purchaseSupport(TIP_5)).resolves.toBe(true);

		expect(mockConsumePurchase).toHaveBeenNthCalledWith(1, { purchaseToken: 'token-a' });
		expect(mockConsumePurchase).toHaveBeenNthCalledWith(2, { purchaseToken: 'token-b' });
		expect(supportBillingState.legacySupporter).toBe(false);
	});

	it('treats a repeated consume of the same token as success without calling Play again', async () => {
		mockPurchaseProduct.mockResolvedValue(purchased(TIP_2, 'token-a'));

		await expect(purchaseSupport(TIP_2)).resolves.toBe(true);
		await expect(purchaseSupport(TIP_2)).resolves.toBe(true);

		expect(mockConsumePurchase).toHaveBeenCalledTimes(1);
	});

	it('returns false and clears the error when the user cancels', async () => {
		mockPurchaseProduct.mockRejectedValue(new Error('User cancelled'));

		const success = await purchaseSupport(TIP_2);

		expect(success).toBe(false);
		expect(supportBillingState.lastError).toBeNull();
		expect(supportBillingState.purchasePending).toBe(false);
		expect(mockConsumePurchase).not.toHaveBeenCalled();
	});

	it('does not consume when purchaseState is missing', async () => {
		mockPurchaseProduct.mockResolvedValue({
			productIdentifier: TIP_2,
			purchaseToken: 'fresh-token'
		});

		const success = await purchaseSupport(TIP_2);

		expect(success).toBe(false);
		expect(supportBillingState.lastError).toBe('purchase_failed');
		expect(mockConsumePurchase).not.toHaveBeenCalled();
	});

	it('rejects a non-support SKU before opening Play', async () => {
		const success = await purchaseSupport('yamadori_pro' as SupportProductId);

		expect(success).toBe(false);
		expect(mockPurchaseProduct).not.toHaveBeenCalled();
		expect(mockConsumePurchase).not.toHaveBeenCalled();
	});

	it('does not consume a purchase Play returns for another SKU', async () => {
		mockPurchaseProduct.mockResolvedValue(purchased('other.sku', 'fresh-token'));

		const success = await purchaseSupport(TIP_2);

		expect(success).toBe(false);
		expect(supportBillingState.lastError).toBe('purchase_failed');
		expect(mockConsumePurchase).not.toHaveBeenCalled();
	});

	it('consumes an already-owned tip so it can be bought again', async () => {
		mockPurchaseProduct.mockRejectedValue(new Error('ITEM_ALREADY_OWNED'));
		mockGetPurchases.mockResolvedValue({
			purchases: [purchased(TIP_2, 'owned-token')]
		});

		const success = await purchaseSupport(TIP_2);

		expect(success).toBe(true);
		expect(supportBillingState.legacySupporter).toBe(false);
		expect(mockConsumePurchase).toHaveBeenCalledWith({ purchaseToken: 'owned-token' });
	});

	it('sets consume_failed when Play refuses to consume', async () => {
		mockPurchaseProduct.mockResolvedValue(purchased(TIP_2, 'token-a'));
		mockConsumePurchase.mockRejectedValue(new Error('billing unavailable'));

		const success = await purchaseSupport(TIP_2);

		expect(success).toBe(false);
		expect(supportBillingState.lastError).toBe('consume_failed');
	});

	it('treats an already-consumed token as a successful tip', async () => {
		mockPurchaseProduct.mockResolvedValue(purchased(TIP_2, 'token-a'));
		mockConsumePurchase.mockRejectedValue(new Error('Item already consumed'));

		const success = await purchaseSupport(TIP_2);

		expect(success).toBe(true);
		expect(supportBillingState.lastError).toBeNull();
	});

	it('sets purchase_timeout when the sheet never returns', async () => {
		vi.useFakeTimers();
		try {
			mockPurchaseProduct.mockReturnValue(new Promise(() => undefined));

			const pending = purchaseSupport(TIP_2);
			await vi.advanceTimersByTimeAsync(45_000);

			await expect(pending).resolves.toBe(false);
			expect(supportBillingState.lastError).toBe('purchase_timeout');
			expect(supportBillingState.purchasePending).toBe(false);
			expect(mockConsumePurchase).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('syncSupportPurchasesFromStore', () => {
	beforeEach(() => {
		resetBillingQueueForTests();
		resetSupportPurchaseSessionForTests();
		mockGetPurchases.mockReset();
		mockConsumePurchase.mockReset();
		mockConsumePurchase.mockResolvedValue(undefined);
	});

	it('consumes a pending tip and thanks a legacy Pro buyer without consuming Pro', async () => {
		mockGetPurchases.mockResolvedValue({
			purchases: [
				purchased('yamadori_pro', 'pro-token'),
				purchased(TIP_5, 'tip-token')
			]
		});

		const sync = await syncSupportPurchasesFromStore();

		expect(sync).toEqual({ consumed: 1, legacySupporter: true });
		expect(supportBillingState.legacySupporter).toBe(true);
		expect(mockConsumePurchase).toHaveBeenCalledTimes(1);
		expect(mockConsumePurchase).toHaveBeenCalledWith({ purchaseToken: 'tip-token' });
	});

	it('reconciles an in-flight tip on resume', async () => {
		supportBillingState.purchasePending = true;
		mockGetPurchases.mockResolvedValue({
			purchases: [purchased(TIP_5, 'pending-token')]
		});

		const result = await reconcilePendingPurchase();

		expect(result).toBe('completed');
		expect(supportBillingState.purchasePending).toBe(false);
		expect(mockConsumePurchase).toHaveBeenCalledWith({ purchaseToken: 'pending-token' });
	});

	it('clears leftover Pro storage and consumes a leftover tip on init', async () => {
		const { Preferences } = await import('@capacitor/preferences');
		mockGetPurchases.mockResolvedValue({
			purchases: [purchased(TIP_2, 'leftover')]
		});

		const sync = await initSupportBilling();

		expect(sync.consumed).toBe(1);
		expect(Preferences.remove).toHaveBeenCalled();
		expect(mockConsumePurchase).toHaveBeenCalledWith({ purchaseToken: 'leftover' });
	});
});
