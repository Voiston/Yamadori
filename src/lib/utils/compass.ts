import * as m from '$lib/paraglide/messages.js';
import {
	magneticToTrueHeading,
	normalizeAngle,
	normalizeHeading360,
	smoothAngleCircular
} from '$lib/utils/haversine';

const HEADING_SMOOTHING_BASE = 0.2;
const HEADING_SMOOTHING_DAMPENED = 0.08;
const HEADING_JITTER_THRESHOLD = 15;
const OUTLIER_THRESHOLD = 45;
const MAX_CONSECUTIVE_REJECTS = 3;
const SOURCE_AGREEMENT_THRESHOLD = 30;
const ABSOLUTE_STALE_MS = 500;
export const ORIENTATION_THROTTLE_MS = 66;

/** Sudden jump threshold for magnetometer instability detection. */
export const HEADING_UNSTABLE_JUMP_DEG = 35;
/** Consecutive jumps before the heading is considered unstable. */
export const HEADING_UNSTABLE_JUMP_COUNT = 3;

const DEG_TO_RAD = Math.PI / 180;

export type HeadingFusionContext = {
	latitude: number | null;
	longitude: number | null;
	declinationDeg: number | null;
	gpsCourseDegrees: number | null;
	speedMps: number | null;
};

export const EMPTY_HEADING_FUSION_CONTEXT: HeadingFusionContext = {
	latitude: null,
	longitude: null,
	declinationDeg: null,
	gpsCourseDegrees: null,
	speedMps: null
};

export type HeadingFilterState = {
	smoothed: number | null;
	consecutiveRejects: number;
};

export type DeviceHeadingReading = {
	heading: number;
	reference: 'true' | 'magnetic';
};

export type ReadingSource = {
	reading: DeviceHeadingReading;
	updatedAt: number;
};

export type HeadingStabilityState = {
	lastHeading: number | null;
	jumpStreak: number;
	unstable: boolean;
};

export function createHeadingFilterState(): HeadingFilterState {
	return { smoothed: null, consecutiveRejects: 0 };
}

export function createHeadingStabilityState(): HeadingStabilityState {
	return { lastHeading: null, jumpStreak: 0, unstable: false };
}

/**
 * Tracks large consecutive heading jumps (typical of soft-iron interference
 * or an uncalibrated magnetometer). Returns whether the signal is unstable.
 */
export function updateHeadingStability(
	state: HeadingStabilityState,
	heading: number
): boolean {
	if (state.lastHeading !== null) {
		const delta = Math.abs(normalizeAngle(heading - state.lastHeading));
		if (delta >= HEADING_UNSTABLE_JUMP_DEG) {
			state.jumpStreak += 1;
		} else {
			state.jumpStreak = Math.max(0, state.jumpStreak - 1);
		}
		state.unstable = state.jumpStreak >= HEADING_UNSTABLE_JUMP_COUNT;
	}
	state.lastHeading = normalizeHeading360(heading);
	return state.unstable;
}

export function resetHeadingStabilityState(state: HeadingStabilityState): void {
	state.lastHeading = null;
	state.jumpStreak = 0;
	state.unstable = false;
}

/** W3C Device Orientation: compass heading from tilted device (portrait use). */
export function compassHeadingFromTilt(
	alpha: number,
	beta: number,
	gamma: number,
	screenAngle = 0
): number {
	const x = beta * DEG_TO_RAD;
	const y = gamma * DEG_TO_RAD;
	const z = alpha * DEG_TO_RAD;

	const cX = Math.cos(x);
	const cY = Math.cos(y);
	const cZ = Math.cos(z);
	const sX = Math.sin(x);
	const sY = Math.sin(y);
	const sZ = Math.sin(z);

	const vx = -cZ * sY - sZ * sX * cY;
	const vy = -sZ * sY + cZ * sX * cY;

	let heading = Math.atan2(vx, vy);
	if (heading < 0) {
		heading += 2 * Math.PI;
	}

	return normalizeHeading360(heading / DEG_TO_RAD + screenAngle);
}

function getScreenOrientationAngle(): number {
	if (typeof screen === 'undefined') {
		return 0;
	}
	return screen.orientation?.angle ?? 0;
}

