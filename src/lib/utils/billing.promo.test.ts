import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	PRO_PRODUCT_ID,
	PRO_PROMO_PRODUCT_ID,
	PRO_PROMO_DURATION_MS
} from '$lib/constants/pro';
import { proEntitlementState } from '$lib/stores/proEntitlement.svelte';
import { proPromoState } from '$lib/stores/proPromo.svelte';

const { mockPurchaseProduct, mockGetPurchases, mockGetProducts, mockAcknowledgePurchase } =
	vi.hoisted(() => ({
		mockPurchaseProduct: vi.fn(),
		mockGetPurchases: vi.fn(),
		mockGetProducts: vi.fn(),
		mockAcknowledgePurchase: vi.fn()
	}));

vi.mock('@capgo/native-purchases', () => ({
	NativePurchases: {
		purchaseProduct: mockPurchaseProduct,
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
	isAndroidApp: vi.fn(() => true)
}));

import { resetBillingQueueForTests } from './billing-native-queue';
import {
	abortInflightPurchase,
	handleBillingAppResume,
	purchasePro,
	reconcilePendingPurchase,
	resolvePurchasableProductId,
	getProProduct,
	getActiveProOffer
} from './billing';

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

describe('resolvePurchasableProductId', () => {
	beforeEach(() => {
		resetBillingQueueForTests();
		proPromoState.promoEndsAt = null;
	});

	it('uses the standard SKU when the promo window is inactive', () => {
		expect(resolvePurchasableProductId(NOW)).toEqual({
			productId: PRO_PRODUCT_ID,
			promoWindowActive: false
		});
	});

	it('uses the promo SKU when the promo window is active', () => {
		setPromoWindow(NOW);

		expect(resolvePurchasableProductId(NOW)).toEqual({
			productId: PRO_PROMO_PRODUCT_ID,
			promoWindowActive: true
		});
	});
});

describe('purchasePro promo flow', () => {
	beforeEach(() => {
		resetBillingQueueForTests();
		proPromoState.promoEndsAt = null;
		proEntitlementState.isPro = false;
		proEntitlementState.purchasePending = false;
		proEntitlementState.lastError = null;
		mockPurchaseProduct.mockReset();
		mockGetPurchases.mockReset();
		mockGetProducts.mockReset();
		mockAcknowledgePurchase.mockReset();
		mockAcknowledgePurchase.mockResolvedValue(undefined);
		vi.useRealTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('attempts promo purchase even when Play price fetch returns empty', async () => {
		setPromoWindow(NOW);
		mockGetProducts.mockResolvedValue({ products: [] });
		mockPurchaseProduct.mockResolvedValue({
			productIdentifier: PRO_PROMO_PRODUCT_ID,
			purchaseToken: 'promo-token',
			purchaseState: '1'
		});

		const success = await purchasePro(NOW);

		expect(success).toBe(true);
		expect(mockPurchaseProduct).toHaveBeenCalledWith(
			expect.objectContaining({ productIdentifier: PRO_PROMO_PRODUCT_ID })
		);
	});

	it('purchases the promo SKU when the promo window is active', async () => {
		setPromoWindow(NOW);
		mockPlayCatalog();
		mockPurchaseProduct.mockResolvedValue({
			productIdentifier: PRO_PROMO_PRODUCT_ID,
			purchaseToken: 'promo-token',
			purchaseState: '1'
		});

		const success = await purchasePro(NOW);

		expect(success).toBe(true);
		expect(mockPurchaseProduct).toHaveBeenCalledWith(
			expect.objectContaining({ productIdentifier: PRO_PROMO_PRODUCT_ID })
		);
	});

	it('purchases the standard SKU after the promo window expires', async () => {
		proPromoState.promoEndsAt = '2026-06-01T12:00:00.000Z';
		mockPurchaseProduct.mockResolvedValue({
			productIdentifier: PRO_PRODUCT_ID,
			purchaseToken: 'full-token',
			purchaseState: '1'
		});

		const success = await purchasePro(Date.parse('2026-06-02T13:00:00.000Z'));

		expect(success).toBe(true);
		expect(mockPurchaseProduct).toHaveBeenCalledWith(
			expect.objectContaining({ productIdentifier: PRO_PRODUCT_ID })
		);
	});

	it('reports promo_purchase_blocked when Play says already owned but no entitlement exists', async () => {
		setPromoWindow(NOW);
		mockPlayCatalog();
		mockPurchaseProduct.mockRejectedValue(new Error('ITEM_ALREADY_OWNED'));
		mockGetPurchases.mockResolvedValue({ purchases: [] });

		const success = await purchasePro(NOW);

		expect(success).toBe(false);
		expect(proEntitlementState.lastError).toBe('promo_purchase_blocked');
		expect(proEntitlementState.purchasePending).toBe(false);
	});

	it('maps generic purchase failures to promo_purchase_failed during promo window', async () => {
		setPromoWindow(NOW);
		mockPurchaseProduct.mockRejectedValue(new Error('purchase_failed'));

		const success = await purchasePro(NOW);

		expect(success).toBe(false);
		expect(proEntitlementState.lastError).toBe('promo_purchase_failed');
	});

	it('clears purchasePending after a purchase timeout', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		setPromoWindow(NOW);
		mockPlayCatalog();
		mockPurchaseProduct.mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves — timeout should win.
				})
		);

		const purchasePromise = purchasePro(NOW);
		await vi.advanceTimersByTimeAsync(45_001);
		const success = await purchasePromise;

		expect(success).toBe(false);
		expect(proEntitlementState.lastError).toBe('purchase_timeout');
		expect(proEntitlementState.purchasePending).toBe(false);
	});

	it('clears pending on USER_CANCELED without setting lastError', async () => {
		mockPurchaseProduct.mockRejectedValue(new Error('USER_CANCELED'));

		const success = await purchasePro(NOW);

		expect(success).toBe(false);
		expect(proEntitlementState.purchasePending).toBe(false);
		expect(proEntitlementState.lastError).toBeNull();
	});

	it('supersedes a hung purchase when purchasePro is called again', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		mockPurchaseProduct
			.mockImplementationOnce(
				() =>
					new Promise(() => {
						// Simulates a stale native purchase flow.
					})
			)
			.mockResolvedValueOnce({
				productIdentifier: PRO_PRODUCT_ID,
				purchaseToken: 'retry-token',
				purchaseState: '1'
			});

		const firstPromise = purchasePro(NOW);
		await Promise.resolve();
		expect(proEntitlementState.purchasePending).toBe(true);

		const secondPromise = purchasePro(NOW);
		await vi.advanceTimersByTimeAsync(300);
		const secondSuccess = await secondPromise;

		expect(secondSuccess).toBe(true);
		await firstPromise;
		expect(mockPurchaseProduct).toHaveBeenCalledTimes(2);
		expect(proEntitlementState.purchasePending).toBe(false);
	});

	it('reconciles a stale purchase on app resume after grace period', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(NOW);
		mockPurchaseProduct.mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves — reconcile should settle.
				})
		);
		mockGetPurchases.mockResolvedValue({ purchases: [] });

		const purchasePromise = purchasePro(NOW);
		expect(proEntitlementState.purchasePending).toBe(true);

		await vi.advanceTimersByTimeAsync(801);
		handleBillingAppResume();
		await vi.advanceTimersByTimeAsync(401);
		await purchasePromise;

		expect(proEntitlementState.purchasePending).toBe(false);
		expect(mockGetPurchases).toHaveBeenCalled();
	});

	it('completes purchase via reconcile when Play reports a valid purchase', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(NOW);
		mockPurchaseProduct.mockImplementation(
			() =>
				new Promise(() => {
					// Native callback missing — reconcile should recover.
				})
		);
		mockGetPurchases.mockResolvedValue({
			purchases: [
				{
					productIdentifier: PRO_PRODUCT_ID,
					purchaseToken: 'reconciled-token',
					purchaseState: '1'
				}
			]
		});

		const purchasePromise = purchasePro(NOW);
		await vi.advanceTimersByTimeAsync(801);
		const result = await reconcilePendingPurchase();

		expect(result).toBe('completed');
		await expect(purchasePromise).resolves.toBe(true);
		expect(proEntitlementState.isPro).toBe(true);
		expect(proEntitlementState.purchasePending).toBe(false);
	});

	it('aborts in-flight purchase immediately via abortInflightPurchase', async () => {
		mockPurchaseProduct.mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves.
				})
		);

		const purchasePromise = purchasePro(NOW);
		await Promise.resolve();
		expect(proEntitlementState.purchasePending).toBe(true);

		abortInflightPurchase('purchase_aborted');
		const success = await purchasePromise;

		expect(success).toBe(false);
		expect(proEntitlementState.purchasePending).toBe(false);
		expect(proEntitlementState.lastError).toBeNull();
	});
});

