import { isNativeApp } from '$lib/utils/platform';

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MODAL_FOCUS_LOCK_ATTR = 'data-modal-focus-lock';

const inertLockCounts = new Map<HTMLElement, number>();
const nativeLockSnapshots = new Map<
	HTMLElement,
	{ pointerEvents: string; ariaHidden: string | null }
>();
let scrollLockCount = 0;
let activeModalFocusCount = 0;

function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
		(el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
	);
}

function getModalRoot(node: HTMLElement): HTMLElement {
	if (node.getAttribute('aria-modal') === 'true') {
		return node;
	}
	return node.parentElement ?? node;
}

function isDisplayContents(element: HTMLElement): boolean {
	if (element.style.display === 'contents') {
		return true;
	}
	if (typeof getComputedStyle !== 'undefined') {
		return getComputedStyle(element).display === 'contents';
	}
	return false;
}

/** Never inert SvelteKit's display:contents wrapper — target the app shell inside instead. */
function resolveInertTarget(element: HTMLElement): HTMLElement {
	if (!isDisplayContents(element)) {
		return element;
	}

	const appShell = element.querySelector<HTMLElement>('[data-app-shell]');
	if (appShell) {
		return appShell;
	}

	for (const child of element.children) {
		if (child instanceof HTMLElement && !isDisplayContents(child)) {
			return child;
		}
	}

	return element;
}

function applyNativeLock(target: HTMLElement): void {
	if (!nativeLockSnapshots.has(target)) {
		nativeLockSnapshots.set(target, {
			pointerEvents: target.style.pointerEvents,
			ariaHidden: target.getAttribute('aria-hidden')
		});
	}
	target.setAttribute(MODAL_FOCUS_LOCK_ATTR, '');
	target.style.pointerEvents = 'none';
	target.setAttribute('aria-hidden', 'true');
}

function releaseNativeLock(target: HTMLElement): void {
	target.removeAttribute(MODAL_FOCUS_LOCK_ATTR);
	const snapshot = nativeLockSnapshots.get(target);
	if (snapshot) {
		target.style.pointerEvents = snapshot.pointerEvents;
		if (snapshot.ariaHidden === null) {
			target.removeAttribute('aria-hidden');
		} else {
			target.setAttribute('aria-hidden', snapshot.ariaHidden);
		}
		nativeLockSnapshots.delete(target);
	} else {
		target.style.pointerEvents = '';
		target.removeAttribute('aria-hidden');
	}
}

function lockBackground(element: HTMLElement, tracked?: Set<HTMLElement>): void {
	const target = resolveInertTarget(element);
	const count = inertLockCounts.get(target) ?? 0;
	inertLockCounts.set(target, count + 1);
	if (isNativeApp()) {
		applyNativeLock(target);
	} else {
		target.setAttribute('inert', '');
	}
	tracked?.add(target);
}

function unlockBackground(element: HTMLElement, tracked?: Set<HTMLElement>): void {
	const target = resolveInertTarget(element);
	const count = inertLockCounts.get(target) ?? 0;
	if (count <= 1) {
		inertLockCounts.delete(target);
		if (isNativeApp()) {
			releaseNativeLock(target);
		} else {
			target.removeAttribute('inert');
		}
	} else {
		inertLockCounts.set(target, count - 1);
	}
	tracked?.delete(target);
}

function lockBodyScroll(): void {
	scrollLockCount += 1;
	if (scrollLockCount === 1) {
		document.body.style.overflow = 'hidden';
	}
}

function unlockBodyScroll(): void {
	scrollLockCount = Math.max(0, scrollLockCount - 1);
	if (scrollLockCount === 0) {
		document.body.style.overflow = '';
	}
}

function setBackgroundInert(
	modalRoot: HTMLElement,
	inert: boolean,
	tracked?: Set<HTMLElement>
): void {
	if (typeof document === 'undefined') {
		return;
	}

	let current: HTMLElement | null = modalRoot;
	while (current?.parentElement) {
		const parent: HTMLElement = current.parentElement;
		for (const sibling of parent.children) {
			if (sibling instanceof HTMLElement && sibling !== current) {
				if (inert) {
					lockBackground(sibling, tracked);
				} else {
					unlockBackground(sibling, tracked);
				}
			}
		}
		if (parent === document.body) {
			break;
		}
		current = parent;
	}
}

