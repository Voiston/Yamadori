import * as m from '$lib/paraglide/messages.js';
import type { Tree } from '$lib/types/tree';
import type { ParkingPosition } from '$lib/types/parking';

export const LEGACY_BACKUP_VERSION = 1;

export type YamadoriLegacyBackup = {
	version: number;
	exportedAt: string;
	trees: Tree[];
	parking: ParkingPosition | null;
};

export function parseLegacyBackup(raw: string): YamadoriLegacyBackup {
	const parsed = JSON.parse(raw) as Partial<YamadoriLegacyBackup>;
	if (!parsed || parsed.version !== LEGACY_BACKUP_VERSION || !Array.isArray(parsed.trees)) {
		throw new Error(m.archive_unsupported_version());
	}
	return {
		version: parsed.version,
		exportedAt: parsed.exportedAt ?? new Date().toISOString(),
		trees: parsed.trees,
		parking: parsed.parking ?? null
	};
}

export async function readLegacyBackupFile(file: File): Promise<YamadoriLegacyBackup> {
	const raw = await file.text();
	return parseLegacyBackup(raw);
}

export function isLegacyJsonBackupFile(file: File): boolean {
	const name = file.name.toLowerCase();
	return name.endsWith('.json');
}

export function isZipArchiveFile(file: File): boolean {
	const name = file.name.toLowerCase();
	return name.endsWith('.zip') || name.endsWith('.yamadori.zip');
}
