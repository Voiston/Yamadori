export const APP_SHELL_PORTAL_TARGET = '[data-app-shell]';
export const BODY_PORTAL_TARGET = 'body';

/** Bottom sheet collé en bas sur mobile ; carte centrée sur sm+. */
export const ONBOARDING_OVERLAY_CLASS =
	'fixed inset-0 z-50 flex items-end bg-black/50 pb-onboarding-sheet pt-safe sm:items-center sm:justify-center sm:px-4';

export const ONBOARDING_PANEL_CLASS =
	'w-full max-w-none rounded-t-2xl rounded-b-none sm:mx-auto sm:max-w-md sm:rounded-2xl';

export function portal(node: HTMLElement, target: HTMLElement | string = 'body') {
	if (typeof document === 'undefined') {
		return {};
	}

	const targetEl =
		typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
	targetEl?.appendChild(node);

	return {
		destroy() {
			node.remove();
		}
	};
}
