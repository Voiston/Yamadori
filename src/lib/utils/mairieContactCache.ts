import type { MairieContact } from '$lib/types/mairie-contact';
import { createStore, del, get, keys, set } from 'idb-keyval';

const mairieStore = createStore('yamadori-mairie-cache', 'contacts');

export const MAX_MAIRIE_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_MAIRIE_CACHE_ENTRIES = 100;

export interface CachedMairieEntry {
	fetchedAt: string;
	contact: MairieContact;
}

export function isMairieCacheEntryValid(fetchedAt: string, now = Date.now()): boolean {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return false;
	return now - fetchedMs <= MAX_MAIRIE_CACHE_AGE_MS;
}

export async function getCachedMairieContact(codeInsee: string): Promise<MairieContact | undefined> {
	const key = codeInsee.trim();
	if (!key) return undefined;

	const entry = await get<CachedMairieEntry>(key, mairieStore);
	if (!entry) return undefined;
	if (!isMairieCacheEntryValid(entry.fetchedAt)) {
		await del(key, mairieStore);
		return undefined;
	}
	return entry.contact;
}

async function pruneMairieCache(): Promise<void> {
	const allKeys = await keys(mairieStore);
	const entries: { key: string; fetchedMs: number }[] = [];

	for (const key of allKeys) {
		const entry = await get<CachedMairieEntry>(key, mairieStore);
		if (!entry || !isMairieCacheEntryValid(entry.fetchedAt)) {
			await del(key, mairieStore);
			continue;
		}
		entries.push({ key: String(key), fetchedMs: Date.parse(entry.fetchedAt) });
	}

	if (entries.length <= MAX_MAIRIE_CACHE_ENTRIES) return;

	entries.sort((a, b) => a.fetchedMs - b.fetchedMs);
	const toRemove = entries.length - MAX_MAIRIE_CACHE_ENTRIES;
	for (let index = 0; index < toRemove; index += 1) {
		await del(entries[index].key, mairieStore);
	}
}

export async function saveCachedMairieContact(
	codeInsee: string,
	contact: MairieContact
): Promise<void> {
	const key = codeInsee.trim();
	if (!key) return;

	const entry: CachedMairieEntry = {
		fetchedAt: contact.fetchedAt,
		contact
	};
	await set(key, entry, mairieStore);
	await pruneMairieCache();
}

export async function clearMairieContactCache(): Promise<void> {
	const allKeys = await keys(mairieStore);
	await Promise.all(allKeys.map((key) => del(key, mairieStore)));
}

export async function getMairieContactCacheStats(): Promise<{ count: number }> {
	const allKeys = await keys(mairieStore);
	let count = 0;
	for (const key of allKeys) {
		const entry = await get<CachedMairieEntry>(key, mairieStore);
		if (!entry || !isMairieCacheEntryValid(entry.fetchedAt)) {
			await del(key, mairieStore);
			continue;
		}
		count += 1;
	}
	return { count };
}
