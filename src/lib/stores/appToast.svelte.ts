import { hapticError, hapticSuccess, hapticWarning } from '$lib/utils/haptics';

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

	if (type === 'ok' || type === 'error') {
		const durationMs = options.durationMs ?? (type === 'ok' ? 4000 : 6000);
		toastTimeout = setTimeout(() => {
			appToastState.current = null;
			toastTimeout = undefined;
		}, durationMs);
	}
}

export function showOkToast(message: string, options: ToastOptions = {}): void {
	showAppToast('ok', message, options);
}

export function showErrorToast(message: string, options: ToastOptions = {}): void {
	showAppToast('error', message, options);
}

export function showSettingsToast(
	type: AppToastType,
	message: string,
	options: ToastOptions = {}
): void {
	showAppToast(type, message, { haptic: false, ...options });
}

export function showDetailFeedback(message: string): void {
	showOkToast(message, { durationMs: 2000 });
}

export function dismissAppToast(): void {
	if (toastTimeout) {
		clearTimeout(toastTimeout);
		toastTimeout = undefined;
	}
	appToastState.current = null;
}
