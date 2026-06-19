export async function copyCoordinates(lat: number, lng: number): Promise<boolean> {
	const text = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
