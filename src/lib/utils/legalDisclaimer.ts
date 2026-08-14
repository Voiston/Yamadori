import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '$lib/utils/platform';

/** Bump when the legal disclaimer copy materially changes (forces re-ack). */
export const LEGAL_DISCLAIMER_VERSION = 1;

const VERSION_KEY = 'legalDisclaimerVersion';
const ACCEPTED_AT_KEY = 'legalDisclaimerAcceptedAt';

export async function hasAcceptedCurrentLegalDisclaimer(): Promise<boolean> {
	if (!isNativeApp()) {
		return true;
	}

	const { value } = await Preferences.get({ key: VERSION_KEY });
	if (value == null) {
		return false;
	}

	const acceptedVersion = Number.parseInt(value, 10);
	return Number.isFinite(acceptedVersion) && acceptedVersion >= LEGAL_DISCLAIMER_VERSION;
}

export async function acceptLegalDisclaimer(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	await Preferences.set({ key: VERSION_KEY, value: String(LEGAL_DISCLAIMER_VERSION) });
	await Preferences.set({ key: ACCEPTED_AT_KEY, value: new Date().toISOString() });
}

export async function clearLegalDisclaimerAck(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	await Preferences.remove({ key: VERSION_KEY });
	await Preferences.remove({ key: ACCEPTED_AT_KEY });
}
