function isMobile(): boolean {
	return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function openNavigation(lat: number, lng: number, label?: string): void {
	const encodedLabel = label ? encodeURIComponent(label) : '';
	const geoUrl = encodedLabel
		? `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`
		: `geo:${lat},${lng}?q=${lat},${lng}`;

	if (isMobile()) {
		window.location.href = geoUrl;
		return;
	}

	const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
	window.open(mapsUrl, '_blank', 'noopener,noreferrer');
}
