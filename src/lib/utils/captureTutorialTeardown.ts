import { clearTutorialScrollMargins } from '$lib/utils/tutorialSpotlight';

const CAPTURE_TUTORIAL_OVERLAY_SELECTOR = '[data-capture-tutorial-overlay]';

/** Clears tutorial scroll margins and any stale capture tutorial overlay nodes. */
export function teardownCaptureTutorial(): void {
	clearTutorialScrollMargins();

	if (typeof document === 'undefined') {
		return;
	}

	for (const element of document.querySelectorAll(CAPTURE_TUTORIAL_OVERLAY_SELECTOR)) {
		element.remove();
	}
}
