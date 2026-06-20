import { get, set } from 'idb-keyval';
import type { SyncConfig, SyncMeta } from '$lib/types/sync';
import { toStorable } from '$lib/utils/idb-store';

const CONFIG_KEY = 'yamadori-sync-config';
const META_KEY = 'yamadori-sync-meta';
const AUTH_KEY = 'yamadori-sync-auth';

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
	serverUrl: '',
	email: '',
	enabled: false,
	rememberPassword: false
};

export const DEFAULT_SYNC_META: SyncMeta = {
	lastSyncAt: null,
	trees: {}
};

export async function loadSyncConfig(): Promise<SyncConfig> {
	const stored = await get<Partial<SyncConfig>>(CONFIG_KEY);
	if (!stored) return { ...DEFAULT_SYNC_CONFIG };
	return { ...DEFAULT_SYNC_CONFIG, ...stored };
}

export async function saveSyncConfig(config: SyncConfig): Promise<void> {
	await set(CONFIG_KEY, toStorable(config));
}

export async function loadSyncMeta(): Promise<SyncMeta> {
	const stored = await get<Partial<SyncMeta>>(META_KEY);
	if (!stored) return structuredClone(DEFAULT_SYNC_META);
	return {
		lastSyncAt: stored.lastSyncAt ?? null,
		trees: stored.trees ?? {}
	};
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
	await set(META_KEY, toStorable(meta));
}

export async function loadAuthToken(): Promise<string | null> {
	return (await get<string>(AUTH_KEY)) ?? null;
}

export async function saveAuthToken(token: string): Promise<void> {
	await set(AUTH_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
	await set(AUTH_KEY, null);
}

export function normalizeServerUrl(url: string): string {
	return url.trim().replace(/\/+$/, '');
}

export function isSyncConfigured(config: SyncConfig): boolean {
	return config.enabled && !!normalizeServerUrl(config.serverUrl) && !!config.email.trim();
}
