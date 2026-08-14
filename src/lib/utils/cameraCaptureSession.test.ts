import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	beginCameraCapture,
	endCameraCapture,
	isCameraCaptureActive,
	registerCameraSessionDeferredHandlers,
	shouldDeferGpsSyncForCamera
} from './cameraCaptureSession';

describe('cameraCaptureSession', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllTimers();
		registerCameraSessionDeferredHandlers({
			onGpsSyncDeferred: vi.fn()
		});
	});

	it('marks the session active only while capturing', () => {
		expect(isCameraCaptureActive()).toBe(false);
		beginCameraCapture();
		expect(isCameraCaptureActive()).toBe(true);
		expect(shouldDeferGpsSyncForCamera()).toBe(true);
		endCameraCapture();
		expect(isCameraCaptureActive()).toBe(false);
	});

	it('defers GPS callback after capture ends', async () => {
		const onGpsSyncDeferred = vi.fn();
		registerCameraSessionDeferredHandlers({ onGpsSyncDeferred });

		beginCameraCapture();
		endCameraCapture();

		expect(onGpsSyncDeferred).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(500);
		expect(onGpsSyncDeferred).toHaveBeenCalledTimes(1);
	});
});
