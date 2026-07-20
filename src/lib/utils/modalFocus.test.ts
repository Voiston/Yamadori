/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: vi.fn(() => false)
}));

import { isNativeApp } from '$lib/utils/platform';
import { clearDocumentModalState, modalFocus, restoreAppInteractivity } from '$lib/utils/modalFocus';

function buildNestedModalDom(): {
	wrapper: HTMLDivElement;
	mainApp: HTMLDivElement;
	backgroundButton: HTMLButtonElement;
	modalBackdrop: HTMLDivElement;
	modalCard: HTMLDivElement;
	modalButton: HTMLButtonElement;
} {
	document.body.replaceChildren();

	const wrapper = document.createElement('div');
	wrapper.style.display = 'contents';

	const mainApp = document.createElement('div');
	mainApp.setAttribute('data-app-shell', '');
	const backgroundButton = document.createElement('button');
	backgroundButton.type = 'button';
	backgroundButton.textContent = 'Background';
	mainApp.appendChild(backgroundButton);

	const modalBackdrop = document.createElement('div');
	const modalCard = document.createElement('div');
	const modalButton = document.createElement('button');
	modalButton.type = 'button';
	modalButton.textContent = 'Commencer';
	modalCard.appendChild(modalButton);
	modalBackdrop.appendChild(modalCard);

	wrapper.append(mainApp, modalBackdrop);
	document.body.appendChild(wrapper);

	return { wrapper, mainApp, backgroundButton, modalBackdrop, modalCard, modalButton };
}

function buildPortaledModalDom(): {
	wrapper: HTMLDivElement;
	appShell: HTMLDivElement;
	modalCard: HTMLDivElement;
} {
	document.body.replaceChildren();

	const wrapper = document.createElement('div');
	wrapper.style.display = 'contents';

	const appShell = document.createElement('div');
	appShell.setAttribute('data-app-shell', '');
	wrapper.appendChild(appShell);

	const modalBackdrop = document.createElement('div');
	const modalCard = document.createElement('div');
	modalCard.setAttribute('aria-modal', 'true');
	modalBackdrop.appendChild(modalCard);

	document.body.append(wrapper, modalBackdrop);

	return { wrapper, appShell, modalCard };
}

