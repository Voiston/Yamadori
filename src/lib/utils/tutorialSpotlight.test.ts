/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
	computeDimmingPanels,
	computeScrollTop,
	findTutorialTarget,
	getScrollParent,
	scrollTargetIntoView,
	waitForScrollEnd
} from './tutorialSpotlight';

function buildScrollFixture(): {
	scrollContainer: HTMLDivElement;
	target: HTMLDivElement;
} {
	document.body.replaceChildren();

	const scrollContainer = document.createElement('div');
	scrollContainer.style.height = '200px';
	scrollContainer.style.overflowY = 'auto';

	const spacer = document.createElement('div');
	spacer.style.height = '400px';

	const target = document.createElement('div');
	target.dataset.captureTutorial = 'photo';
	target.style.height = '40px';
	target.textContent = 'Target';

	scrollContainer.append(spacer, target);
	document.body.appendChild(scrollContainer);

	Object.defineProperty(scrollContainer, 'clientHeight', { value: 200, configurable: true });
	Object.defineProperty(scrollContainer, 'scrollHeight', { value: 440, configurable: true });

	return { scrollContainer, target };
}

describe('tutorialSpotlight', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('findTutorialTarget returns the matching element', () => {
		const { target } = buildScrollFixture();
		expect(findTutorialTarget('photo')).toBe(target);
		expect(findTutorialTarget('missing')).toBeNull();
	});

	it('getScrollParent finds the nearest scrollable ancestor', () => {
		const { scrollContainer, target } = buildScrollFixture();
		expect(getScrollParent(target)).toBe(scrollContainer);
	});

	it('computeScrollTop centers the target within padded viewport', () => {
		const { scrollContainer, target } = buildScrollFixture();
		scrollContainer.getBoundingClientRect = () =>
			new DOMRect(0, 0, 300, 200) as DOMRect;
		target.getBoundingClientRect = () => new DOMRect(0, 360, 300, 40) as DOMRect;
		Object.defineProperty(scrollContainer, 'scrollTop', { value: 200, writable: true });

		const scrollTop = computeScrollTop(scrollContainer, target, {
			paddingTop: 16,
			paddingBottom: 120
		});

		expect(scrollTop).toBeGreaterThan(0);
		expect(scrollTop).toBeLessThanOrEqual(240);
	});

	it('scrollTargetIntoView scrolls the parent container', async () => {
		const { scrollContainer, target } = buildScrollFixture();
		scrollContainer.getBoundingClientRect = () =>
			new DOMRect(0, 0, 300, 200) as DOMRect;
		target.getBoundingClientRect = () => new DOMRect(0, 360, 300, 40) as DOMRect;

		let scrollTop = 0;
		Object.defineProperty(scrollContainer, 'scrollTop', {
			get: () => scrollTop,
			set: (value: number) => {
				scrollTop = value;
			},
			configurable: true
		});

		scrollContainer.scrollTo = ((options: ScrollToOptions) => {
			if (typeof options.top === 'number') {
				scrollTop = options.top;
			}
		}) as typeof scrollContainer.scrollTo;

		await scrollTargetIntoView(target, { paddingTop: 8, paddingBottom: 80, behavior: 'instant' });
		expect(scrollTop).toBeGreaterThan(0);
	});

	it('waitForScrollEnd resolves when scroll position stabilizes', async () => {
		const { scrollContainer } = buildScrollFixture();
		let scrollTop = 0;
		Object.defineProperty(scrollContainer, 'scrollTop', {
			get: () => scrollTop,
			configurable: true
		});

		const promise = waitForScrollEnd(scrollContainer, 100);
		await new Promise((resolve) => requestAnimationFrame(resolve));
		await promise;
	});

	it('computeDimmingPanels builds four panels around a centered highlight', () => {
		const highlight = new DOMRect(100, 100, 80, 40);
		const panels = computeDimmingPanels(highlight, 4, 400, 600);

		expect(panels.highlight).toEqual({
			top: 96,
			left: 96,
			width: 88,
			height: 48
		});
		expect(panels.top.height).toBe(96);
		expect(panels.left.width).toBe(96);
		expect(panels.right.left).toBe(184);
		expect(panels.right.width).toBe(216);
		expect(panels.bottom.top).toBe(144);
		expect(panels.bottom.height).toBe(456);
	});

	it('computeDimmingPanels clamps panels at viewport edges', () => {
		const highlight = new DOMRect(0, 0, 400, 600);
		const panels = computeDimmingPanels(highlight, 0, 400, 600);

		expect(panels.top.height).toBe(0);
		expect(panels.left.width).toBe(0);
		expect(panels.right.width).toBe(0);
		expect(panels.bottom.height).toBe(0);
		expect(panels.highlight).toEqual({
			top: 0,
			left: 0,
			width: 400,
			height: 600
		});
	});
});