describe('getProProduct', () => {
	beforeEach(() => {
		resetBillingQueueForTests();
		mockGetProducts.mockReset();
		vi.useRealTimers();
	});

	it('normalizes cold-start trailing e prices before validation', async () => {
		mockGetProducts.mockResolvedValue({
			products: [
				{
					productIdentifier: PRO_PROMO_PRODUCT_ID,
					priceString: '19,00 e',
					title: 'Pro Promo'
				}
			]
		});

		await expect(getProProduct(PRO_PROMO_PRODUCT_ID)).resolves.toEqual({
			productId: PRO_PROMO_PRODUCT_ID,
			priceString: '19,00 €',
			title: 'Pro Promo'
		});
	});

	it(
		'returns null when Play getProducts never resolves',
		async () => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			mockGetProducts.mockImplementation(
				() =>
					new Promise(() => {
						// Never resolves — timeout should win.
					})
			);

			const fetchPromise = getProProduct(PRO_PRODUCT_ID);
			await vi.runAllTimersAsync();
			const product = await fetchPromise;

			expect(product).toBeNull();
		},
		30_000
	);
});

describe('getActiveProOffer catalog retries', () => {
	beforeEach(() => {
		resetBillingQueueForTests();
		proPromoState.promoEndsAt = null;
		proEntitlementState.purchasePending = false;
		mockGetProducts.mockReset();
		vi.useRealTimers();
	});

	it('retries when the first Play response is missing the promo SKU', async () => {
		setPromoWindow(NOW);
		mockGetProducts
			.mockResolvedValueOnce({
				products: [
					{
						productIdentifier: PRO_PRODUCT_ID,
						priceString: '29,00 €',
						title: 'Pro'
					}
				]
			})
			.mockResolvedValueOnce({
				products: [
					{
						productIdentifier: PRO_PROMO_PRODUCT_ID,
						priceString: '19,00 €',
						title: 'Pro Promo'
					},
					{
						productIdentifier: PRO_PRODUCT_ID,
						priceString: '29,00 €',
						title: 'Pro'
					}
				]
			});

		const offer = await getActiveProOffer(NOW);

		expect(offer.productId).toBe(PRO_PROMO_PRODUCT_ID);
		expect(offer.priceString).toBe('19,00 €');
		expect(offer.fullPriceString).toBe('29,00 €');
		expect(mockGetProducts).toHaveBeenCalledTimes(2);
	});

	it('returns null promo price when every attempt stays partial', async () => {
		setPromoWindow(NOW);
		mockGetProducts.mockResolvedValue({
			products: [
				{
					productIdentifier: PRO_PRODUCT_ID,
					priceString: '29,00 €',
					title: 'Pro'
				}
			]
		});

		const offer = await getActiveProOffer(NOW);

		expect(offer.productId).toBe(PRO_PROMO_PRODUCT_ID);
		expect(offer.priceString).toBeNull();
		expect(offer.fullPriceString).toBe('29,00 €');
		expect(mockGetProducts).toHaveBeenCalledTimes(5);
	});
});
