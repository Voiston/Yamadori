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

export function getDeviceHeading(event: DeviceOrientationEvent): number | null {
	const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
		.webkitCompassHeading;
	if (typeof webkitHeading === 'number') {
		return webkitHeading;
	}
	if (event.alpha !== null) {
		return (360 - event.alpha) % 360;
	}
	return null;
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
	const normalized = ((degrees % 360) + 360) % 360;
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
