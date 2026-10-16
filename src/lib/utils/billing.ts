import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import {
	isLegacyProProductId,
	isSupportProductId,
	SUPPORT_PRODUCT_IDS,
	type SupportProductId
} from '$lib/constants/support';
import {
	setLegacySupporter,
	setSupportLastError,
	setSupportPurchasePending,
	supportBillingState,
	clearLegacyProStorage
} from '$lib/stores/supportBilling.svelte';
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

const consumedTokens = new Set<string>();

let inflightPurchaseResolve: ((transaction: BillingTransaction) => void) | null = null;
let inflightPurchaseReject: ((error: Error) => void) | null = null;
let inflightPurchaseTimeoutId: ReturnType<typeof setTimeout> | null = null;
let reconcileTimeoutId: ReturnType<typeof setTimeout> | null = null;
let activePurchaseGeneration = 0;
let purchaseLaunchedAt = 0;

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

export interface SupportProductInfo {
	priceString: string;
	title: string;
	productId: SupportProductId;
}

export type PurchaseReconcileResult = 'completed' | 'cancelled' | 'still_pending';

export type SupportStoreSync = {
	consumed: number;
	legacySupporter: boolean;
};

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
	setSupportPurchasePending(false);
}

export function isBillingSupported(): boolean {
	return isAndroidApp();
}

export function isBillingAvailable(): boolean {
	return isBillingSupported();
}

export function getPurchaseToken(transaction: BillingTransaction): string | null {
	return transaction.purchaseToken ?? transaction.transactionId ?? null;
}

function isPurchasedState(state: string | number | undefined): boolean {
	if (state === undefined) {
		return false;
	}
	return state === 1 || state === '1' || state === 'PURCHASED';
}

export function isValidSupportPurchase(transaction: BillingTransaction): boolean {
	if (!transaction.productIdentifier || !isSupportProductId(transaction.productIdentifier)) {
		return false;
	}
	if (!isPurchasedState(transaction.purchaseState)) {
		return false;
	}
	return Boolean(getPurchaseToken(transaction));
}

function isAlreadyConsumedError(error: unknown): boolean {
	const code = normalizeBillingErrorCode(error);
	return /already consumed|item not owned|not owned/i.test(code);
}

async function consumeSupportPurchase(token: string): Promise<void> {
	await runBillingTask(async () => {
		if (consumedTokens.has(token)) {
			return;
		}
		try {
			await NativePurchases.consumePurchase({ purchaseToken: token });
		} catch (error) {
			if (!isAlreadyConsumedError(error)) {
				throw error;
			}
		}
		consumedTokens.add(token);
	});
}

async function finalizeSupportPurchase(transaction: BillingTransaction): Promise<boolean> {
	if (!isValidSupportPurchase(transaction)) {
		setSupportLastError('purchase_failed');
		return false;
	}

	const token = getPurchaseToken(transaction);
	if (!token) {
		setSupportLastError('missing_purchase_token');
		return false;
	}

	try {
		await consumeSupportPurchase(token);
		setSupportLastError(null);
		return true;
	} catch {
		setSupportLastError('consume_failed');
		return false;
	}
}

async function listInAppPurchases(): Promise<BillingTransaction[]> {
	const { purchases } = await runBillingTask(() =>
		NativePurchases.getPurchases({
			productType: PURCHASE_TYPE.INAPP
		})
	);
	return purchases ?? [];
}

/** Consume unconsumed tips and note a legacy Pro purchase. Does not unlock anything. */
export async function syncSupportPurchasesFromStore(): Promise<SupportStoreSync> {
	if (!isBillingSupported()) {
		return { consumed: 0, legacySupporter: false };
	}

	const purchases = await listInAppPurchases();
	let legacySupporter = false;
	let consumed = 0;

	for (const purchase of purchases) {
		const productId = purchase.productIdentifier;
		if (productId && isLegacyProProductId(productId)) {
			legacySupporter = true;
		}
		if (!isValidSupportPurchase(purchase)) {
			continue;
		}
		const token = getPurchaseToken(purchase);
		if (!token || consumedTokens.has(token)) {
			continue;
		}
		await consumeSupportPurchase(token);
		consumed += 1;
	}

	setLegacySupporter(legacySupporter);
	return { consumed, legacySupporter };
}

export async function refreshLegacySupporter(): Promise<boolean> {
	const sync = await syncSupportPurchasesFromStore();
	return sync.legacySupporter;
}

export async function reconcilePendingPurchase(): Promise<PurchaseReconcileResult> {
	if (!supportBillingState.purchasePending) {
		return 'still_pending';
	}
	if (Date.now() - purchaseLaunchedAt < PURCHASE_GRACE_PERIOD_MS) {
		return 'still_pending';
	}
	if (!isBillingSupported()) {
		return 'still_pending';
	}

	try {
		const purchases = await listInAppPurchases();
		const pendingTip = purchases.find(isValidSupportPurchase) ?? null;
		if (pendingTip) {
			const granted = await finalizeSupportPurchase(pendingTip);
			if (granted) {
				resolveInflightPurchase(pendingTip);
				setSupportPurchasePending(false);
				return 'completed';
			}
			if (supportBillingState.lastError === 'consume_failed') {
				return 'still_pending';
			}
		}
	} catch {
		// Fall through to cancellation.
	}

	abortInflightPurchase('purchase_aborted_on_resume');
	return 'cancelled';
}

