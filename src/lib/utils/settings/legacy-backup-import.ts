import type { YamadoriLegacyBackup } from '$lib/utils/archive';

export type LegacyImportMode = 'merge' | 'replace';

export type LegacyImportReplaceRequest = {
	legacy: YamadoriLegacyBackup;
	treeCount: number;
};

export type LegacyImportResult =
	| { kind: 'merged'; treeCount: number }
	| { kind: 'replace_requested'; request: LegacyImportReplaceRequest };

export async function processLegacyImport(
	legacy: YamadoriLegacyBackup,
	mode: LegacyImportMode,
	applyLegacyBackup: (
		backup: YamadoriLegacyBackup,
		mode: 'merge' | 'replace'
	) => Promise<number>
): Promise<LegacyImportResult> {
	if (mode === 'replace') {
		return {
			kind: 'replace_requested',
			request: {
				legacy,
				treeCount: legacy.trees.length
			}
		};
	}

	const treeCount = await applyLegacyBackup(legacy, 'merge');
	return { kind: 'merged', treeCount };
}
