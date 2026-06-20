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

type DeviceHeadingReading = {
	heading: number;
	reference: 'true' | 'magnetic';
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

function fuseHeadingReadings(absolute: number | null, relative: number | null): number | null {
	if (absolute !== null && relative !== null) {
		const delta = Math.abs(normalizeAngle(absolute - relative));
		if (delta >= SOURCE_AGREEMENT_THRESHOLD) {
			return absolute;
		}
		return absolute;
	}

	return absolute ?? relative;
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

function handleOrientationEvent(
	event: DeviceOrientationEvent,
	handler: (heading: number) => void,
	filterState: HeadingFilterState,
	lastReadings: { absolute: number | null; relative: number | null },
	preferAbsolute: boolean,
	getContext: () => HeadingFusionContext
): void {
	const reading = getDeviceHeadingReading(event);
	if (reading === null) {
		return;
	}

	const value = reading.heading;

	if (preferAbsolute) {
		lastReadings.absolute = value;
	} else if (!event.absolute) {
		lastReadings.relative = value;
	} else {
		return;
	}

	const fused = fuseHeadingReadings(lastReadings.absolute, lastReadings.relative);
	if (fused === null) {
		return;
	}

	const refinedReading: DeviceHeadingReading = {
		heading: fused,
		reference: reading.reference === 'true' ? 'true' : 'magnetic'
	};
	const trueHeading = refineTrueHeading(refinedReading, getContext());
	const smoothed = processHeadingSample(filterState, trueHeading);
	if (smoothed !== null) {
		handler(smoothed);
	}
}

export function subscribeDeviceOrientation(
	handler: (heading: number) => void,
	getContext: () => HeadingFusionContext = () => EMPTY_HEADING_FUSION_CONTEXT
): () => void {
	const filterState = createHeadingFilterState();
	const lastReadings = { absolute: null as number | null, relative: null as number | null };
	const supportsAbsolute = 'ondeviceorientationabsolute' in window;

	const onAbsolute = (event: DeviceOrientationEvent) =>
		handleOrientationEvent(event, handler, filterState, lastReadings, true, getContext);
	const onRelative = (event: DeviceOrientationEvent) =>
		handleOrientationEvent(event, handler, filterState, lastReadings, false, getContext);

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
