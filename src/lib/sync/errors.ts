import { ClientResponseError } from 'pocketbase';

export function formatPbError(error: unknown): string {
	if (error instanceof ClientResponseError) {
		const prefix = error.status ? `HTTP ${error.status} — ` : '';
		const data = error.response?.data;
		if (data && typeof data === 'object') {
			const details = Object.entries(data)
				.map(([key, value]) => `${key}: ${String(value)}`)
				.join(', ');
			if (details) return prefix + details;
		}
		return prefix + error.message;
	}
	return error instanceof Error ? error.message : 'Erreur inconnue';
}
