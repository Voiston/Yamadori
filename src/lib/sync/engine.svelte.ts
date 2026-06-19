import { get, set } from 'idb-keyval';
import type { Tree } from '$lib/types/tree';
import type { SyncConfig, SyncMeta, SyncStatus } from '$lib/types/sync';
import { treeStore } from '$lib/stores/trees.svelte';
import { toStorable } from '$lib/utils/idb-store';
import {
	isSyncConfigured,
	loadSyncConfig,
	loadSyncMeta,
	saveSyncMeta
} from './config';
import { enqueueMutation, loadQueue, saveQueue } from './queue';
import { formatPbError } from './errors';
import {
	createClient,
	fetchRemoteChanges,
	login,
	markTreeDeleted,
	probeServer,
	restoreAuth,
	upsertTreeRecord
} from './pocketbase';

const STORAGE_KEY = 'yamadori-trees';
const PROBE_INTERVAL_MS = 30_000;

export const syncState = $state({
	status: 'unconfigured' as SyncStatus,
	pendingCount: 0,
	lastError: null as string | null,
	lastSyncedAt: null as string | null
});

let probeTimer: ReturnType<typeof setInterval> | null = null;
let syncInFlight = false;

type PushReport = {
	succeeded: number;
	failed: number;
	errors: string[];
};

function formatPushSummary(report: PushReport): string {
	const total = report.succeeded + report.failed;
	const summary = `${report.succeeded}/${total} fiches envoyées — ${report.failed} échec(s)`;
	const detail = report.errors.slice(0, 2).join(' ; ');
	return detail ? `${summary}. ${detail}` : summary;
}

function setStatus(status: SyncStatus, error: string | null = null): void {
	syncState.status = status;
	syncState.lastError = error;
}

function getTreeFromStore(treeId: string): Tree | undefined {
	return treeStore.trees.find((tree) => tree.id === treeId);
}

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

export async function notifyTreeChanged(treeId: string): Promise<void> {
	const config = await loadSyncConfig();
	if (!isSyncConfigured(config)) return;
	await touchLocalMeta(treeId);
	await enqueueMutation({ type: 'upsert', treeId, enqueuedAt: new Date().toISOString() });
	await refreshPendingCount();
	void runSync();
}

export async function notifyTreeDeleted(treeId: string): Promise<void> {
	const config = await loadSyncConfig();
	if (!isSyncConfigured(config)) return;
	const meta = await loadSyncMeta();
	delete meta.trees[treeId];
	await saveSyncMeta(meta);
	await enqueueMutation({ type: 'delete', treeId, enqueuedAt: new Date().toISOString() });
	await refreshPendingCount();
	void runSync();
}

export async function refreshPendingCount(): Promise<void> {
	syncState.pendingCount = (await loadQueue()).length;
}

async function applyRemoteRecords(
	records: { id: string; clientId: string; payload: Tree; deleted: boolean; updated: string }[]
): Promise<void> {
	const meta = await loadSyncMeta();
	const localTrees = new Map(treeStore.trees.map((tree) => [tree.id, tree]));
	let changed = false;

	for (const record of records) {
		const treeId = record.clientId;
		const remoteUpdatedAt = record.updated;
		const localMeta = meta.trees[treeId];
		const localUpdatedAt = localMeta?.localUpdatedAt ?? null;

		if (record.deleted) {
			if (localTrees.has(treeId)) {
				localTrees.delete(treeId);
				delete meta.trees[treeId];
				changed = true;
			}
			continue;
		}

		const shouldApply =
			!localTrees.has(treeId) ||
			!localUpdatedAt ||
			new Date(remoteUpdatedAt).getTime() >= new Date(localUpdatedAt).getTime();

		if (!shouldApply) continue;

		localTrees.set(treeId, toStorable(record.payload));
		meta.trees[treeId] = {
			pbId: record.id,
			localUpdatedAt: remoteUpdatedAt,
			remoteUpdatedAt
		};
		changed = true;
	}

	if (!changed) return;

	treeStore.trees = [...localTrees.values()].sort((a, b) =>
		b.capturedAt.localeCompare(a.capturedAt)
	);
	await set(STORAGE_KEY, toStorable($state.snapshot(treeStore.trees)));
	await saveSyncMeta(meta);
}

