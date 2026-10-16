/** Consumable Play tips. Prices are indicative; the sheet shows the Play price. */
export const SUPPORT_PRODUCT_IDS = [
	'yamadori_support_2',
	'yamadori_support_5',
	'yamadori_support_10'
] as const;

export type SupportProductId = (typeof SUPPORT_PRODUCT_IDS)[number];

/**
 * Former non-consumable unlocks. Keep them inactive for new purchases in Play Console.
 * The app only uses them to thank past buyers — they never gate a feature.
 */
export const LEGACY_PRO_PRODUCT_IDS = ['yamadori_pro', 'yamadori_pro_promo'] as const;

export function isSupportProductId(productId: string): productId is SupportProductId {
	return (SUPPORT_PRODUCT_IDS as readonly string[]).includes(productId);
}

export function isLegacyProProductId(productId: string): boolean {
	return (LEGACY_PRO_PRODUCT_IDS as readonly string[]).includes(productId);
}
