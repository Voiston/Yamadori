const DEBUG_ENABLED = import.meta.env.DEV;

const ENDPOINT =
	'http://127.0.0.1:7808/ingest/9a168c16-0f82-4a8a-a78e-35cdc2768416';
const SESSION_ID = '521224';
const STORAGE_KEY = 'yamadori-debug-521224';

export const debugCounters = {
	climateEffectRuns: 0,
	climateFetches: 0,
	gpsWatchStarts: 0,
	gpsWatchStops: 0,
	captureMounts: 0,
	captureUnmounts: 0,
	speciesClicks: 0,
	photoOpens: 0,
	visitSpeciesClicks: 0,
	visitPhotoOpens: 0,
	documentTouches: 0,
	sessionKeyBumps: 0,
	submitting: false,
	picking: false,
	lastHeartbeatMs: 0
};

export function debugLog(
	_location: string,
	_message: string,
	_data: Record<string, unknown> = {},
	_hypothesisId?: string,
	_runId = 'pre-fix'
): void {
	if (!DEBUG_ENABLED) {
		return;
	}

	const entry = {
		sessionId: SESSION_ID,
		location: _location,
		message: _message,
		data: _data,
		hypothesisId: _hypothesisId,
		runId: _runId,
		timestamp: Date.now()
	};

	try {
		const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[];
		prev.push(entry);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prev.slice(-100)));
	} catch {
		// ignore storage errors
	}

	console.info('[YAMADORI-DEBUG]', _message, _data);

	fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Debug-Session-Id': SESSION_ID
		},
		body: JSON.stringify(entry)
	}).catch(() => {});
}

export function resetVisitDebugCounters(): void {
	if (!DEBUG_ENABLED) {
		return;
	}
	debugCounters.visitSpeciesClicks = 0;
	debugCounters.visitPhotoOpens = 0;
	debugCounters.documentTouches = 0;
}

export function readDebugLogs(): unknown[] {
	if (!DEBUG_ENABLED) {
		return [];
	}
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[];
	} catch {
		return [];
	}
}
