const CAMERA_SESSION_DEFER_MS = 500;

let active = false;
let deferredSyncTimer: ReturnType<typeof setTimeout> | null = null;

type DeferredCallback = () => void;

let onGpsSyncDeferred: DeferredCallback | null = null;

export function registerCameraSessionDeferredHandlers(handlers: {
	onGpsSyncDeferred?: DeferredCallback;
}): void {
	onGpsSyncDeferred = handlers.onGpsSyncDeferred ?? null;
}

export function beginCameraCapture(): void {
	active = true;
	clearDeferredTimers();
}

export function endCameraCapture(): void {
	active = false;
	scheduleDeferredWork();
}

export function isCameraCaptureActive(): boolean {
	return active;
}

function clearDeferredTimers(): void {
	if (deferredSyncTimer) {
		clearTimeout(deferredSyncTimer);
		deferredSyncTimer = null;
	}
}

function scheduleDeferredWork(): void {
	clearDeferredTimers();
	deferredSyncTimer = setTimeout(() => {
		deferredSyncTimer = null;
		onGpsSyncDeferred?.();
	}, CAMERA_SESSION_DEFER_MS);
}

/** Defer GPS resync while the native camera is open; flush after session ends. */
export function shouldDeferGpsSyncForCamera(): boolean {
	return active;
}
