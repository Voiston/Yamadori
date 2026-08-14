export function createTapDeduper(thresholdMs = 350) {
	let lastAt = 0;
	return () => {
		const now = Date.now();
		if (now - lastAt < thresholdMs) {
			return false;
		}
		lastAt = now;
		return true;
	};
}
