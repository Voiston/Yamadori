import { describe, expect, it } from 'vitest';
import {
	formatBillingError,
	isBillingAlreadyOwnedError,
	isBillingCancellationError,
	normalizeBillingErrorCode
} from './billing-errors';

describe('billing-errors', () => {
	it('maps internal error codes to translated messages', () => {
		expect(formatBillingError('missing_purchase_token')).toBeTruthy();
		expect(formatBillingError('restore_failed')).toBeTruthy();
		expect(formatBillingError('purchase_failed')).toBeTruthy();
	});

	it('returns null for user cancellation patterns', () => {
		expect(formatBillingError('User cancelled')).toBeNull();
		expect(isBillingCancellationError('Purchase cancelled by user')).toBe(true);
		expect(isBillingCancellationError('USER_CANCELED')).toBe(true);
		expect(isBillingCancellationError('E_USER_CANCELLED')).toBe(true);
		expect(isBillingCancellationError('purchase_aborted_on_resume')).toBe(true);
		expect(isBillingCancellationError('purchase_superseded')).toBe(true);
	});

	it('detects already-owned purchase errors separately from cancellation', () => {
		expect(isBillingAlreadyOwnedError('ITEM_ALREADY_OWNED')).toBe(true);
		expect(isBillingAlreadyOwnedError('Item already owned')).toBe(true);
		expect(isBillingCancellationError('ITEM_ALREADY_OWNED')).toBe(false);
		expect(formatBillingError('ITEM_ALREADY_OWNED')).toBeTruthy();
	});

	it('falls back for unknown errors', () => {
		expect(formatBillingError('some_unknown_play_error')).toBeTruthy();
	});

	it('normalizes thrown errors', () => {
		expect(normalizeBillingErrorCode(new Error('billing_unavailable'))).toBe(
			'billing_unavailable'
		);
		expect(normalizeBillingErrorCode('restore_failed')).toBe('restore_failed');
		expect(normalizeBillingErrorCode(null)).toBe('purchase_failed');
	});
});
