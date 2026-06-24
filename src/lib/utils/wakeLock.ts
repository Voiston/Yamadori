let activeLock: WakeLockSentinel | null = null;
let wakeLockRequested = false;
let visibilityListenerRegistered = false;

function onVisibilityChange(): void {
	if (document.visibilityState === 'visible' && wakeLockRequested) {
		void acquireScreenWakeLock();
	}
}

export async function acquireScreenWakeLock(): Promise<void> {
	wakeLockRequested = true;

	if (typeof document !== 'undefined' && !visibilityListenerRegistered) {
		document.addEventListener('visibilitychange', onVisibilityChange);
		visibilityListenerRegistered = true;
	}

	if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
		try {
			if (activeLock && !activeLock.released) {
				return;
			}
			activeLock = await navigator.wakeLock.request('screen');
			activeLock.addEventListener('release', () => {
				activeLock = null;
			});
			return;
		} catch {
			// Screen wake lock unavailable or denied — try keep-awake below.
		}
	}

	try {
		const { KeepAwake } = await import('@capacitor-community/keep-awake');
		await KeepAwake.keepAwake();
	} catch {
		// Keep-awake plugin unavailable.
	}
}

export async function releaseScreenWakeLock(): Promise<void> {
	wakeLockRequested = false;

	if (!activeLock || activeLock.released) {
		activeLock = null;
	} else {
		try {
			await activeLock.release();
		} catch {
			// Ignore release errors.
		} finally {
			activeLock = null;
		}
	}

	try {
		const { KeepAwake } = await import('@capacitor-community/keep-awake');
		await KeepAwake.allowSleep();
	} catch {
		// Keep-awake plugin unavailable.
	}
}
