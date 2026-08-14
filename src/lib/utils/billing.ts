import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import {
	isProProductId,
	PRO_PRODUCT_ID,
	PRO_PROMO_PRODUCT_ID,
	PRO_PRODUCT_IDS
} from '$lib/constants/pro';
import { proPromoState } from '$lib/stores/proPromo.svelte';
import {
	applyEntitlementFromPurchase,
	applyOfflineEntitlementFromSecureStorage,
	clearEntitlement,
	proEntitlementState,
	setProLastError,
	setProPurchasePending
} from '$lib/stores/proEntitlement.svelte';
import {
	getProPromoState,
	resolveProProductId,
	type ProOfferPhase
} from '$lib/utils/proOffer';
import {
	isBillingAlreadyOwnedError,
	isBillingCancellationError,
	normalizeBillingErrorCode
} from '$lib/utils/billing-errors';
import {
	delay,
	isValidPlayPriceString,
	normalizePlayPriceString
} from '$lib/utils/billing-price';
import { runBillingTask, waitForBillingIdle } from '$lib/utils/billing-native-queue';
import { isAndroidApp } from '$lib/utils/platform';

const PRODUCT_FETCH_ATTEMPTS = 5;
const PRODUCT_FETCH_RETRY_MS = 400;
const PRODUCT_FETCH_TIMEOUT_MS = 12_000;
const PURCHASE_TIMEOUT_MS = 45_000;
const BILLING_RETRY_COOLDOWN_MS = 300;
const PURCHASE_RECONCILE_DEBOUNCE_MS = 400;
const PURCHASE_GRACE_PERIOD_MS = 800;

let inflightPurchaseResolve: ((transaction: BillingTransaction) => void) | null = null;
let inflightPurchaseReject: ((error: Error) => void) | null = null;
let inflightPurchaseTimeoutId: ReturnType<typeof setTimeout> | null = null;
let reconcileTimeoutId: ReturnType<typeof setTimeout> | null = null;
let activePurchaseGeneration = 0;
let purchaseLaunchedAt = 0;

function clearInflightPurchaseHandlers(): void {
	inflightPurchaseResolve = null;
	inflightPurchaseReject = null;
	if (inflightPurchaseTimeoutId !== null) {
		clearTimeout(inflightPurchaseTimeoutId);
		inflightPurchaseTimeoutId = null;
	}
}

function resolveInflightPurchase(transaction: BillingTransaction): void {
	if (inflightPurchaseResolve) {
		const resolve = inflightPurchaseResolve;
		clearInflightPurchaseHandlers();
		resolve(transaction);
	}
}

function abortInflightPurchasePromise(reason: string): void {
	if (reconcileTimeoutId !== null) {
		clearTimeout(reconcileTimeoutId);
		reconcileTimeoutId = null;
	}
	if (inflightPurchaseReject) {
		const reject = inflightPurchaseReject;
		clearInflightPurchaseHandlers();
		reject(new Error(reason));
	}
}

export function abortInflightPurchase(reason = 'purchase_aborted'): void {
	abortInflightPurchasePromise(reason);
	setProPurchasePending(false);
}

export type PurchaseReconcileResult = 'completed' | 'cancelled' | 'still_pending';

export function scheduleBillingReconcile(): void {
	if (!proEntitlementState.purchasePending) {
		return;
	}
	if (reconcileTimeoutId !== null) {
		clearTimeout(reconcileTimeoutId);
	}
	reconcileTimeoutId = setTimeout(() => {
		reconcileTimeoutId = null;
		void reconcilePendingPurchase();
	}, PURCHASE_RECONCILE_DEBOUNCE_MS);
}

/** @deprecated Use scheduleBillingReconcile */
export function handleBillingAppResume(): void {
	scheduleBillingReconcile();
}

