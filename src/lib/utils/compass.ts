import {
	fuseWithGpsCourse,
	magneticToTrueHeading,
	normalizeAngle,
	normalizeHeading360,
	smoothAngleCircular
} from '$lib/utils/haversine';
import { getMagneticDeclinationDeg } from '$lib/utils/magneticDeclination';

const CARDINALS = [
	'Nord',
	'Nord-Est',
	'Est',
	'Sud-Est',
	'Sud',
	'Sud-Ouest',
	'Ouest',
	'Nord-Ouest'
] as const;

const HEADING_SMOOTHING_BASE = 0.2;
const HEADING_SMOOTHING_DAMPENED = 0.08;
const HEADING_JITTER_THRESHOLD = 15;
const OUTLIER_THRESHOLD = 45;
const MAX_CONSECUTIVE_REJECTS = 3;
const SOURCE_AGREEMENT_THRESHOLD = 30;
const ABSOLUTE_STALE_MS = 500;
export const ORIENTATION_THROTTLE_MS = 50;

const DEG_TO_RAD = Math.PI / 180;

export type HeadingFusionContext = {
	latitude: number | null;
	longitude: number | null;
	gpsCourseDegrees: number | null;
	speedMps: number | null;
};

export const EMPTY_HEADING_FUSION_CONTEXT: HeadingFusionContext = {
	latitude: null,
	longitude: null,
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

type ReadingSource = {
	reading: DeviceHeadingReading;
	updatedAt: number;
};

export function createHeadingFilterState(): HeadingFilterState {
	return { smoothed: null, consecutiveRejects: 0 };
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

export function getDeviceHeadingReading(event: DeviceOrientationEvent): DeviceHeadingReading | null {
	const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
		.webkitCompassHeading;
	if (typeof webkitHeading === 'number') {
		return { heading: normalizeHeading360(webkitHeading), reference: 'true' };
	}

	if (event.alpha === null || event.beta === null || event.gamma === null) {
		return null;
	}

	return {
		heading: compassHeadingFromTilt(
			event.alpha,
			event.beta,
			event.gamma,
			getScreenOrientationAngle()
		),
		reference: 'magnetic'
	};
}

export function refineTrueHeading(
	reading: DeviceHeadingReading,
	context: HeadingFusionContext
): number {
	let trueHeading = reading.heading;

	if (
		reading.reference === 'magnetic' &&
		context.latitude !== null &&
		context.longitude !== null
	) {
		const declination = getMagneticDeclinationDeg(context.latitude, context.longitude);
		trueHeading = magneticToTrueHeading(reading.heading, declination);
	}

	return fuseWithGpsCourse(trueHeading, context.gpsCourseDegrees, context.speedMps);
}

export function getDeviceHeading(event: DeviceOrientationEvent): number | null {
	const reading = getDeviceHeadingReading(event);
	return reading?.heading ?? null;
}

function processOrientationReading(
	reading: DeviceHeadingReading,
	handler: (heading: number) => void,
	filterState: HeadingFilterState,
	getContext: () => HeadingFusionContext
): void {
	const trueHeading = refineTrueHeading(reading, getContext());
	const smoothed = processHeadingSample(filterState, trueHeading);
	if (smoothed !== null) {
		handler(smoothed);
	} else if (filterState.smoothed !== null) {
		handler(filterState.smoothed);
	}
}

export function createThrottledOrientationProcessor(
	handler: (heading: number) => void,
	filterState: HeadingFilterState,
	getContext: () => HeadingFusionContext
) {
	let lastProcessedAt = 0;
	let lastEmitted: number | null = null;
	let throttleTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingReading: DeviceHeadingReading | null = null;

	const emit = (value: number) => {
		if (lastEmitted === value) {
			return;
		}
		lastEmitted = value;
		handler(value);
	};

	const flush = () => {
		throttleTimer = null;
		if (!pendingReading) {
			return;
		}
		const reading = pendingReading;
		pendingReading = null;
		lastProcessedAt = Date.now();
		processOrientationReading(reading, emit, filterState, getContext);
	};

	return (reading: DeviceHeadingReading) => {
		pendingReading = reading;
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

export function subscribeDeviceOrientation(
	handler: (heading: number) => void,
	getContext: () => HeadingFusionContext = () => EMPTY_HEADING_FUSION_CONTEXT
): () => void {
	const filterState = createHeadingFilterState();
	const absoluteSource = { current: null as ReadingSource | null };
	const relativeSource = { current: null as ReadingSource | null };
	const supportsAbsolute = 'ondeviceorientationabsolute' in window;
	const processReading = createThrottledOrientationProcessor(handler, filterState, getContext);

	const enqueueReading = (reading: DeviceHeadingReading) => {
		const active = pickActiveReading(absoluteSource.current, relativeSource.current);
		if (active) {
			processReading(active);
		}
	};

	const onAbsolute = (event: DeviceOrientationEvent) => {
		const reading = getDeviceHeadingReading(event);
		if (reading === null) {
			return;
		}
		absoluteSource.current = { reading, updatedAt: Date.now() };
		enqueueReading(reading);
	};

	const onRelative = (event: DeviceOrientationEvent) => {
		if (event.absolute) {
			return;
		}
		const reading = getDeviceHeadingReading(event);
		if (reading === null) {
			return;
		}
		relativeSource.current = { reading, updatedAt: Date.now() };
		enqueueReading(reading);
	};

	if (supportsAbsolute) {
		window.addEventListener('deviceorientationabsolute', onAbsolute, true);
		window.addEventListener('deviceorientation', onRelative, true);
		return () => {
			window.removeEventListener('deviceorientationabsolute', onAbsolute, true);
			window.removeEventListener('deviceorientation', onRelative, true);
		};
	}

	window.addEventListener('deviceorientation', onAbsolute, true);
	return () => window.removeEventListener('deviceorientation', onAbsolute, true);
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

export function headingToCardinal(degrees: number): string {
	const normalized = normalizeHeading360(degrees);
	const index = Math.round(normalized / 45) % 8;
	return CARDINALS[index];
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
	return `Front : ${formatted}`;
}
