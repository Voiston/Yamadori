import PocketBase from 'pocketbase';
import type { Tree } from '$lib/types/tree';
import type { SyncConfig, TreeSyncRecord } from '$lib/types/sync';
import { toStorable } from '$lib/utils/idb-store';
import { clearAuthToken, loadAuthToken, normalizeServerUrl, saveAuthToken } from './config';
import { formatPbError } from './errors';

const COLLECTION = 'trees';

/** Client-side guard; PocketBase field should use maxSize 0 (unlimited). */
export const MAX_PAYLOAD_BYTES = 20_000_000;

type TreeListSummary = {
	id: string;
	clientId: string;
	updated: string;
	deleted: boolean;
};

const LIST_PAGE_SIZE = 100;

function isNewerThan(updated: string, since: string | null): boolean {
	if (!since) return true;
	return new Date(updated).getTime() > new Date(since).getTime() - 1000;
}

function assertPayloadSize(payload: Tree, label: string): void {
	const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
	if (bytes > MAX_PAYLOAD_BYTES) {
		const sizeMb = (bytes / 1_000_000).toFixed(1);
		throw new Error(
			`${label} : fiche trop volumineuse (${sizeMb} Mo). Réduisez les photos ou augmentez maxSize sur le champ payload dans PocketBase.`
		);
	}
}

export function createClient(config: SyncConfig): PocketBase {
	return new PocketBase(normalizeServerUrl(config.serverUrl));
}

export async function restoreAuth(pb: PocketBase): Promise<boolean> {
	const token = await loadAuthToken();
	if (!token) return false;
	pb.authStore.save(token, null);
	if (!pb.authStore.isValid) {
		await clearAuthToken();
		return false;
	}
	try {
		await pb.collection('users').authRefresh();
		await saveAuthToken(pb.authStore.token);
		return true;
	} catch {
		pb.authStore.clear();
		await clearAuthToken();
		return false;
	}
}

export async function login(pb: PocketBase, email: string, password: string): Promise<void> {
	await pb.collection('users').authWithPassword(email.trim(), password);
	await saveAuthToken(pb.authStore.token);
}

export async function logout(pb: PocketBase): Promise<void> {
	pb.authStore.clear();
	await clearAuthToken();
}

export async function probeServer(pb: PocketBase): Promise<boolean> {
	try {
		await pb.health.check();
		return true;
	} catch {
		return false;
	}
}

export async function upsertTreeRecord(pb: PocketBase, tree: Tree): Promise<TreeSyncRecord> {
	const payload = toStorable(tree);
	const label = tree.species.trim() || tree.id;
	assertPayloadSize(payload, label);
	const existing = await pb.collection(COLLECTION).getList<TreeSyncRecord>(1, 1, {
		filter: `clientId = "${tree.id}"`
	});

	if (existing.items.length > 0) {
		return pb.collection(COLLECTION).update<TreeSyncRecord>(existing.items[0].id, {
			payload,
			deleted: false
		});
	}

	return pb.collection(COLLECTION).create<TreeSyncRecord>({
		clientId: tree.id,
		payload,
		deleted: false
	});
}

export async function markTreeDeleted(pb: PocketBase, treeId: string): Promise<void> {
	const existing = await pb.collection(COLLECTION).getList<TreeSyncRecord>(1, 1, {
		filter: `clientId = "${treeId}"`
	});

	if (existing.items.length === 0) return;

	await pb.collection(COLLECTION).update(existing.items[0].id, {
		deleted: true,
		payload: existing.items[0].payload
	});
}

export type FetchRemoteOptions = {
	since: string | null;
	localClientIds: Set<string>;
	fullPull?: boolean;
};

export type FetchRemoteResult = {
	records: TreeSyncRecord[];
	warnings: string[];
};

export async function fetchRemoteChanges(
	pb: PocketBase,
	options: FetchRemoteOptions
): Promise<FetchRemoteResult> {
	const summaries: TreeListSummary[] = [];
	let page = 1;

	// Pas de filtre serveur sur `updated` — PocketBase renvoie 400 avec certaines
	// syntaxes de date. On filtre côté client après une liste légère (sans payload).
	while (true) {
		const batch = await pb.collection(COLLECTION).getList<TreeListSummary>(page, LIST_PAGE_SIZE, {
			fields: 'id,clientId,updated,deleted'
		});
		summaries.push(...batch.items);
		if (batch.items.length < LIST_PAGE_SIZE || page >= batch.totalPages) break;
		page += 1;
	}

	const toFetch = options.fullPull
		? summaries
		: summaries.filter(
				(summary) =>
					isNewerThan(summary.updated, options.since) ||
					!options.localClientIds.has(summary.clientId)
			);

	const records: TreeSyncRecord[] = [];
	const warnings: string[] = [];

	for (const summary of toFetch) {
		if (summary.deleted) {
			records.push({
				...summary,
				payload: { id: summary.clientId } as Tree,
				created: summary.updated
			});
			continue;
		}
		try {
			const full = await pb.collection(COLLECTION).getOne<TreeSyncRecord>(summary.id);
			records.push(full);
		} catch (error) {
			warnings.push(`${summary.clientId}: ${formatPbError(error)}`);
		}
	}

	const expectedPayloads = toFetch.filter((summary) => !summary.deleted).length;
	if (expectedPayloads > 0 && records.filter((r) => !r.deleted).length === 0) {
		throw new Error(warnings.join(' ; ') || 'Impossible de lire les fiches du serveur.');
	}

	return { records, warnings };
}