export function scheduleBillingReconcile(): void {
	if (!supportBillingState.purchasePending) {
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

async function purchaseProductWithTimeout(productId: SupportProductId): Promise<BillingTransaction> {
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
			quantity: 1,
			isConsumable: false,
			autoAcknowledgePurchases: false
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

async function consumeOwnedSupportProduct(productId: SupportProductId): Promise<boolean> {
	const purchases = await listInAppPurchases();
	const owned = purchases.find(
		(purchase) => purchase.productIdentifier === productId && isValidSupportPurchase(purchase)
	);
	if (!owned) {
		return false;
	}
	return finalizeSupportPurchase(owned);
}

export async function purchaseSupport(productId: SupportProductId): Promise<boolean> {
	if (!isBillingSupported() || !isSupportProductId(productId)) {
		return false;
	}

	if (supportBillingState.purchasePending) {
		abortInflightPurchase('purchase_superseded');
		await waitForBillingIdle();
		await delay(BILLING_RETRY_COOLDOWN_MS);
	}

	const generation = ++activePurchaseGeneration;
	setSupportPurchasePending(true);
	setSupportLastError(null);

	try {
		const transaction = await purchaseProductWithTimeout(productId);
		const normalized: BillingTransaction = {
			...transaction,
			productIdentifier: transaction.productIdentifier ?? productId
		};
		return finalizeSupportPurchase(normalized);
	} catch (error) {
		const code = normalizeBillingErrorCode(error);
		if (isBillingCancellationError(code)) {
			setSupportLastError(null);
			return false;
		}
		if (code === 'purchase_timeout') {
			setSupportLastError('purchase_timeout');
			return false;
		}
		if (isBillingAlreadyOwnedError(code)) {
			try {
				const consumed = await consumeOwnedSupportProduct(productId);
				if (!consumed) {
					setSupportLastError('consume_failed');
				}
				return consumed;
			} catch {
				setSupportLastError('consume_failed');
				return false;
			}
		}
		setSupportLastError('purchase_failed');
		return false;
	} finally {
		if (generation === activePurchaseGeneration) {
			setSupportPurchasePending(false);
		}
	}
}

function getPlayProductId(product: PlayCatalogProduct): string | null {
	return product.productIdentifier ?? product.identifier ?? null;
}

async function getProductsBatchWithTimeout(productIds: readonly string[]) {
	return runBillingTask(() =>
		Promise.race([
			NativePurchases.getProducts({
				productIdentifiers: [...productIds],
				productType: PURCHASE_TYPE.INAPP
			}),
			new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('product_fetch_timeout')), PRODUCT_FETCH_TIMEOUT_MS);
			})
		])
	);
}

export async function loadSupportPrices(): Promise<SupportProductInfo[]> {
	if (!isBillingSupported() || supportBillingState.purchasePending) {
		return [];
	}

	for (let attempt = 0; attempt < PRODUCT_FETCH_ATTEMPTS; attempt += 1) {
		try {
			const { products } = await getProductsBatchWithTimeout(SUPPORT_PRODUCT_IDS);
			const parsed: SupportProductInfo[] = [];
			for (const product of products ?? []) {
				const productId = getPlayProductId(product);
				if (!productId || !isSupportProductId(productId)) {
					continue;
				}
				const rawPrice = product.priceString?.trim() ?? '';
				const priceString = rawPrice ? normalizePlayPriceString(rawPrice) : '';
				if (!isValidPlayPriceString(priceString)) {
					continue;
				}
				parsed.push({
					productId,
					priceString,
					title: product.title ?? productId
				});
			}
			if (parsed.length > 0 || attempt === PRODUCT_FETCH_ATTEMPTS - 1) {
				return parsed;
			}
		} catch {
			if (attempt === PRODUCT_FETCH_ATTEMPTS - 1) {
				return [];
			}
		}
		await delay(PRODUCT_FETCH_RETRY_MS);
	}

	return [];
}

export async function initSupportBilling(): Promise<SupportStoreSync> {
	await clearLegacyProStorage();
	try {
		return await syncSupportPurchasesFromStore();
	} catch {
		return { consumed: 0, legacySupporter: supportBillingState.legacySupporter };
	}
}

/** @internal Reset module session state between tests. */
export function resetSupportPurchaseSessionForTests(): void {
	consumedTokens.clear();
	activePurchaseGeneration = 0;
	purchaseLaunchedAt = 0;
	abortInflightPurchase('purchase_aborted');
	setSupportLastError(null);
	setLegacySupporter(false);
}
