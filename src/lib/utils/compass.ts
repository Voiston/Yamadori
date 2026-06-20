import { normalizeAngle, normalizeHeading360 } from '$lib/utils/haversine';

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

const HEADING_SMOOTHING_FACTOR = 0.15;

const DEG_TO_RAD = Math.PI / 180;

/** W3C Device Orientation: compass heading from tilted device (portrait use). */
function compassHeadingFromTilt(alpha: number, beta: number, gamma: number): number {
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

	let heading = Math.atan(vx / vy);
	if (vy < 0) {
		heading += Math.PI;
	} else if (vx < 0) {
		heading += 2 * Math.PI;
	}

	return normalizeHeading360(heading / DEG_TO_RAD);
}

function smoothHeading(previous: number, next: number): number {
	const delta = normalizeAngle(next - previous);
	return normalizeHeading360(previous + delta * HEADING_SMOOTHING_FACTOR);
}

export function getDeviceHeading(event: DeviceOrientationEvent): number | null {
	const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
		.webkitCompassHeading;
	if (typeof webkitHeading === 'number') {
		return normalizeHeading360(webkitHeading);
	}

	if (
		event.absolute &&
		event.alpha !== null &&
		event.beta !== null &&
		event.gamma !== null
	) {
		return compassHeadingFromTilt(event.alpha, event.beta, event.gamma);
	}

	return null;
}

function handleOrientationEvent(
	event: DeviceOrientationEvent,
	handler: (heading: number) => void,
	smoothedHeading: { value: number | null }
): void {
	const value = getDeviceHeading(event);
	if (value === null) {
		return;
	}

	smoothedHeading.value =
		smoothedHeading.value === null ? value : smoothHeading(smoothedHeading.value, value);
	handler(smoothedHeading.value);
}

export function subscribeDeviceOrientation(handler: (heading: number) => void): () => void {
	const smoothedHeading = { value: null as number | null };
	const listener = (event: DeviceOrientationEvent) =>
		handleOrientationEvent(event, handler, smoothedHeading);
	const eventName: 'deviceorientationabsolute' | 'deviceorientation' =
		'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';

	window.addEventListener(eventName, listener, true);
	return () => window.removeEventListener(eventName, listener, true);
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
