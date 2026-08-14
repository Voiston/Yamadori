/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getInsets, addListener, isNativeApp, isAndroidApp } = vi.hoisted(() => ({
	getInsets: vi.fn(),
	addListener: vi.fn(),
	isNativeApp: vi.fn(() => true),
	isAndroidApp: vi.fn(() => true)
}));

vi.mock('$lib/utils/safeAreaInsetsPlugin', () => ({
	SafeAreaInsets: {
		getInsets,
		addListener
	}
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp,
	isAndroidApp
}));

import { applyNavInsets, applyNativeBottomInset, initViewportInsets } from './nativeInit';

describe('applyNavInsets', () => {
	afterEach(() => {
		delete document.documentElement.dataset.navBar;
		document.documentElement.style.removeProperty('--inset-bottom');
		document.documentElement.style.removeProperty('--gesture-clearance');
	});

	it('uses gesture mode from Android settings without extra inset', () => {
		applyNavInsets({ top: 0, bottom: 24, mode: 'gesture' });

		expect(document.documentElement.dataset.navBar).toBe('gesture');
		expect(document.documentElement.style.getPropertyValue('--inset-bottom')).toBe('0px');
		expect(document.documentElement.style.getPropertyValue('--gesture-clearance')).toBe('18px');
	});

	it('uses button mode with native inset height', () => {
		applyNavInsets({ top: 0, bottom: 48, mode: 'buttons' });

		expect(document.documentElement.dataset.navBar).toBe('buttons');
		expect(document.documentElement.style.getPropertyValue('--inset-bottom')).toBe('48px');
	});

	it('caps button mode inset when OEM over-reports', () => {
		applyNavInsets({ top: 0, bottom: 72, mode: 'buttons' });

		expect(document.documentElement.dataset.navBar).toBe('buttons');
		expect(document.documentElement.style.getPropertyValue('--inset-bottom')).toBe('48px');
	});
});

describe('applyNativeBottomInset', () => {
	afterEach(() => {
		delete document.documentElement.dataset.navBar;
		document.documentElement.style.removeProperty('--inset-bottom');
		document.documentElement.style.removeProperty('--gesture-clearance');
	});

	it('enables button-nav padding for large insets', () => {
		applyNativeBottomInset(48);

		expect(document.documentElement.dataset.navBar).toBe('buttons');
		expect(document.documentElement.style.getPropertyValue('--inset-bottom')).toBe('48px');
	});

	it('keeps gesture nav layout without extra inset', () => {
		applyNativeBottomInset(24, { nativeMeasured: true });

		expect(document.documentElement.dataset.navBar).toBe('gesture');
		expect(document.documentElement.style.getPropertyValue('--inset-bottom')).toBe('0px');
	});
});

describe('initViewportInsets', () => {
	beforeEach(() => {
		getInsets.mockReset();
		addListener.mockReset();
		isNativeApp.mockReturnValue(true);
		isAndroidApp.mockReturnValue(true);
		getInsets.mockResolvedValue({ top: 0, bottom: 48, mode: 'buttons' });
		addListener.mockResolvedValue({ remove: vi.fn() });
		document.documentElement.style.removeProperty('--inset-bottom');
		delete document.documentElement.dataset.navBar;
	});

	afterEach(() => {
		document.documentElement.style.removeProperty('--inset-bottom');
		delete document.documentElement.dataset.navBar;
	});

	it('applies button-nav inset when Android reports button mode', async () => {
		const cleanup = initViewportInsets();
		await Promise.resolve();
		await Promise.resolve();

		expect(getInsets).toHaveBeenCalled();
		expect(document.documentElement.dataset.navBar).toBe('buttons');
		expect(document.documentElement.style.getPropertyValue('--inset-bottom')).toBe('48px');

		cleanup();
		expect(document.documentElement.dataset.navBar).toBeUndefined();
	});

	it('keeps gesture nav flush when Android reports gesture mode', async () => {
		getInsets.mockResolvedValue({ top: 0, bottom: 24, mode: 'gesture' });

		const cleanup = initViewportInsets();
		await Promise.resolve();
		await Promise.resolve();

		expect(document.documentElement.dataset.navBar).toBe('gesture');
		expect(document.documentElement.style.getPropertyValue('--inset-bottom')).toBe('0px');
		expect(document.documentElement.style.getPropertyValue('--gesture-clearance')).toBe('18px');

		cleanup();
	});

	it('does nothing on web', () => {
		isNativeApp.mockReturnValue(false);
		const cleanup = initViewportInsets();

		expect(getInsets).not.toHaveBeenCalled();
		expect(document.documentElement.style.getPropertyValue('--inset-bottom')).toBe('');

		cleanup();
	});
});