function smoothHeadingAdaptive(previous: number, next: number): number {
	const delta = Math.abs(normalizeAngle(next - previous));
	const factor =
		delta > HEADING_JITTER_THRESHOLD ? HEADING_SMOOTHING_DAMPENED : HEADING_SMOOTHING_BASE;
	return smoothAngleCircular(previous, next, factor);
}

export function processHeadingSample(state: HeadingFilterState, raw: number): number | null {
	if (state.smoothed !== null) {
		const delta = Math.abs(normalizeAngle(raw - state.smoothed));
		if (delta > OUTLIER_THRESHOLD) {
			state.consecutiveRejects += 1;
			if (state.consecutiveRejects < MAX_CONSECUTIVE_REJECTS) {
				return null;
			}
			state.smoothed = raw;
			state.consecutiveRejects = 0;
			return raw;
		}
	}

	state.consecutiveRejects = 0;
	state.smoothed =
		state.smoothed === null ? raw : smoothHeadingAdaptive(state.smoothed, raw);
	return state.smoothed;
}

export function pickActiveReading(
	absolute: ReadingSource | null,
	relative: ReadingSource | null,
	now = Date.now()
): DeviceHeadingReading | null {
	if (!absolute && !relative) {
		return null;
	}
	if (!absolute) {
		return relative!.reading;
	}
	if (!relative) {
		return absolute.reading;
	}

	const absoluteFresh = now - absolute.updatedAt <= ABSOLUTE_STALE_MS;
	if (!absoluteFresh) {
		return relative.reading;
	}

	const delta = Math.abs(normalizeAngle(absolute.reading.heading - relative.reading.heading));
	if (delta >= SOURCE_AGREEMENT_THRESHOLD) {
		return absolute.updatedAt >= relative.updatedAt ? absolute.reading : relative.reading;
	}

	return absolute.reading;
}

export type DeviceHeadingReadingOptions = {
	/** Force absolute/true-north tagging (e.g. deviceorientationabsolute listener). */
	absolute?: boolean;
};

/**
 * Extract a compass reading from a DeviceOrientationEvent.
 * - webkitCompassHeading → true north (iOS Safari)
 * - absolute events / event.absolute → true north
 * - otherwise → magnetic
 */
export function getDeviceHeadingReading(
	event: DeviceOrientationEvent,
	options?: DeviceHeadingReadingOptions
): DeviceHeadingReading | null {
	const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
		.webkitCompassHeading;
	if (typeof webkitHeading === 'number') {
		return { heading: normalizeHeading360(webkitHeading), reference: 'true' };
	}

	if (event.alpha === null || event.beta === null || event.gamma === null) {
		return null;
	}

	const isAbsolute =
		options?.absolute === true ||
		(options?.absolute !== false && event.absolute === true);

	return {
		heading: compassHeadingFromTilt(
			event.alpha,
			event.beta,
			event.gamma,
			getScreenOrientationAngle()
		),
		reference: isAbsolute ? 'true' : 'magnetic'
	};
}

export function refineTrueHeading(
	reading: DeviceHeadingReading,
	context: HeadingFusionContext
): number {
	let trueHeading = reading.heading;

	if (reading.reference === 'magnetic' && context.declinationDeg !== null) {
		trueHeading = magneticToTrueHeading(reading.heading, context.declinationDeg);
	}

	return trueHeading;
}

export function getDeviceHeading(event: DeviceOrientationEvent): number | null {
	const reading = getDeviceHeadingReading(event);
	return reading?.heading ?? null;
}

function emitFilteredReading(
	reading: DeviceHeadingReading,
	handler: (reading: DeviceHeadingReading) => void,
	filterState: HeadingFilterState
): void {
	const smoothed = processHeadingSample(filterState, reading.heading);
	if (smoothed !== null) {
		handler({ heading: smoothed, reference: reading.reference });
	} else if (filterState.smoothed !== null) {
		handler({ heading: filterState.smoothed, reference: reading.reference });
	}
}

