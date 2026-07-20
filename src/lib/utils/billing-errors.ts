import * as m from '$lib/paraglide/messages.js';

const INTERNAL_ERROR_CODES = new Set([
	'missing_purchase_token',
	'acknowledge_failed',
	'purchase_failed',
	'restore_failed',
	'promo_purchase_failed',
	'promo_purchase_blocked',
	'purchase_timeout'
]);

const CANCELLED_PATTERNS = [
	/user cancel/i,
	/cancelled/i,
	/canceled/i,
	/purchase cancel/i,
	/USER_CANCEL/i,
	/BILLING_USER_CANCELED/i,
	/E_USER_CANCELLED/i,
	/purchase_aborted/i,
	/purchase_aborted_on_resume/i,
	/purchase_superseded/i
];

const ALREADY_OWNED_PATTERNS = [
	/item already owned/i,
	/item_already_owned/i,
	/already owned/i
];

export function isBillingCancellationError(code: string): boolean {
	return CANCELLED_PATTERNS.some((pattern) => pattern.test(code));
}

export function isBillingAlreadyOwnedError(code: string): boolean {
	return ALREADY_OWNED_PATTERNS.some((pattern) => pattern.test(code));
}

export function normalizeBillingErrorCode(error: unknown): string {
	if (error instanceof Error) {
		const message = error.message.trim();
		if (message) return message;
	}
	if (typeof error === 'string' && error.trim()) {
		return error.trim();
	}
	return 'purchase_failed';
}

export function formatBillingError(code: string | null): string | null {
	if (!code) return null;
	if (isBillingCancellationError(code)) return null;

	switch (code) {
		case 'missing_purchase_token':
			return m.pro_error_missing_token();
		case 'restore_failed':
			return m.pro_error_restore_failed();
		case 'promo_purchase_failed':
			return m.pro_promo_purchase_failed();
		case 'promo_purchase_blocked':
			return m.pro_promo_purchase_blocked();
		case 'purchase_timeout':
			return m.pro_purchase_timeout();
		case 'purchase_failed':
			return m.pro_purchase_error();
		default:
			if (INTERNAL_ERROR_CODES.has(code)) {
				return m.pro_purchase_error();
			}
			return m.pro_purchase_error();
	}
}
