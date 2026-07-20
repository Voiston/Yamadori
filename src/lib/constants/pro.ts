/** Maximum trees visible in the free tier. */
export const FREE_TREE_LIMIT = 3;

/** Google Play standard price (non-consumable). Configure at 29,00 € in Play Console. */
export const PRO_PRODUCT_ID = 'yamadori_pro';

/** Google Play launch promo SKU (non-consumable). Configure at 19,00 € in Play Console. */
export const PRO_PROMO_PRODUCT_ID = 'yamadori_pro_promo';

/** Duration of the flash promo window after the first 4th-tree attempt. */
export const PRO_PROMO_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * How long a locally cached Play purchase may keep Pro when the store is unreachable.
 * After this window, offline entitlement is revoked until Play confirms again.
 */
export const PRO_OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export const PRO_PRODUCT_IDS = [PRO_PRODUCT_ID, PRO_PROMO_PRODUCT_ID] as const;

export function isProProductId(productId: string): boolean {
	return (PRO_PRODUCT_IDS as readonly string[]).includes(productId);
}
