import { Preferences } from '@capacitor/preferences';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { isNativeApp } from '$lib/utils/platform';

const LEGACY_SECURE_PURCHASE_KEY = 'yamadori-pro-purchase';

const LEGACY_PREFERENCE_KEYS = [
	'yamadori-pro-entitlement',
	'yamadori-pro-promo-ends-at',
	'yamadori-pro-promo-storage-v2',
	'yamadori-pro-promo-consumed',
	'yamadori-pro-list-promo-dismiss-until',
	'yamadori-dev-pro-override'
] as const;

export const supportBillingState = $state({
	purchasePending: false,
	lastError: null as string | null,
	/** Play still lists a legacy Pro purchase. Not a feature gate. */
	legacySupporter: false
});

export function setSupportPurchasePending(pending: boolean): void {
	supportBillingState.purchasePending = pending;
}

export function setSupportLastError(error: string | null): void {
	supportBillingState.lastError = error;
}

export function setLegacySupporter(value: boolean): void {
	supportBillingState.legacySupporter = value;
}

/** Drop local Pro tokens and promo flags. Tips are not stored on device. */
export async function clearLegacyProStorage(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	await Promise.all(
		LEGACY_PREFERENCE_KEYS.map(async (key) => {
			try {
				await Preferences.remove({ key });
			} catch {
				// Already absent.
			}
		})
	);

	try {
		await SecureStoragePlugin.remove({ key: LEGACY_SECURE_PURCHASE_KEY });
	} catch {
		// Already absent.
	}
}
