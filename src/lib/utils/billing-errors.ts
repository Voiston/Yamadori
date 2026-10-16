import * as m from '$lib/paraglide/messages.js';

const INTERNAL_ERROR_CODES = new Set([
	'missing_purchase_token',
	'consume_failed',
	'purchase_failed',
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
			return m.support_error_missing_token();
		case 'consume_failed':
			return m.support_error_consume_failed();
		case 'purchase_timeout':
			return m.support_purchase_timeout();
		case 'purchase_failed':
			return m.support_purchase_error();
		default:
			if (INTERNAL_ERROR_CODES.has(code)) {
				return m.support_purchase_error();
			}
			return m.support_purchase_error();
	}
}
