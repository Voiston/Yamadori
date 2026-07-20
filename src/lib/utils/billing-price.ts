/** Detect malformed Play Billing price strings (e.g. "59.99e" instead of "59.99 €"). */
export function isValidPlayPriceString(price: string | null | undefined): boolean {
	if (!price?.trim()) return false;
	if (!/\d/.test(price)) return false;
	// Lone trailing "e" after digits is a known cold-start glitch on some devices.
	if (/^\d[\d.,]*\s*e$/i.test(price.trim())) return false;
	return true;
}

/** Best-effort cleanup while keeping Play-provided formatting when possible. */
export function normalizePlayPriceString(price: string): string {
	const trimmed = price.trim();
	if (!trimmed) return trimmed;

	const trailingE = trimmed.match(/^([\d.,]+)\s*e$/i);
	if (trailingE) {
		return `${trailingE[1]} €`;
	}

	return trimmed
		.replace(/\s+EUR$/i, ' €')
		.replace(/\s+eur$/i, ' €')
		.replace(/\u00a0/g, ' ')
		.trim();
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
