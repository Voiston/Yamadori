import { describe, expect, it } from 'vitest';
import {
	PRO_PRODUCT_ID,
	PRO_PROMO_PRODUCT_ID,
	PRO_PROMO_DURATION_MS
} from '$lib/constants/pro';
import {
	createPromoEndsAt,
	createPromoBannerOffer,
	canEnableProPurchase,
	formatPromoCountdown,
	getProPromoState,
	resolveProProductId
} from './proOffer';

describe('proOffer', () => {
	it('uses standard SKU before promo window starts', () => {
		expect(resolveProProductId(null)).toBe(PRO_PRODUCT_ID);
		expect(getProPromoState(null).phase).toBe('standard');
	});

	it('uses promo SKU while the 24h window is active', () => {
		const now = Date.parse('2026-06-01T12:00:00.000Z');
		const endsAt = new Date(now + PRO_PROMO_DURATION_MS).toISOString();

		expect(resolveProProductId(endsAt, now)).toBe(PRO_PROMO_PRODUCT_ID);
		expect(getProPromoState(endsAt, now)).toEqual({
			phase: 'promo',
			promoEndsAt: endsAt,
			remainingMs: PRO_PROMO_DURATION_MS
		});
	});

	it('returns expired phase and standard SKU after promo ends', () => {
		const endsAt = '2026-06-01T12:00:00.000Z';
		const now = Date.parse('2026-06-02T13:00:00.000Z');

		expect(resolveProProductId(endsAt, now)).toBe(PRO_PRODUCT_ID);
		expect(getProPromoState(endsAt, now).phase).toBe('expired');
	});

	it('creates a promo deadline 24 hours ahead', () => {
		const now = Date.parse('2026-06-01T08:30:00.000Z');
		expect(createPromoEndsAt(now)).toBe('2026-06-02T08:30:00.000Z');
	});

	it('formats countdown as HH:MM:SS', () => {
		expect(formatPromoCountdown(90_542_000)).toBe('25:09:02');
		expect(formatPromoCountdown(0)).toBe('00:00:00');
	});

	it('builds promo banner while Play prices are still loading', () => {
		const now = Date.parse('2026-06-01T12:00:00.000Z');
		const endsAt = new Date(now + PRO_PROMO_DURATION_MS).toISOString();
		const promoUi = getProPromoState(endsAt, now);

		expect(
			createPromoBannerOffer(true, PRO_PROMO_PRODUCT_ID, promoUi, null)
		).toEqual({
			phase: 'promo',
			productId: PRO_PROMO_PRODUCT_ID,
			priceString: null,
			fullPriceString: null,
			promoEndsAt: endsAt,
			remainingMs: PRO_PROMO_DURATION_MS
		});
	});

	it('omits promo banner when the pricing window has expired', () => {
		const endsAt = '2026-06-01T12:00:00.000Z';
		const now = Date.parse('2026-06-02T13:00:00.000Z');
		const promoUi = getProPromoState(endsAt, now);

		expect(createPromoBannerOffer(false, PRO_PRODUCT_ID, promoUi, null)).toBeNull();
	});

	it('enables purchase when promo state is loaded', () => {
		expect(canEnableProPurchase(true)).toBe(true);
		expect(canEnableProPurchase(false)).toBe(false);
	});

	it('disables purchase during promo until Play prices are ready', () => {
		expect(canEnableProPurchase(true, true, false)).toBe(false);
		expect(canEnableProPurchase(true, true, true)).toBe(true);
		expect(canEnableProPurchase(true, false, false)).toBe(true);
	});
});
