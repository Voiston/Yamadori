const TREE_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
		const random = (Math.random() * 16) | 0;
		const value = char === 'x' ? random : (random & 0x3) | 0x8;
		return value.toString(16);
	});
}

export function isValidTreeId(id: string): boolean {
	return TREE_ID_PATTERN.test(id);
}

/** Reject malformed IDs from imports to prevent XSS and path injection. */
export function sanitizeTreeId(id: unknown): string {
	if (typeof id === 'string' && isValidTreeId(id)) {
		return id;
	}
	return generateId();
}
