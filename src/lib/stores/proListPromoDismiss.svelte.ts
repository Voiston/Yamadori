import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'yamadori-pro-list-promo-dismiss-until';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export const proListPromoDismissState = $state({
	loaded: false,
	dismissedUntil: null as string | null
});

export function isProListPromoDismissed(now = Date.now()): boolean {
	const until = proListPromoDismissState.dismissedUntil;
	if (!until) return false;
	const ts = Date.parse(until);
	if (Number.isNaN(ts)) return false;
	return now < ts;
}

export async function initProListPromoDismiss(): Promise<void> {
	if (proListPromoDismissState.loaded) {
		return;
	}

	try {
		const { value } = await Preferences.get({ key: STORAGE_KEY });
		if (value) {
			const ts = Date.parse(value);
			if (!Number.isNaN(ts) && Date.now() < ts) {
				proListPromoDismissState.dismissedUntil = value;
			} else {
				proListPromoDismissState.dismissedUntil = null;
				if (value) {
					await Preferences.remove({ key: STORAGE_KEY });
				}
			}
		} else {
			proListPromoDismissState.dismissedUntil = null;
		}
	} catch (error) {
		console.error('initProListPromoDismiss failed:', error);
		proListPromoDismissState.dismissedUntil = null;
	} finally {
		proListPromoDismissState.loaded = true;
	}
}

export async function dismissProListPromo(now = Date.now()): Promise<void> {
	const until = new Date(now + SNOOZE_MS).toISOString();
	proListPromoDismissState.dismissedUntil = until;
	try {
		await Preferences.set({ key: STORAGE_KEY, value: until });
	} catch (error) {
		console.error('dismissProListPromo failed:', error);
	}
}
