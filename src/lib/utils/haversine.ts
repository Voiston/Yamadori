import * as m from '$lib/paraglide/messages.js';

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
	return (radians * 180) / Math.PI;
}

export function haversineDistanceM(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const dLat = toRadians(lat2 - lat1);
	const dLng = toRadians(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
	return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineBearingDeg(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const lat1Rad = toRadians(lat1);
	const lat2Rad = toRadians(lat2);
	const dLng = toRadians(lng2 - lng1);

	const y = Math.sin(dLng) * Math.cos(lat2Rad);
	const x =
		Math.cos(lat1Rad) * Math.sin(lat2Rad) -
		Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

	return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function normalizeAngle(angle: number): number {
	let normalized = angle % 360;
	if (normalized > 180) normalized -= 360;
	if (normalized < -180) normalized += 360;
	return normalized;
}

export function normalizeHeading360(angle: number): number {
	return ((angle % 360) + 360) % 360;
}

export function smoothAngleCircular(previous: number, next: number, factor: number): number {
	const delta = normalizeAngle(next - previous);
	return normalizeHeading360(previous + delta * factor);
}

export function shortestAngleDelta(current: number, target: number): number {
	const currentMod = normalizeHeading360(current);
	return normalizeAngle(target - currentMod);
}

export function smoothBearing(
	previous: number | null,
	next: number,
	movedMeters: number
): number {
	if (previous === null) {
		return next;
	}
	const factor = movedMeters < 2 ? 0.1 : 0.4;
	return smoothAngleCircular(previous, next, factor);
}

const DEG_TO_RAD = Math.PI / 180;

export function magneticToTrueHeading(magneticHeading: number, declinationDeg: number): number {
	return normalizeHeading360(magneticHeading + declinationDeg);
}

export function blendHeadingsCircular(
	headingA: number,
	headingB: number,
	bWeight: number
): number {
	const aWeight = 1 - bWeight;
	const aRad = headingA * DEG_TO_RAD;
	const bRad = headingB * DEG_TO_RAD;
	const x = aWeight * Math.sin(aRad) + bWeight * Math.sin(bRad);
	const y = aWeight * Math.cos(aRad) + bWeight * Math.cos(bRad);
	return normalizeHeading360(Math.atan2(x, y) / DEG_TO_RAD);
}

export function formatDistance(meters: number): string {
	if (meters < 1000) {
		return m.format_distance_m({ n: String(Math.round(meters)) });
	}
	return m.format_distance_km({ n: (meters / 1000).toFixed(1) });
}
