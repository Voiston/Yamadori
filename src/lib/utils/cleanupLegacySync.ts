import { del, get, set } from 'idb-keyval';

const PURGED_KEY = 'yamadori-legacy-sync-purged';

const LEGACY_SYNC_KEYS = [
	'yamadori-sync-config',
	'yamadori-sync-meta',
	'yamadori-sync-auth',
	'yamadori-sync-queue',
	'yamadori-sync-device-key',
	'yamadori-sync-credentials'
] as const;

export async function cleanupLegacySyncData(): Promise<void> {
	if (await get<boolean>(PURGED_KEY)) {
		return;
	}

	await Promise.all(LEGACY_SYNC_KEYS.map((key) => del(key)));
	await set(PURGED_KEY, true);
}
