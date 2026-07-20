import { restoreAppInteractivity } from '$lib/utils/modalFocus';
import { clearTutorialScrollMargins } from '$lib/utils/tutorialSpotlight';
import { tick } from 'svelte';

const ONBOARDING_OVERLAY_SELECTOR = 'body > [data-yamadori-onboarding-overlay]';

function isDisplayContents(element: HTMLElement): boolean {
	if (element.style.display === 'contents') {
		return true;
	}
	if (typeof getComputedStyle !== 'undefined') {
		return getComputedStyle(element).display === 'contents';
	}
	return false;
}

function restoreMainInteractivity(): void {
	if (typeof document === 'undefined') {
		return;
	}

	const main = document.querySelector<HTMLElement>('[data-app-main]');
	if (main) {
		main.style.removeProperty('pointer-events');
		main.removeAttribute('aria-hidden');
		main.removeAttribute('inert');
	}

	document.body.style.overflow = '';
	document.documentElement.style.overflow = '';
}

/** Removes orphaned portaled layers left after onboarding unmount races. */
export function removeStaleOnboardingOverlays(): void {
	if (typeof document === 'undefined') {
		return;
	}

	for (const child of document.body.children) {
		if (!(child instanceof HTMLElement) || isDisplayContents(child)) {
			continue;
		}
		if (getComputedStyle(child).position === 'fixed') {
			child.remove();
		}
	}

	for (const element of document.querySelectorAll(ONBOARDING_OVERLAY_SELECTOR)) {
		element.remove();
	}

	for (const element of document.querySelectorAll(
		'[data-app-shell] [data-yamadori-onboarding-overlay], [data-app-shell] [data-yamadori-portal]'
	)) {
		element.remove();
	}

	for (const element of document.querySelectorAll('[data-capture-tutorial-overlay]')) {
		element.remove();
	}

	restoreMainInteractivity();
}

/** Clears modal locks and tutorial scroll margins without tearing down live Svelte portals. */
export async function releaseOnboardingUiLocks(options?: {
	removeOverlays?: boolean;
}): Promise<void> {
	clearTutorialScrollMargins();
	restoreAppInteractivity();
	await tick();
	if (options?.removeOverlays) {
		removeStaleOnboardingOverlays();
	}
	restoreAppInteractivity();
}
