import { Preferences } from '@capacitor/preferences';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { PRO_OFFLINE_GRACE_MS, PRO_PRODUCT_ID, isProProductId } from '$lib/constants/pro';
import type { StoredProPurchase } from '$lib/types/pro-entitlement';
import { isNativeApp } from '$lib/utils/platform';

const LEGACY_PREFERENCES_KEY = 'yamadori-pro-entitlement';
const SECURE_PURCHASE_KEY = 'yamadori-pro-purchase';

export const proEntitlementState = $state({
	loaded: false,
	isPro: false,
	purchasePending: false,
	lastError: null as string | null
});

/** True when verifiedAt is within the offline grace window. */
export function isOfflineEntitlementFresh(
	verifiedAt: string,
	nowMs: number = Date.now()
): boolean {
	const verifiedMs = Date.parse(verifiedAt);
	if (Number.isNaN(verifiedMs)) {
		return false;
	}
	return nowMs - verifiedMs <= PRO_OFFLINE_GRACE_MS;
}

async function readSecurePurchase(): Promise<StoredProPurchase | null> {
	if (!isNativeApp()) {
		return null;
	}

	try {
		const { value } = await SecureStoragePlugin.get({ key: SECURE_PURCHASE_KEY });
		if (!value) {
			return null;
		}
		const parsed = JSON.parse(value) as StoredProPurchase;
		if (
			!parsed.purchaseToken ||
			!parsed.productId ||
			!isProProductId(parsed.productId)
		) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

async function writeSecurePurchase(purchase: StoredProPurchase): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	await SecureStoragePlugin.set({
		key: SECURE_PURCHASE_KEY,
		value: JSON.stringify(purchase)
	});
}

async function clearSecurePurchase(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	try {
		await SecureStoragePlugin.remove({ key: SECURE_PURCHASE_KEY });
	} catch {
		// Already cleared.
	}
}

export async function clearLegacyProPreferences(): Promise<void> {
	try {
		await Preferences.remove({ key: LEGACY_PREFERENCES_KEY });
	} catch {
		// Ignore migration errors.
	}
}

export function setProEntitlementActive(active: boolean): void {
	proEntitlementState.isPro = active;
	if (active) {
		proEntitlementState.lastError = null;
	}
}

export async function applyEntitlementFromPurchase(
	purchaseToken: string,
	productId: string = PRO_PRODUCT_ID
): Promise<void> {
	const purchase: StoredProPurchase = {
		purchaseToken,
		productId,
		verifiedAt: new Date().toISOString()
	};
	await writeSecurePurchase(purchase);
	setProEntitlementActive(true);
}

export async function applyOfflineEntitlementFromSecureStorage(
	nowMs: number = Date.now()
): Promise<boolean> {
	const stored = await readSecurePurchase();
	if (!stored) {
		setProEntitlementActive(false);
		return false;
	}
	if (!isOfflineEntitlementFresh(stored.verifiedAt, nowMs)) {
		await clearEntitlement();
		return false;
	}
	setProEntitlementActive(true);
	return true;
}

export async function clearEntitlement(): Promise<void> {
	await clearSecurePurchase();
	setProEntitlementActive(false);
}

export function setProPurchasePending(pending: boolean): void {
	proEntitlementState.purchasePending = pending;
}

export function setProLastError(error: string | null): void {
	proEntitlementState.lastError = error;
}

export async function initProEntitlement(): Promise<void> {
	proEntitlementState.isPro = false;
	proEntitlementState.lastError = null;

	try {
		await clearLegacyProPreferences();
	} catch {
		// Continue boot even if legacy cleanup fails.
	} finally {
		proEntitlementState.loaded = true;
	}

	const { syncProEntitlementFromStore } = await import('$lib/utils/billing');
	await syncProEntitlementFromStore();
}
