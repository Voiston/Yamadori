import * as m from '$lib/paraglide/messages.js';
import type { Tree } from '$lib/types/tree';
import type { ParkingPosition } from '$lib/types/parking';
import { isNativeApp } from '$lib/utils/platform';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const BACKUP_VERSION = 1;

export type YamadoriBackup = {
	version: number;
	exportedAt: string;
	trees: Tree[];
	parking: ParkingPosition | null;
};

export function buildBackup(trees: Tree[], parking: ParkingPosition | null): YamadoriBackup {
	return {
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		trees,
		parking
	};
}

export function parseBackup(raw: string): YamadoriBackup {
	const parsed = JSON.parse(raw) as Partial<YamadoriBackup>;
	if (!parsed || parsed.version !== BACKUP_VERSION || !Array.isArray(parsed.trees)) {
		throw new Error(m.archive_unsupported_version());
	}
	return {
		version: parsed.version,
		exportedAt: parsed.exportedAt ?? new Date().toISOString(),
		trees: parsed.trees,
		parking: parsed.parking ?? null
	};
}

function downloadJson(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

export async function exportBackup(backup: YamadoriBackup): Promise<'shared' | 'downloaded'> {
	const date = new Date().toISOString().slice(0, 10);
	const filename = `yamadori-backup-${date}.json`;
	const content = JSON.stringify(backup, null, 2);

	if (!isNativeApp()) {
		downloadJson(content, filename);
		return 'downloaded';
	}

	await Filesystem.writeFile({
		path: filename,
		data: content,
		directory: Directory.Cache,
		encoding: Encoding.UTF8
	});

	const { uri } = await Filesystem.getUri({
		path: filename,
		directory: Directory.Cache
	});

	await Share.share({
		title: m.backup_export_dialog_title(),
		files: [uri],
		dialogTitle: m.backup_export_dialog_title()
	});

	return 'shared';
}

export async function readBackupFile(file: File): Promise<YamadoriBackup> {
	const raw = await file.text();
	return parseBackup(raw);
}