export async function reconcilePendingPurchase(): Promise<PurchaseReconcileResult> {
	if (!proEntitlementState.purchasePending) {
		return 'still_pending';
	}
	if (Date.now() - purchaseLaunchedAt < PURCHASE_GRACE_PERIOD_MS) {
		return 'still_pending';
	}

	if (!isBillingSupported()) {
		return 'still_pending';
	}

	try {
		const { purchases } = await NativePurchases.getPurchases({
			productType: PURCHASE_TYPE.INAPP
		});
		const validPurchase = findValidProPurchase(purchases ?? []);
		if (validPurchase) {
			const granted = await grantProFromPurchase(validPurchase);
			if (granted) {
				resolveInflightPurchase(validPurchase);
				setProPurchasePending(false);
				return 'completed';
			}
			if (proEntitlementState.lastError === 'acknowledge_failed') {
				return 'still_pending';
			}
		}
	} catch {
		// Fall through to cancellation.
	}

	abortInflightPurchase('purchase_aborted_on_resume');
	return 'cancelled';
}

export interface PurchasableProductResolution {
	productId: string;
	promoWindowActive: boolean;
}

export type BillingTransaction = {
	productIdentifier?: string;
	transactionId?: string;
	purchaseToken?: string;
	purchaseState?: string | number;
	isAcknowledged?: boolean;
};

type PlayCatalogProduct = {
	identifier?: string;
	productIdentifier?: string;
	priceString?: string;
	title?: string;
};

export interface ProProductInfo {
	priceString: string;
	title: string;
	productId: string;
}

export interface ProActiveOffer {
	phase: ProOfferPhase;
	productId: string;
	priceString: string | null;
	fullPriceString: string | null;
	promoEndsAt: string | null;
	remainingMs: number;
}

export function isBillingAvailable(): boolean {
	return isBillingSupported();
}

export function isValidProPurchase(transaction: BillingTransaction): boolean {
	if (!transaction.productIdentifier || !isProProductId(transaction.productIdentifier)) {
		return false;
	}
	if (!isPurchasedState(transaction.purchaseState)) {
		return false;
	}
	return Boolean(transaction.purchaseToken || transaction.transactionId);
}

export function getPurchaseToken(transaction: BillingTransaction): string | null {
	return transaction.purchaseToken ?? transaction.transactionId ?? null;
}

export function findValidProPurchase(
	transactions: BillingTransaction[]
): BillingTransaction | null {
	return transactions.find(isValidProPurchase) ?? null;
}

export function isBillingSupported(): boolean {
	return isAndroidApp();
}

function isPurchasedState(state: string | number | undefined): boolean {
	if (state === undefined) {
		return false;
	}
	return state === 1 || state === '1' || state === 'PURCHASED';
}

async function ensurePurchaseAcknowledged(transaction: BillingTransaction): Promise<void> {
	const token = getPurchaseToken(transaction);
	if (!token || transaction.isAcknowledged === true) {
		return;
	}

	await runBillingTask(() =>
		NativePurchases.acknowledgePurchase({ purchaseToken: token })
	);
}

async function grantProFromPurchase(transaction: BillingTransaction): Promise<boolean> {
	const token = getPurchaseToken(transaction);
	if (!token) {
		return false;
	}

	try {
		await ensurePurchaseAcknowledged(transaction);
	} catch {
		setProLastError('acknowledge_failed');
		return false;
	}

	await applyEntitlementFromPurchase(
		token,
		transaction.productIdentifier ?? PRO_PRODUCT_ID
	);
	return true;
}

function getPlayProductId(product: PlayCatalogProduct): string | null {
	return product.productIdentifier ?? product.identifier ?? null;
}

function parseProProductInfo(
	product: PlayCatalogProduct,
	expectedId: string
): ProProductInfo | null {
	const rawPrice = product.priceString?.trim() ?? '';
	const priceString = rawPrice ? normalizePlayPriceString(rawPrice) : '';
	if (!isValidPlayPriceString(priceString)) {
		return null;
	}

	return {
		productId: getPlayProductId(product) ?? expectedId,
		priceString,
		title: product.title ?? expectedId
	};
}