describe('modalFocus', () => {
	let destroy: (() => void) | undefined;

	afterEach(() => {
		destroy?.();
		destroy = undefined;
		vi.mocked(isNativeApp).mockReturnValue(false);
		document.body.replaceChildren();
	});

	it('marks background siblings inert without inerting nested modal controls', () => {
		const { mainApp, modalBackdrop, modalCard, modalButton } = buildNestedModalDom();

		destroy = modalFocus(modalCard).destroy;

		expect(mainApp.hasAttribute('inert')).toBe(true);
		expect(modalBackdrop.hasAttribute('inert')).toBe(false);
		expect(modalCard.hasAttribute('inert')).toBe(false);
		expect(modalButton.hasAttribute('inert')).toBe(false);
	});

	it('restores background interactivity on destroy', () => {
		const { mainApp, modalCard } = buildNestedModalDom();

		const action = modalFocus(modalCard);
		destroy = action.destroy;

		expect(mainApp.hasAttribute('inert')).toBe(true);

		action.destroy();
		destroy = undefined;

		expect(mainApp.hasAttribute('inert')).toBe(false);
	});

	it('marks other body children inert when modal is portaled to body', () => {
		document.body.replaceChildren();

		const wrapper = document.createElement('div');
		const backgroundButton = document.createElement('button');
		backgroundButton.type = 'button';
		wrapper.appendChild(backgroundButton);

		const modalBackdrop = document.createElement('div');
		modalBackdrop.setAttribute('aria-modal', 'true');
		const modalCard = document.createElement('div');
		const modalButton = document.createElement('button');
		modalButton.type = 'button';
		modalCard.appendChild(modalButton);
		modalBackdrop.appendChild(modalCard);

		document.body.append(wrapper, modalBackdrop);

		destroy = modalFocus(modalBackdrop).destroy;

		expect(wrapper.hasAttribute('inert')).toBe(true);
		expect(modalBackdrop.hasAttribute('inert')).toBe(false);
		expect(modalButton.hasAttribute('inert')).toBe(false);
	});

	it('inerts app shell but not display:contents wrapper when modal is portaled to body', () => {
		const { wrapper, appShell, modalCard } = buildPortaledModalDom();

		destroy = modalFocus(modalCard).destroy;

		expect(wrapper.hasAttribute('inert')).toBe(false);
		expect(appShell.hasAttribute('inert')).toBe(true);
	});

	it('does not lock background or body overflow on native', () => {
		vi.mocked(isNativeApp).mockReturnValue(true);
		const { appShell, modalCard } = buildPortaledModalDom();
		document.body.style.overflow = '';

		destroy = modalFocus(modalCard).destroy;

		expect(appShell.hasAttribute('inert')).toBe(false);
		expect(appShell.hasAttribute('data-modal-focus-lock')).toBe(false);
		expect(appShell.style.pointerEvents).toBe('');
		expect(document.body.style.overflow).toBe('');
	});

	it('skips focus trap when disabled', () => {
		const { mainApp, modalCard } = buildNestedModalDom();

		destroy = modalFocus(modalCard, false).destroy;

		expect(mainApp.hasAttribute('inert')).toBe(false);
	});

	it('clears tracked inert even if the modal node is removed before destroy', () => {
		const { mainApp, modalBackdrop, modalCard } = buildNestedModalDom();

		const action = modalFocus(modalCard);
		destroy = action.destroy;

		expect(mainApp.hasAttribute('inert')).toBe(true);

		modalBackdrop.remove();
		action.destroy();
		destroy = undefined;

		expect(mainApp.hasAttribute('inert')).toBe(false);
	});

	it('clearDocumentModalState removes stale inert and overflow', () => {
		const { mainApp, modalCard } = buildNestedModalDom();

		destroy = modalFocus(modalCard).destroy;
		document.body.style.overflow = 'hidden';

		modalCard.parentElement?.remove();
		clearDocumentModalState();
		destroy = undefined;

		expect(mainApp.hasAttribute('inert')).toBe(false);
		expect(document.body.style.overflow).toBe('');
	});

	it('restoreAppInteractivity clears display:contents inert artifacts', () => {
		document.body.replaceChildren();

		const wrapper = document.createElement('div');
		wrapper.style.display = 'contents';
		wrapper.setAttribute('inert', '');

		const appShell = document.createElement('div');
		appShell.setAttribute('data-app-shell', '');
		appShell.setAttribute('inert', '');
		wrapper.appendChild(appShell);
		document.body.appendChild(wrapper);
		document.body.style.overflow = 'hidden';

		restoreAppInteractivity();

		expect(wrapper.hasAttribute('inert')).toBe(false);
		expect(appShell.hasAttribute('inert')).toBe(false);
		expect(document.body.style.overflow).toBe('');
	});

	it('restoreAppInteractivity clears stale native lock artifacts', () => {
		const appShell = document.createElement('div');
		appShell.setAttribute('data-app-shell', '');
		appShell.setAttribute('data-modal-focus-lock', '');
		appShell.style.pointerEvents = 'none';
		document.body.appendChild(appShell);

		restoreAppInteractivity();

		expect(appShell.hasAttribute('data-modal-focus-lock')).toBe(false);
		expect(appShell.style.pointerEvents).toBe('');
	});

	it('keeps background inert until the last nested modal closes', () => {
		document.body.replaceChildren();

		const mainApp = document.createElement('div');
		const firstModal = document.createElement('div');
		firstModal.setAttribute('aria-modal', 'true');
		const secondModal = document.createElement('div');
		secondModal.setAttribute('aria-modal', 'true');

		document.body.append(mainApp, firstModal, secondModal);

		const destroyFirst = modalFocus(firstModal).destroy;
		const destroySecond = modalFocus(secondModal).destroy;

		expect(mainApp.hasAttribute('inert')).toBe(true);

		destroyFirst();
		expect(mainApp.hasAttribute('inert')).toBe(true);

		destroySecond();
		expect(mainApp.hasAttribute('inert')).toBe(false);
	});
});
