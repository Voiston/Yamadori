import { Preferences } from '@capacitor/preferences';
import { createPromoEndsAt, getProPromoState } from '$lib/utils/proOffer';

const STORAGE_KEY = 'yamadori-pro-promo-ends-at';
const STORAGE_VERSION_KEY = 'yamadori-pro-promo-storage-v2';
const STORAGE_VERSION = 'pricing-only';
/** Once set, the discovery promo window will never restart. */
const CONSUMED_KEY = 'yamadori-pro-promo-consumed';

export const proPromoState = $state({
	loaded: false,
	promoEndsAt: null as string | null,
	/** True after the user has already been offered a promo window (active or expired). */
	promoConsumed: false
});

async function migratePromoStorageIfNeeded(inMemoryEndsAt: string | null): Promise<void> {
	const { value: version } = await Preferences.get({ key: STORAGE_VERSION_KEY });
	if (version === STORAGE_VERSION) {
		return;
	}

	await Preferences.remove({ key: STORAGE_KEY });
	if (!inMemoryEndsAt) {
		proPromoState.promoEndsAt = null;
	}
	await Preferences.set({ key: STORAGE_VERSION_KEY, value: STORAGE_VERSION });
}

async function markPromoConsumed(): Promise<void> {
	proPromoState.promoConsumed = true;
	await Preferences.set({ key: CONSUMED_KEY, value: '1' });
}

export async function initProPromo(): Promise<void> {
	if (proPromoState.loaded) {
		return;
	}

	const inMemoryEndsAt = proPromoState.promoEndsAt;

	try {
		await migratePromoStorageIfNeeded(inMemoryEndsAt);
		const [{ value }, { value: consumed }] = await Promise.all([
			Preferences.get({ key: STORAGE_KEY }),
			Preferences.get({ key: CONSUMED_KEY })
		]);
		proPromoState.promoConsumed = consumed === '1';
		if (!inMemoryEndsAt) {
			proPromoState.promoEndsAt = value || null;
		}
		// Expired persisted window still counts as consumed (one-shot discovery).
		if (proPromoState.promoEndsAt) {
			const { phase } = getProPromoState(proPromoState.promoEndsAt);
			if (phase === 'expired') {
				proPromoState.promoEndsAt = null;
				await Preferences.remove({ key: STORAGE_KEY });
				if (!proPromoState.promoConsumed) {
					await markPromoConsumed();
				}
			} else if (phase === 'promo' && !proPromoState.promoConsumed) {
				await markPromoConsumed();
			}
		}
	} catch {
		if (!inMemoryEndsAt) {
			proPromoState.promoEndsAt = null;
		}
	} finally {
		proPromoState.loaded = true;
	}
}

export async function startPromoWindowIfNeeded(): Promise<void> {
	if (proPromoState.promoEndsAt) {
		const { phase } = getProPromoState(proPromoState.promoEndsAt);
		if (phase === 'promo') {
			return;
		}
		if (phase === 'expired') {
			proPromoState.promoEndsAt = null;
			await Preferences.remove({ key: STORAGE_KEY });
			await markPromoConsumed();
			return;
		}
	}

	// One-shot: never open a second discovery window after the first was consumed.
	if (proPromoState.promoConsumed) {
		return;
	}

	const endsAt = createPromoEndsAt();
	proPromoState.promoEndsAt = endsAt;
	await Preferences.set({ key: STORAGE_KEY, value: endsAt });
	await markPromoConsumed();
}
