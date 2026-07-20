import { secureIdbGet, secureIdbSet } from '$lib/utils/secure-idb';
import { STORAGE_KEY_VERSION, TREE_STORAGE_VERSION } from './types';

let storageVersionCache: number | null = null;

export function resetTreeStorageVersionCacheForTests(): void {
	storageVersionCache = null;
}

export async function writeStorageVersion(version: number): Promise<void> {
	await secureIdbSet(STORAGE_KEY_VERSION, version);
	storageVersionCache = version;
}

export async function readStorageVersion(): Promise<number | undefined> {
	return secureIdbGet<number>(STORAGE_KEY_VERSION);
}

export function getCachedStorageVersion(): number | null {
	return storageVersionCache;
}

export function setCachedStorageVersion(version: number | null): void {
	storageVersionCache = version;
}

export { TREE_STORAGE_VERSION };
