import * as m from '$lib/paraglide/messages.js';
import pkg from '../../../package.json';
import { getTreeDisplayLabel, type Tree } from '$lib/types/tree';
import { flushTreesPersist, getTreeById, initTrees, mergeTreesFromBackup, treeStore } from '$lib/stores/trees.svelte';
import { getAppVersionLabel } from '$lib/utils/nativeInit';
import { hydrateTreeMedia } from '$lib/utils/tree-storage/repository';
import { countTreesWithMissingPhotos } from '$lib/utils/archive/missingPhotos';
import {
	buildArchive,
	deliverArchive,
	treeShareFilename,
	type ArchiveDeliveryResult
} from '$lib/utils/archive';
import { IncompleteBackupExportError } from '$lib/utils/backupExport';

export type TreeShareDeliveryResult = ArchiveDeliveryResult | 'canceled';

const TREE_SHARE_APPEARANCE = {
	outdoorMode: false,
	darkMode: false,
	simpleMode: true
} as const;

export class TreeShareNotFoundError extends Error {
	constructor() {
		super(m.tree_share_not_found());
		this.name = 'TreeShareNotFoundError';
	}
}

export function countTreeSharePhotos(tree: Tree): number {
	const visitCount = tree.visits.reduce(
		(total, visit) => total + visit.photos.filter((photo) => Boolean(photo?.trim())).length,
		0
	);
	if (visitCount > 0) {
		return visitCount;
	}
	return tree.photos.filter((photo) => Boolean(photo?.trim())).length;
}

export function isTreeShareArchive(archive: { kind?: string; preview?: { kind?: string } }): boolean {
	return archive.kind === 'tree-share' || archive.preview?.kind === 'tree-share';
}

async function resolveAppVersion(): Promise<string> {
	const label = await getAppVersionLabel();
	return label ?? pkg.version;
}

function isShareCanceled(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	return (
		error.message === m.settings_export_share_canceled() ||
		error.message.toLowerCase().includes('cancel') ||
		error.name === 'AbortError'
	);
}

export async function exportTreeShare(treeId: string): Promise<TreeShareDeliveryResult> {
	if (!treeStore.loaded) {
		await initTrees();
	}

	await flushTreesPersist();
	const hydrated = await hydrateTreeMedia(treeId);
	if (!hydrated) {
		throw new TreeShareNotFoundError();
	}

	if (countTreesWithMissingPhotos([hydrated]) > 0) {
		throw new IncompleteBackupExportError(1);
	}

	const blob = await buildArchive({
		trees: [hydrated],
		parking: null,
		appearanceSettings: { ...TREE_SHARE_APPEARANCE },
		appVersion: await resolveAppVersion(),
		kind: 'tree-share'
	});

	const filename = treeShareFilename(getTreeDisplayLabel(hydrated));
	try {
		return await deliverArchive(blob, filename, 'share', {
			shareTitle: m.tree_share_dialog_title()
		});
	} catch (error) {
		if (isShareCanceled(error)) {
			return 'canceled';
		}
		throw error;
	}
}

export async function applyIncomingTreeShare(tree: Tree): Promise<Tree> {
	if (!treeStore.loaded) {
		await initTrees();
	}
	await mergeTreesFromBackup([tree]);
	return getTreeById(tree.id) ?? tree;
}
