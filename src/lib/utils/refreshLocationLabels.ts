import { Preferences } from '@capacitor/preferences';
import { canUseApi } from '$lib/utils/apiPolicy';
import { reverseGeocode } from '$lib/utils/geocoding';
import {
	clearAllLocationLabels,
	treeStore,
	updateLocationLabel
} from '$lib/stores/trees.svelte';
import type { AppLocale } from '$lib/utils/i18n/locale';

const LABELS_LOCALE_KEY = 'yamadori-location-labels-locale';
/** Cap Nominatim traffic on locale change; remaining trees refresh lazily on detail. */
export const MAX_LABEL_REFRESH_PER_SESSION = 20;

let refreshInFlight: Promise<void> | null = null;

/**
 * Re-fetch reverse-geocode labels when the UI locale changes.
 * Labels are stored on trees at capture time; Nominatim names follow Accept-Language.
 * At most {@link MAX_LABEL_REFRESH_PER_SESSION} trees are refreshed per session;
 * others keep cleared labels until tree detail enrichment (shared Nominatim raw cache).
 */
export async function refreshLocationLabelsForUiLocale(locale: AppLocale): Promise<void> {
	if (typeof window === 'undefined') return;
	if (!treeStore.indexReady) return;

	const { value: stored } = await Preferences.get({ key: LABELS_LOCALE_KEY });
	if (stored === locale) return;

	if (refreshInFlight) {
		await refreshInFlight;
		const { value: again } = await Preferences.get({ key: LABELS_LOCALE_KEY });
		if (again === locale) return;
	}

	refreshInFlight = (async () => {
		const targets = treeStore.trees
			.filter((tree) => tree.latitude !== null && tree.longitude !== null)
			.map((tree) => ({
				id: tree.id,
				latitude: tree.latitude as number,
				longitude: tree.longitude as number
			}))
			.slice(0, MAX_LABEL_REFRESH_PER_SESSION);

		// Don't wipe labels if we cannot re-fetch yet (API settings / offline).
		if (targets.length > 0 && !canUseApi('nominatim')) {
			return;
		}

		await clearAllLocationLabels();

		for (const tree of targets) {
			try {
				const label = await reverseGeocode(tree.latitude, tree.longitude);
				await updateLocationLabel(tree.id, label);
			} catch {
				// Detail / next online session can retry
			}
		}

		await Preferences.set({ key: LABELS_LOCALE_KEY, value: locale });
	})();

	try {
		await refreshInFlight;
	} finally {
		refreshInFlight = null;
	}
}
