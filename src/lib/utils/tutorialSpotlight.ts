export type TutorialScrollOptions = {
	paddingTop?: number;
	paddingBottom?: number;
	behavior?: ScrollBehavior;
};

export function findTutorialTarget(step: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-capture-tutorial="${step}"]`);
}

export function getScrollParent(el: HTMLElement): HTMLElement | null {
	let parent = el.parentElement;
	while (parent) {
		const { overflowY } = getComputedStyle(parent);
		if (
			(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
			parent.scrollHeight > parent.clientHeight
		) {
			return parent;
		}
		parent = parent.parentElement;
	}
	return null;
}

export function computeScrollTop(
	container: HTMLElement,
	target: HTMLElement,
	options: TutorialScrollOptions
): number {
	const paddingTop = options.paddingTop ?? 0;
	const paddingBottom = options.paddingBottom ?? 0;
	const containerRect = container.getBoundingClientRect();
	const targetRect = target.getBoundingClientRect();
	const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
	const availableHeight = container.clientHeight - paddingTop - paddingBottom;
	const centeredTop =
		relativeTop - paddingTop - Math.max(0, (availableHeight - targetRect.height) / 2);
	const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
	return Math.max(0, Math.min(centeredTop, maxScroll));
}

export function waitForScrollEnd(container: HTMLElement, timeoutMs = 500): Promise<void> {
	return new Promise((resolve) => {
		let resolved = false;
		const finish = () => {
			if (resolved) {
				return;
			}
			resolved = true;
			container.removeEventListener('scrollend', onScrollEnd);
			resolve();
		};

		const onScrollEnd = () => finish();
		const supportsScrollEnd = 'onscrollend' in document.documentElement;

		if (supportsScrollEnd) {
			container.addEventListener('scrollend', onScrollEnd, { once: true });
			window.setTimeout(finish, timeoutMs);
			return;
		}

		let lastScrollTop = container.scrollTop;
		let stableFrames = 0;
		const check = () => {
			if (resolved) {
				return;
			}
			if (container.scrollTop === lastScrollTop) {
				stableFrames += 1;
				if (stableFrames >= 2) {
					finish();
					return;
				}
			} else {
				stableFrames = 0;
				lastScrollTop = container.scrollTop;
			}
			requestAnimationFrame(check);
		};
		requestAnimationFrame(check);
		window.setTimeout(finish, timeoutMs);
	});
}

export async function scrollTargetIntoView(
	target: HTMLElement,
	options: TutorialScrollOptions = {}
): Promise<void> {
	const behavior = options.behavior ?? 'instant';
	const scrollParent = getScrollParent(target);

	if (!scrollParent) {
		target.scrollIntoView({ block: 'center', behavior });
		if (behavior === 'smooth') {
			await waitForScrollEnd(document.documentElement);
		}
		return;
	}

	const scrollTop = computeScrollTop(scrollParent, target, options);
	scrollParent.scrollTo({ top: scrollTop, behavior });
	if (behavior === 'smooth') {
		await waitForScrollEnd(scrollParent);
	}
}

export function observeTargetRect(
	target: HTMLElement | null,
	onUpdate: (rect: DOMRect | null) => void
): () => void {
	if (!target) {
		onUpdate(null);
		return () => {};
	}

	const update = () => onUpdate(target.getBoundingClientRect());
	update();

	const scrollParent = getScrollParent(target);
	const resizeObserver = new ResizeObserver(update);
	resizeObserver.observe(target);
	if (scrollParent) {
		resizeObserver.observe(scrollParent);
	}
	resizeObserver.observe(document.body);

	scrollParent?.addEventListener('scroll', update, { passive: true });
	window.addEventListener('resize', update, { passive: true });
	visualViewport?.addEventListener('resize', update, { passive: true });
	visualViewport?.addEventListener('scroll', update, { passive: true });

	return () => {
		resizeObserver.disconnect();
		scrollParent?.removeEventListener('scroll', update);
		window.removeEventListener('resize', update);
		visualViewport?.removeEventListener('resize', update);
		visualViewport?.removeEventListener('scroll', update);
	};
}

export function setTutorialScrollMargins(top: number, bottom: number): void {
	document.documentElement.style.setProperty('--tutorial-scroll-margin-top', `${top}px`);
	document.documentElement.style.setProperty('--tutorial-scroll-margin-bottom', `${bottom}px`);
}

export function clearTutorialScrollMargins(): void {
	document.documentElement.style.removeProperty('--tutorial-scroll-margin-top');
	document.documentElement.style.removeProperty('--tutorial-scroll-margin-bottom');
}

export type DimmingPanelRect = {
	top: number;
	left: number;
	width: number;
	height: number;
};

export type DimmingPanels = {
	top: DimmingPanelRect;
	left: DimmingPanelRect;
	right: DimmingPanelRect;
	bottom: DimmingPanelRect;
	highlight: DimmingPanelRect;
};

export function computeDimmingPanels(
	highlight: DOMRect,
	padding: number,
	viewportWidth: number,
	viewportHeight: number
): DimmingPanels {
	const x = highlight.left - padding;
	const y = highlight.top - padding;
	const width = highlight.width + padding * 2;
	const height = highlight.height + padding * 2;
	const right = x + width;
	const bottom = y + height;

	return {
		top: { top: 0, left: 0, width: viewportWidth, height: Math.max(0, y) },
		left: { top: y, left: 0, width: Math.max(0, x), height },
		right: { top: y, left: right, width: Math.max(0, viewportWidth - right), height },
		bottom: { top: bottom, left: 0, width: viewportWidth, height: Math.max(0, viewportHeight - bottom) },
		highlight: { top: y, left: x, width, height }
	};
}