export async function syncProEntitlementFromStore(): Promise<void> {
	if (!isBillingSupported()) {
		await applyOfflineEntitlementFromSecureStorage();
		return;
	}

	try {
		const { purchases } = await runBillingTask(() =>
			NativePurchases.getPurchases({
				productType: PURCHASE_TYPE.INAPP
			})
		);
		const validPurchase = findValidProPurchase(purchases ?? []);

		if (validPurchase) {
			const granted = await grantProFromPurchase(validPurchase);
			if (granted) {
				return;
			}
			if (proEntitlementState.lastError === 'acknowledge_failed') {
				await applyOfflineEntitlementFromSecureStorage();
				setProLastError('acknowledge_failed');
				return;
			}
		}

		await clearEntitlement();
	} catch {
		await applyOfflineEntitlementFromSecureStorage();
		if (!proEntitlementState.isPro) {
			setProLastError('restore_failed');
		}
	}
}

export function resolvePurchasableProductId(
	nowMs: number = Date.now()
): PurchasableProductResolution {
	const productId = resolveProProductId(proPromoState.promoEndsAt, nowMs);
	return {
		productId,
		promoWindowActive: productId === PRO_PROMO_PRODUCT_ID
	};
}

async function purchaseProductWithTimeout(productId: string): Promise<BillingTransaction> {
	abortInflightPurchasePromise('purchase_superseded');
	purchaseLaunchedAt = Date.now();

	return new Promise<BillingTransaction>((resolve, reject) => {
		inflightPurchaseResolve = resolve;
		inflightPurchaseReject = reject;

		inflightPurchaseTimeoutId = setTimeout(() => {
			if (inflightPurchaseReject === reject) {
				clearInflightPurchaseHandlers();
				reject(new Error('purchase_timeout'));
			}
		}, PURCHASE_TIMEOUT_MS);

		void NativePurchases.purchaseProduct({
			productIdentifier: productId,
			productType: PURCHASE_TYPE.INAPP,
			quantity: 1
		})
			.then((transaction) => {
				if (inflightPurchaseResolve === resolve) {
					clearInflightPurchaseHandlers();
					resolve(transaction);
				}
			})
			.catch((error: unknown) => {
				if (inflightPurchaseReject === reject) {
					clearInflightPurchaseHandlers();
					reject(error instanceof Error ? error : new Error(String(error)));
				}
			});
	});
}

async function handleAlreadyOwnedPurchase(productId: string): Promise<boolean> {
	await syncProEntitlementFromStore();
	if (proEntitlementState.isPro) {
		return true;
	}
	if (productId === PRO_PROMO_PRODUCT_ID) {
		setProLastError('promo_purchase_blocked');
		return false;
	}
	return restoreProPurchase();
}

function mapPromoPurchaseError(code: string, promoWindowActive: boolean): string {
	if (!promoWindowActive) {
		return code;
	}
	if (code === 'purchase_failed') {
		return 'promo_purchase_failed';
	}
	return code;
}

export async function purchasePro(nowMs: number = Date.now()): Promise<boolean> {
	if (!isBillingSupported()) {
		return false;
	}

	if (proEntitlementState.purchasePending) {
		abortInflightPurchase('purchase_superseded');
		await waitForBillingIdle();
		await delay(BILLING_RETRY_COOLDOWN_MS);
	}

	const generation = ++activePurchaseGeneration;
	const { productId, promoWindowActive } = resolvePurchasableProductId(nowMs);

	setProPurchasePending(true);
	setProLastError(null);

	try {
		const transaction = await purchaseProductWithTimeout(productId);

		if (!getPurchaseToken(transaction)) {
			setProLastError('missing_purchase_token');
			return false;
		}

		const granted = await grantProFromPurchase({
			...transaction,
			productIdentifier: transaction.productIdentifier ?? productId
		});
		return granted;
	} catch (error) {
		const code = normalizeBillingErrorCode(error);
		if (isBillingCancellationError(code)) {
			setProLastError(null);
			return false;
		}
		if (isBillingAlreadyOwnedError(code)) {
			return handleAlreadyOwnedPurchase(productId);
		}
		setProLastError(mapPromoPurchaseError(code, promoWindowActive));
		return false;
	} finally {
		if (generation === activePurchaseGeneration) {
			setProPurchasePending(false);
		}
	}
}

