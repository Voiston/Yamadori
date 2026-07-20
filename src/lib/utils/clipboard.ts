export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

export async function copyCoordinates(lat: number, lng: number): Promise<boolean> {
	return copyText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
}