function releaseTrackedInert(tracked: Set<HTMLElement>): void {
	for (const element of tracked) {
		unlockBackground(element);
	}
	tracked.clear();
}

function clearNativeLocks(): void {
	if (typeof document === 'undefined') {
		return;
	}

	for (const element of document.querySelectorAll(`[${MODAL_FOCUS_LOCK_ATTR}]`)) {
		if (element instanceof HTMLElement) {
			releaseNativeLock(element);
		}
	}
	nativeLockSnapshots.clear();
}

/** Clears stale inert/overflow left when a portaled modal unmounts out of order. */
export function clearDocumentModalState(): void {
	if (typeof document === 'undefined') {
		return;
	}

	scrollLockCount = 0;
	document.body.style.overflow = '';
	inertLockCounts.clear();
	clearNativeLocks();
	for (const element of document.querySelectorAll('[inert]')) {
		if (element instanceof HTMLElement) {
			element.removeAttribute('inert');
		}
	}
}

/** Full reset for post-onboarding: clears modal locks and display:contents inert artifacts. */
export function restoreAppInteractivity(): void {
	clearDocumentModalState();

	if (typeof document === 'undefined') {
		return;
	}

	for (const child of document.body.children) {
		if (child instanceof HTMLElement && isDisplayContents(child)) {
			child.removeAttribute('inert');
			child.style.pointerEvents = '';
			child.removeAttribute('aria-hidden');
		}
	}

	const appShell = document.querySelector<HTMLElement>('[data-app-shell]');
	if (appShell) {
		appShell.removeAttribute('inert');
		appShell.removeAttribute(MODAL_FOCUS_LOCK_ATTR);
		appShell.style.pointerEvents = '';
		appShell.removeAttribute('aria-hidden');
	}

	const main = document.querySelector<HTMLElement>('[data-app-main]');
	if (main) {
		main.style.removeProperty('pointer-events');
		main.removeAttribute('aria-hidden');
		main.removeAttribute('inert');
	}

	document.documentElement.style.overflow = '';
}

function focusInitialElement(node: HTMLElement): void {
	const focusable = getFocusableElements(node);
	if (focusable.length > 0) {
		focusable[0].focus();
		return;
	}

	if (!node.hasAttribute('tabindex')) {
		node.tabIndex = -1;
	}
	node.focus();
}

/** Trap focus inside a modal dialog and restore focus on teardown. */
export function modalFocus(
	node: HTMLElement,
	enabled: boolean = true
): { destroy: () => void } {
	if (!enabled || typeof document === 'undefined') {
		return { destroy: () => {} };
	}

	const modalRoot = getModalRoot(node);
	const inertedElements = new Set<HTMLElement>();
	const previousFocus =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;

	const useBackgroundLock = !isNativeApp();

	activeModalFocusCount += 1;
	if (useBackgroundLock) {
		setBackgroundInert(modalRoot, true, inertedElements);
		lockBodyScroll();
	}

	function handleKeyDown(event: KeyboardEvent): void {
		if (event.key !== 'Tab') {
			return;
		}

		const focusable = getFocusableElements(node);
		if (focusable.length === 0) {
			event.preventDefault();
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;

		if (event.shiftKey) {
			if (active === first || active === node) {
				event.preventDefault();
				last.focus();
			}
			return;
		}

		if (active === last) {
			event.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', handleKeyDown);
	requestAnimationFrame(() => focusInitialElement(node));

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeyDown);
			if (useBackgroundLock) {
				releaseTrackedInert(inertedElements);
				unlockBodyScroll();
			}
			activeModalFocusCount = Math.max(0, activeModalFocusCount - 1);
			if (activeModalFocusCount === 0) {
				restoreAppInteractivity();
			}
			previousFocus?.focus();
		}
	};
}
