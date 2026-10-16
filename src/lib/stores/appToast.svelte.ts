import { hapticError, hapticSuccess, hapticWarning } from '$lib/utils/haptics';
import { formatErrorToast, isErrorCopy, type ErrorCopy } from '$lib/utils/userFacingError';

/**
 * Feedback channels — pick exactly one per event:
 * - Toast (this module): ephemeral confirmation of a **finished** action. The user has left
 *   the control. Auto-dismiss. No decision. Not persistent status.
 * - Modal (`ConfirmDialog`): required decision before continuing (destructive, password,
 *   permission, legal, GPS save-anyway, paywall). Not success/failure of an action already done.
 * - Inline (`ErrorBanner` or in-place copy): stays on the control while the problem or context
 *   remains. Retry in place.
 */

export type AppToastType = 'ok' | 'error' | 'info';

type AppToast = {
	type: AppToastType;
	message: string;
};

type ToastOptions = {
	haptic?: boolean;
	durationMs?: number;
};

let toastTimeout: ReturnType<typeof setTimeout> | undefined;

export const appToastState = $state<{ current: AppToast | null }>({ current: null });

export function showAppToast(
	type: AppToastType,
	message: string,
	options: ToastOptions = {}
): void {
	if (toastTimeout) {
		clearTimeout(toastTimeout);
		toastTimeout = undefined;
	}

	appToastState.current = { type, message };

	const haptic = options.haptic !== false;
	if (haptic) {
		if (type === 'ok') {
			void hapticSuccess();
		} else if (type === 'error') {
			void hapticError();
		} else {
			void hapticWarning();
		}
	}

	const durationMs =
		options.durationMs ?? (type === 'ok' ? 4000 : type === 'error' ? 6000 : 5000);
	toastTimeout = setTimeout(() => {
		appToastState.current = null;
		toastTimeout = undefined;
	}, durationMs);
}

export function showOkToast(message: string, options: ToastOptions = {}): void {
	showAppToast('ok', message, options);
}

export function showErrorToast(messageOrCopy: string | ErrorCopy, options: ToastOptions = {}): void {
	const message = isErrorCopy(messageOrCopy)
		? formatErrorToast(messageOrCopy)
		: messageOrCopy;
	showAppToast('error', message, options);
}

export function showSettingsToast(
	type: AppToastType,
	message: string,
	options: ToastOptions = {}
): void {
	showAppToast(type, message, { haptic: false, ...options });
}

export function showDetailFeedback(message: string, type: AppToastType = 'ok'): void {
	showAppToast(type, message, { durationMs: 2000 });
}

export function dismissAppToast(): void {
	if (toastTimeout) {
		clearTimeout(toastTimeout);
		toastTimeout = undefined;
	}
	appToastState.current = null;
}
