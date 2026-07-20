/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { teardownCaptureTutorial } from './captureTutorialTeardown';

describe('teardownCaptureTutorial', () => {
	afterEach(() => {
		document.documentElement.style.removeProperty('--tutorial-scroll-margin-top');
		document.documentElement.style.removeProperty('--tutorial-scroll-margin-bottom');
		document.body.replaceChildren();
	});

	it('removes capture tutorial overlay nodes and clears scroll margins', () => {
		document.documentElement.style.setProperty('--tutorial-scroll-margin-top', '120px');
		document.documentElement.style.setProperty('--tutorial-scroll-margin-bottom', '80px');

		const spotlight = document.createElement('div');
		spotlight.setAttribute('data-capture-tutorial-overlay', '');
		document.body.appendChild(spotlight);

		const panel = document.createElement('div');
		panel.setAttribute('data-capture-tutorial-overlay', '');
		document.body.appendChild(panel);

		teardownCaptureTutorial();

		expect(document.querySelectorAll('[data-capture-tutorial-overlay]')).toHaveLength(0);
		expect(document.documentElement.style.getPropertyValue('--tutorial-scroll-margin-top')).toBe('');
		expect(document.documentElement.style.getPropertyValue('--tutorial-scroll-margin-bottom')).toBe(
			''
		);
	});
});
