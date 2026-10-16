import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/haptics', () => ({
	hapticError: vi.fn(),
	hapticSuccess: vi.fn(),
	hapticWarning: vi.fn()
}));

import { appToastState, dismissAppToast, showErrorToast } from './appToast.svelte';
import { formatErrorToast, type ErrorCopy } from '$lib/utils/userFacingError';

const copy: ErrorCopy = {
	what: 'Position non obtenue.',
	why: 'L’accès à la localisation est refusé.',
	action: { label: 'Réessayer', kind: 'retry' }
};

describe('showErrorToast', () => {
	afterEach(() => {
		dismissAppToast();
	});

	it('stores a compact What — Action line for ErrorCopy', () => {
		showErrorToast(copy);
		expect(appToastState.current?.type).toBe('error');
		expect(appToastState.current?.message).toBe(formatErrorToast(copy));
	});
});
