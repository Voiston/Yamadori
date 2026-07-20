import type { MunicipalityContact } from '$lib/geo/providers/municipality/types';
import { lookupMairieContact } from '$lib/utils/mairieContact';

export async function lookupMunicipalityFr(
	adminCode: string,
	_options?: { signal?: AbortSignal }
): Promise<MunicipalityContact | null> {
	return lookupMairieContact(adminCode);
}
