/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { releaseOnboardingUiLocks } from './onboardingUi';

describe('onboardingUi', () => {
	afterEach(() => {
		document.body.replaceChildren();
		document.body.style.overflow = '';
		document.documentElement.style.overflow = '';
	});

	it('releaseOnboardingUiLocks clears inert and overflow', async () => {
		const app = document.createElement('div');
		app.setAttribute('inert', '');
		document.body.appendChild(app);
		document.body.style.overflow = 'hidden';

		await releaseOnboardingUiLocks();

		expect(app.hasAttribute('inert')).toBe(false);
		expect(document.body.style.overflow).toBe('');
	});

	it('removes stale body fixed portals and restores main when removeOverlays is true', async () => {
		const appShell = document.createElement('div');
		appShell.setAttribute('data-app-shell', '');
		const main = document.createElement('main');
		main.setAttribute('data-app-main', '');
		main.style.pointerEvents = 'none';
		main.setAttribute('aria-hidden', 'true');
		appShell.appendChild(main);
		document.body.appendChild(appShell);

		const bodyPortal = document.createElement('div');
		bodyPortal.style.position = 'fixed';
		document.body.appendChild(bodyPortal);

		const shellPortal = document.createElement('div');
		shellPortal.setAttribute('data-yamadori-portal', '');
		appShell.appendChild(shellPortal);

		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';

		await releaseOnboardingUiLocks({ removeOverlays: true });

		expect(document.body.contains(bodyPortal)).toBe(false);
		expect(appShell.contains(shellPortal)).toBe(false);
		expect(main.style.pointerEvents).toBe('');
		expect(main.hasAttribute('aria-hidden')).toBe(false);
		expect(document.body.style.overflow).toBe('');
		expect(document.documentElement.style.overflow).toBe('');
	});

	it('keeps overlays when removeOverlays is not set', async () => {
		const overlay = document.createElement('div');
		overlay.setAttribute('data-yamadori-onboarding-overlay', '');
		document.body.appendChild(overlay);

		await releaseOnboardingUiLocks();

		expect(document.querySelector('[data-yamadori-onboarding-overlay]')).not.toBeNull();
	});

	it('removes capture tutorial overlays when removeOverlays is true', async () => {
		const tutorialOverlay = document.createElement('div');
		tutorialOverlay.setAttribute('data-capture-tutorial-overlay', '');
		document.body.appendChild(tutorialOverlay);

		await releaseOnboardingUiLocks({ removeOverlays: true });

		expect(document.querySelector('[data-capture-tutorial-overlay]')).toBeNull();
	});
});
