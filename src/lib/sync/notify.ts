import { isSyncConfigured, loadSyncConfig, loadSyncMeta, saveSyncMeta } from './config';
import { enqueueMutation } from './queue';

async function touchLocalMeta(treeId: string): Promise<void> {
	const meta = await loadSyncMeta();
	const existing = meta.trees[treeId];
	meta.trees[treeId] = {
		pbId: existing?.pbId ?? null,
		localUpdatedAt: new Date().toISOString(),
		remoteUpdatedAt: existing?.remoteUpdatedAt ?? null
	};
	await saveSyncMeta(meta);
}

async function triggerSync(): Promise<void> {
	const { refreshPendingCount, runSync } = await import('./engine.svelte');
	await refreshPendingCount();
	void runSync();
}

export async function notifyTreeChanged(treeId: string): Promise<void> {
	const config = await loadSyncConfig();
	if (!isSyncConfigured(config)) return;
	await touchLocalMeta(treeId);
	await enqueueMutation({ type: 'upsert', treeId, enqueuedAt: new Date().toISOString() });
	await triggerSync();
}

export async function notifyTreeDeleted(treeId: string): Promise<void> {
	const config = await loadSyncConfig();
	if (!isSyncConfigured(config)) return;
	const meta = await loadSyncMeta();
	delete meta.trees[treeId];
	await saveSyncMeta(meta);
	await enqueueMutation({ type: 'delete', treeId, enqueuedAt: new Date().toISOString() });
	await triggerSync();
}
