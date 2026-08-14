import {
	PRO_PRODUCT_ID,
	PRO_PROMO_PRODUCT_ID,
	PRO_PROMO_DURATION_MS
} from '$lib/constants/pro';

export type ProOfferPhase = 'standard' | 'promo' | 'expired';

export interface ProPromoState {
	phase: ProOfferPhase;
	promoEndsAt: string | null;
	remainingMs: number;
}

export function resolveProProductId(
	promoEndsAt: string | null,
	nowMs: number = Date.now()
): string {
	if (promoEndsAt) {
		const endsMs = Date.parse(promoEndsAt);
		if (!Number.isNaN(endsMs) && nowMs < endsMs) {
			return PRO_PROMO_PRODUCT_ID;
		}
	}
	return PRO_PRODUCT_ID;
}

export function getProPromoState(
	promoEndsAt: string | null,
	nowMs: number = Date.now()
): ProPromoState {
	if (!promoEndsAt) {
		return { phase: 'standard', promoEndsAt: null, remainingMs: 0 };
	}

	const endsMs = Date.parse(promoEndsAt);
	if (Number.isNaN(endsMs)) {
		return { phase: 'standard', promoEndsAt: null, remainingMs: 0 };
	}

	const remainingMs = Math.max(0, endsMs - nowMs);
	if (remainingMs > 0) {
		return { phase: 'promo', promoEndsAt, remainingMs };
	}

	return { phase: 'expired', promoEndsAt, remainingMs: 0 };
}

export function createPromoEndsAt(nowMs: number = Date.now()): string {
	return new Date(nowMs + PRO_PROMO_DURATION_MS).toISOString();
}

export function formatPromoCountdown(remainingMs: number): string {
	const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export interface PromoBannerOffer {
	phase: 'promo';
	productId: string;
	priceString: string | null;
	fullPriceString: string | null;
	promoEndsAt: string | null;
	remainingMs: number;
}

export function createPromoBannerOffer(
	showPromo: boolean,
	productId: string,
	promoUi: Pick<ProPromoState, 'promoEndsAt' | 'remainingMs'>,
	priceOffer: { priceString: string | null; fullPriceString: string | null } | null
): PromoBannerOffer | null {
	if (!showPromo) {
		return null;
	}
	return {
		phase: 'promo',
		productId,
		priceString: priceOffer?.priceString ?? null,
		fullPriceString: priceOffer?.fullPriceString ?? null,
		promoEndsAt: promoUi.promoEndsAt,
		remainingMs: promoUi.remainingMs
	};
}

/**
 * Purchase button enabled once promo state is loaded.
 * During an active promo window, also require a Play-confirmed promo price.
 */
export function canEnableProPurchase(
	loaded: boolean,
	showPromo: boolean = false,
	pricesReady: boolean = true
): boolean {
	if (!loaded) {
		return false;
	}
	if (showPromo && !pricesReady) {
		return false;
	}
	return true;
}
