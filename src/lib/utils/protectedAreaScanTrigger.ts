import { cadastreCacheKey } from '$lib/utils/cadastre';

/**
 * `$effect` key for protected-area scans. GPS jitter inside the same ~11 m
 * cadastre cell must not retrigger a request or flash the loading line.
 */
export function protectedAreaScanEffectKey(
	latitude: number,
	longitude: number,
	online: boolean
): string {
	return `${cadastreCacheKey(latitude, longitude)}:${online ? '1' : '0'}`;
}