export function createThrottledCallback<T>(handler: (value: T) => void): (value: T) => void {
	let lastProcessedAt = 0;
	let throttleTimer: ReturnType<typeof setTimeout> | null = null;
	let pending: T | null = null;

	const flush = () => {
		throttleTimer = null;
		if (pending === null) {
			return;
		}
		const value = pending;
		pending = null;
		lastProcessedAt = Date.now();
		handler(value);
	};

	return (value: T) => {
		pending = value;
		const now = Date.now();
		const elapsed = now - lastProcessedAt;

		if (elapsed >= ORIENTATION_THROTTLE_MS) {
			if (throttleTimer !== null) {
				clearTimeout(throttleTimer);
				throttleTimer = null;
			}
			flush();
			return;
		}

		if (throttleTimer === null) {
			throttleTimer = setTimeout(flush, ORIENTATION_THROTTLE_MS - elapsed);
		}
	};
}

export function createThrottledOrientationProcessor(
	handler: (reading: DeviceHeadingReading) => void,
	filterState: HeadingFilterState
) {
	let lastEmittedKey: string | null = null;

	const emit = (value: DeviceHeadingReading) => {
		const key = `${value.heading.toFixed(3)}:${value.reference}`;
		if (lastEmittedKey === key) {
			return;
		}
		lastEmittedKey = key;
		handler(value);
	};

	return createThrottledCallback((reading: DeviceHeadingReading) => {
		emitFilteredReading(reading, emit, filterState);
	});
}

/**
 * Subscribe to device orientation. Prefers absolute events when available,
 * arbitrates with relative via pickActiveReading, and preserves true/magnetic
 * reference for downstream declination (applied in UI, not here).
 */
export function subscribeDeviceOrientation(
	handler: (reading: DeviceHeadingReading) => void
): () => void {
	const filterState = createHeadingFilterState();
	const supportsAbsolute = 'ondeviceorientationabsolute' in window;
	const processReading = createThrottledOrientationProcessor(handler, filterState);

	let absoluteSource: ReadingSource | null = null;
	let relativeSource: ReadingSource | null = null;

	const emitActive = () => {
		const active = pickActiveReading(absoluteSource, relativeSource);
		if (active) {
			processReading(active);
		}
	};

	const onAbsolute = (event: DeviceOrientationEvent) => {
		const reading = getDeviceHeadingReading(event, { absolute: true });
		if (reading === null) {
			return;
		}
		absoluteSource = { reading, updatedAt: Date.now() };
		emitActive();
	};

	const onRelative = (event: DeviceOrientationEvent) => {
		const reading = getDeviceHeadingReading(event, { absolute: false });
		if (reading === null) {
			return;
		}
		relativeSource = { reading, updatedAt: Date.now() };
		emitActive();
	};

	if (supportsAbsolute) {
		window.addEventListener('deviceorientationabsolute', onAbsolute, true);
		window.addEventListener('deviceorientation', onRelative, true);
		return () => {
			window.removeEventListener('deviceorientationabsolute', onAbsolute, true);
			window.removeEventListener('deviceorientation', onRelative, true);
		};
	}

	window.addEventListener('deviceorientation', onRelative, true);
	return () => window.removeEventListener('deviceorientation', onRelative, true);
}

export async function requestOrientationPermission(): Promise<boolean> {
	const requestPermission = (
		DeviceOrientationEvent as typeof DeviceOrientationEvent & {
			requestPermission?: () => Promise<'granted' | 'denied'>;
		}
	).requestPermission;

	if (!requestPermission) {
		return true;
	}

	try {
		return (await requestPermission()) === 'granted';
	} catch {
		return false;
	}
}

function getCardinals(): string[] {
	return [
		m.compass_cardinal_n(),
		m.compass_cardinal_ne(),
		m.compass_cardinal_e(),
		m.compass_cardinal_se(),
		m.compass_cardinal_s(),
		m.compass_cardinal_sw(),
		m.compass_cardinal_w(),
		m.compass_cardinal_nw()
	];
}

export function headingToCardinal(degrees: number): string {
	const normalized = normalizeHeading360(degrees);
	const index = Math.round(normalized / 45) % 8;
	return getCardinals()[index];
}

export function formatFrontHeading(degrees: number | null): string | null {
	if (degrees === null) {
		return null;
	}

	const rounded = Math.round(degrees);
	const cardinal = headingToCardinal(rounded);
	return `${cardinal} (${rounded}°)`;
}

export function formatFrontLabel(degrees: number | null): string | null {
	const formatted = formatFrontHeading(degrees);
	if (!formatted) {
		return null;
	}
	return m.compass_front({ heading: formatted });
}
