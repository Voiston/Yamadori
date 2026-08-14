import { describe, expect, it, vi } from 'vitest';
import { processLegacyImport } from '$lib/utils/settings/legacy-backup-import';
import type { YamadoriLegacyBackup } from '$lib/utils/archive';

const legacyBackup: YamadoriLegacyBackup = {
	version: 1,
	exportedAt: '2026-01-01T00:00:00.000Z',
	trees: [{ id: '1' } as YamadoriLegacyBackup['trees'][number]],
	parking: null
};

describe('processLegacyImport', () => {
	it('requests replace confirmation instead of applying immediately', async () => {
		const apply = vi.fn();
		const result = await processLegacyImport(legacyBackup, 'replace', apply);
		expect(result).toEqual({
			kind: 'replace_requested',
			request: { legacy: legacyBackup, treeCount: 1 }
		});
		expect(apply).not.toHaveBeenCalled();
	});

	it('merges immediately in merge mode', async () => {
		const apply = vi.fn().mockResolvedValue(1);
		const result = await processLegacyImport(legacyBackup, 'merge', apply);
		expect(result).toEqual({ kind: 'merged', treeCount: 1 });
		expect(apply).toHaveBeenCalledWith(legacyBackup, 'merge');
	});
});
