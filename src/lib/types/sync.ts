import type { Tree } from './tree';

export interface SyncConfig {
	serverUrl: string;
	email: string;
	enabled: boolean;
	rememberPassword: boolean;
}

export interface TreeSyncRecord {
	id: string;
	clientId: string;
	payload: Tree;
	deleted: boolean;
	updated: string;
	created: string;
}

export type SyncMutation =
	| { type: 'upsert'; treeId: string; enqueuedAt: string }
	| { type: 'delete'; treeId: string; enqueuedAt: string };

export interface TreeSyncMeta {
	pbId: string | null;
	localUpdatedAt: string;
	remoteUpdatedAt: string | null;
}

export interface SyncMeta {
	lastSyncAt: string | null;
	trees: Record<string, TreeSyncMeta>;
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'disabled' | 'unconfigured';
