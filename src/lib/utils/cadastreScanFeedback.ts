import type { CadastreInfo } from '$lib/types/cadastre';
import { effectiveCollectStatus } from '$lib/utils/cadastreRefs';

export type CadastreScanHapticKind = 'selection' | 'warning';

/** Sensitive tenure — parks, agency land, permit-required — vs OK / cache hits. */
function isSensitiveCollectStatus(info: CadastreInfo): boolean {
	const status = effectiveCollectStatus(info);
	return (
		status === 'forbidden' ||
		status === 'permit_required' ||
		status === 'forbidden_or_agency'
	);
}

/**
 * Haptic after a map-tap cadastre scan settles.
 * Selection on OK / cache; warning on sensitive tenure or miss (offline or failed lookup).
 */
export function cadastreScanHapticKind(info: CadastreInfo | null): CadastreScanHapticKind {
	if (!info) {
		return 'warning';
	}
	if (isSensitiveCollectStatus(info)) {
		return 'warning';
	}
	return 'selection';
}