async function pushQueue(
	pb: ReturnType<typeof createClient>,
	meta: SyncMeta
): Promise<{ meta: SyncMeta; report: PushReport }> {
	const queue = await loadQueue();
	const remaining = [...queue];
	const report: PushReport = { succeeded: 0, failed: 0, errors: [] };

	for (const mutation of queue) {
		try {
			if (mutation.type === 'delete') {
				await markTreeDeleted(pb, mutation.treeId);
				delete meta.trees[mutation.treeId];
			} else {
				const tree = getTreeFromStore(mutation.treeId);
				if (!tree) {
					remaining.splice(remaining.indexOf(mutation), 1);
					continue;
				}
				const record = await upsertTreeRecord(pb, tree);
				meta.trees[mutation.treeId] = {
					pbId: record.id,
					localUpdatedAt: meta.trees[mutation.treeId]?.localUpdatedAt ?? new Date().toISOString(),
					remoteUpdatedAt: record.updated
				};
			}
			report.succeeded += 1;
			remaining.splice(remaining.indexOf(mutation), 1);
		} catch (error) {
			report.failed += 1;
			const tree = getTreeFromStore(mutation.treeId);
			const label =
				mutation.type === 'upsert' ? (tree?.species.trim() || mutation.treeId) : mutation.treeId;
			report.errors.push(`${label}: ${formatPbError(error)}`);
		}
	}

	await saveQueue(remaining);
	return { meta, report };
}

export async function runSync(options: { fullPush?: boolean } = {}): Promise<boolean> {
	if (syncInFlight) return false;
	const config = await loadSyncConfig();
	if (!isSyncConfigured(config)) {
		setStatus('unconfigured');
		return false;
	}

	syncInFlight = true;
	setStatus('syncing');

	try {
		const pb = createClient(config);
		const authed = await restoreAuth(pb);
		if (!authed) {
			setStatus('error', 'Session expirée — reconnectez-vous dans Réglages.');
			return false;
		}

		const reachable = await probeServer(pb);
		if (!reachable) {
			setStatus('offline');
			return false;
		}

		let meta = await loadSyncMeta();

		if (options.fullPush) {
			for (const tree of treeStore.trees) {
				await enqueueMutation({
					type: 'upsert',
					treeId: tree.id,
					enqueuedAt: new Date().toISOString()
				});
			}
		}

		const pushResult = await pushQueue(pb, meta);
		meta = pushResult.meta;
		const pushReport = pushResult.report;
		const wasFirstSync = !meta.lastSyncAt;

		const skipPull =
			wasFirstSync && pushReport.failed === 0 && pushReport.succeeded > 0;

		if (!skipPull) {
			try {
				const remoteRecords = await fetchRemoteChanges(pb, meta.lastSyncAt);
				await applyRemoteRecords(remoteRecords);
			} catch (pullError) {
				await refreshPendingCount();
				setStatus(
					'error',
					`Envoi OK mais lecture serveur échouée : ${formatPbError(pullError)}`
				);
				return false;
			}
		}

		meta.lastSyncAt = new Date().toISOString();
		await saveSyncMeta(meta);
		syncState.lastSyncedAt = meta.lastSyncAt;
		await refreshPendingCount();

		if (pushReport.failed > 0) {
			setStatus('error', formatPushSummary(pushReport));
			return false;
		}

		setStatus(syncState.pendingCount > 0 ? 'error' : 'idle');
		return true;
	} catch (error) {
		const message = formatPbError(error);
		setStatus('error', message);
		return false;
	} finally {
		syncInFlight = false;
	}
}

export async function testConnection(
	config: SyncConfig,
	password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (!isSyncConfigured({ ...config, enabled: true })) {
		return { ok: false, error: 'URL et email requis.' };
	}

	try {
		const pb = createClient(config);
		const reachable = await probeServer(pb);
		if (!reachable) {
			return { ok: false, error: 'Serveur injoignable. Vérifiez Tailscale et PocketBase.' };
		}
		await login(pb, config.email, password);
		return { ok: true };
	} catch (error) {
		return { ok: false, error: formatPbError(error) };
	}
}

export async function initSyncEngine(): Promise<void> {
	const config = await loadSyncConfig();
	const meta = await loadSyncMeta();
	syncState.lastSyncedAt = meta.lastSyncAt;
	await refreshPendingCount();

	if (!config.enabled) {
		setStatus('disabled');
		return;
	}
	if (!isSyncConfigured(config)) {
		setStatus('unconfigured');
		return;
	}

	if (probeTimer) clearInterval(probeTimer);
	probeTimer = setInterval(() => {
		void runSync();
	}, PROBE_INTERVAL_MS);

	void runSync();
}

export function stopSyncEngine(): void {
	if (probeTimer) {
		clearInterval(probeTimer);
		probeTimer = null;
	}
}
