/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	isNativeApp: vi.fn(),
	subscribeDeviceOrientation: vi.fn(),
	requestOrientationPermission: vi.fn(),
	addListener: vi.fn()
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: (...args: unknown[]) => mocks.isNativeApp(...args)
}));

vi.mock('$lib/utils/compass', () => ({
	createThrottledCallback: (handler: (value: unknown) => void) => handler,
	subscribeDeviceOrientation: (...args: unknown[]) =>
		mocks.subscribeDeviceOrientation(...args),
	requestOrientationPermission: (...args: unknown[]) =>
		mocks.requestOrientationPermission(...args)
}));

vi.mock('@capacitor/app', () => ({
	App: {
		addListener: (...args: unknown[]) => mocks.addListener(...args)
	}
}));

vi.mock('capacitor-community-device-orientation', () => ({
	DeviceOrientation: {
		watchOrientation: vi.fn(),
		clearWatch: vi.fn()
	}
}));

import { watchFusedHeading, type HeadingSample } from './headingProvider';

describe('watchFusedHeading', () => {
	let unsubscribe: (() => void) | undefined;
	let visibility: DocumentVisibilityState;

	beforeEach(() => {
		visibility = 'visible';
		mocks.isNativeApp.mockReturnValue(false);
		mocks.subscribeDeviceOrientation.mockReset();
		mocks.requestOrientationPermission.mockReset();
		mocks.addListener.mockReset();
		mocks.subscribeDeviceOrientation.mockReturnValue(vi.fn());
		mocks.requestOrientationPermission.mockResolvedValue(true);
		mocks.addListener.mockResolvedValue({ remove: vi.fn() });
		Object.defineProperty(document, 'visibilityState', {
			configurable: true,
			get: () => visibility
		});
	});

	afterEach(() => {
		unsubscribe?.();
		unsubscribe = undefined;
	});

	it('forwards heading samples after permission is granted', async () => {
		const onSample = vi.fn();
		mocks.subscribeDeviceOrientation.mockImplementation(
			(handler: (sample: HeadingSample) => void) => {
				handler({ heading: 42, reference: 'true' });
				return vi.fn();
			}
		);

		unsubscribe = watchFusedHeading({ onSample });
		await vi.waitFor(() => {
			expect(onSample).toHaveBeenCalledWith({ heading: 42, reference: 'true' });
		});
	});

	it('calls onDenied and does not subscribe when permission is refused', async () => {
		mocks.requestOrientationPermission.mockResolvedValue(false);
		const onDenied = vi.fn();
		const onSample = vi.fn();

		unsubscribe = watchFusedHeading({ onSample, onDenied });
		await vi.waitFor(() => {
			expect(onDenied).toHaveBeenCalledOnce();
		});
		expect(mocks.subscribeDeviceOrientation).not.toHaveBeenCalled();
		expect(onSample).not.toHaveBeenCalled();
	});

	it('pauses the subscription when the document is hidden', async () => {
		const stopWatch = vi.fn();
		const onPause = vi.fn();
		mocks.subscribeDeviceOrientation.mockReturnValue(stopWatch);

		unsubscribe = watchFusedHeading({ onSample: vi.fn(), onPause });
		await vi.waitFor(() => {
			expect(mocks.subscribeDeviceOrientation).toHaveBeenCalledOnce();
		});

		visibility = 'hidden';
		document.dispatchEvent(new Event('visibilitychange'));

		expect(stopWatch).toHaveBeenCalledOnce();
		expect(onPause).toHaveBeenCalledOnce();
	});
});