export async function restoreProPurchase(): Promise<boolean> {
	if (!isBillingSupported()) {
		return false;
	}

	setProPurchasePending(true);
	setProLastError(null);

	try {
		await syncProEntitlementFromStore();
		return proEntitlementState.isPro;
	} catch (error) {
		setProLastError(
			normalizeBillingErrorCode(error) === 'purchase_failed'
				? 'restore_failed'
				: normalizeBillingErrorCode(error)
		);
		return false;
	} finally {
		setProPurchasePending(false);
	}
}

async function getProductsBatchWithTimeout(productIds: string[]) {
	return runBillingTask(() =>
		Promise.race([
			NativePurchases.getProducts({
				productIdentifiers: productIds,
				productType: PURCHASE_TYPE.INAPP
			}),
			new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('product_fetch_timeout')), PRODUCT_FETCH_TIMEOUT_MS);
			})
		])
	);
}

async function fetchProProductsMap(
	productIds: string[]
): Promise<Map<string, ProProductInfo>> {
	const uniqueIds = [...new Set(productIds.filter((id) => (PRO_PRODUCT_IDS as readonly string[]).includes(id)))];
	if (!isBillingSupported() || uniqueIds.length === 0 || proEntitlementState.purchasePending) {
		return new Map();
	}

	let lastMap = new Map<string, ProProductInfo>();

	for (let attempt = 0; attempt < PRODUCT_FETCH_ATTEMPTS; attempt += 1) {
		try {
			const { products } = await getProductsBatchWithTimeout(uniqueIds);
			const map = new Map<string, ProProductInfo>();

			for (const product of products ?? []) {
				const productId = getPlayProductId(product);
				if (!productId || !uniqueIds.includes(productId)) {
					continue;
				}
				const parsed = parseProProductInfo(product, productId);
				if (parsed) {
					map.set(productId, parsed);
				}
			}

			lastMap = map;
			const catalogComplete = uniqueIds.every((id) => map.has(id));
			if (catalogComplete || attempt === PRODUCT_FETCH_ATTEMPTS - 1) {
				return map;
			}
		} catch {
			if (attempt === PRODUCT_FETCH_ATTEMPTS - 1) {
				return lastMap;
			}
		}

		if (attempt < PRODUCT_FETCH_ATTEMPTS - 1) {
			await delay(PRODUCT_FETCH_RETRY_MS * (attempt + 1));
		}
	}

	return lastMap;
}

export async function getProProduct(productId: string = PRO_PRODUCT_ID): Promise<ProProductInfo | null> {
	const map = await fetchProProductsMap([productId]);
	return map.get(productId) ?? null;
}

function resolveActiveOfferState(nowMs: number = Date.now()) {
	const promoState = getProPromoState(proPromoState.promoEndsAt, nowMs);
	const productId = resolveProProductId(proPromoState.promoEndsAt, nowMs);
	return { ...promoState, productId };
}

export async function getActiveProOffer(nowMs: number = Date.now()): Promise<ProActiveOffer> {
	const { phase, promoEndsAt, remainingMs, productId } = resolveActiveOfferState(nowMs);

	if (!isBillingSupported()) {
		return {
			phase,
			productId,
			priceString: null,
			fullPriceString: null,
			promoEndsAt,
			remainingMs
		};
	}

	const productIds =
		productId === PRO_PRODUCT_ID ? [PRO_PRODUCT_ID] : [productId, PRO_PRODUCT_ID];
	const products = await fetchProProductsMap(productIds);
	const activeProduct = products.get(productId) ?? null;
	const fullProduct = products.get(PRO_PRODUCT_ID) ?? null;

	return {
		phase,
		productId,
		priceString: activeProduct?.priceString ?? null,
		fullPriceString:
			fullProduct?.priceString ??
			(productId === PRO_PRODUCT_ID ? activeProduct?.priceString ?? null : null),
		promoEndsAt,
		remainingMs
	};
}
