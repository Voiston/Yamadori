import { describe, expect, it } from 'vitest';
import { buildArchive } from './export';
import { analyzeArchiveConfidentiality, reexportArchiveWithPassword } from './legacy-archive-reexport';
import { isPasswordProtectedBlob } from './import';
import type { ArchiveExportInput } from './types';

const minimalInput: ArchiveExportInput = {
	trees: [],
	parking: null,
	appearanceSettings: { outdoorMode: false },
	appVersion: 'test'
};

describe('legacy archive re-export', () => {
	it('detects honest plaintext archives', async () => {
		const blob = await buildArchive(minimalInput);
		const analysis = await analyzeArchiveConfidentiality(blob);
		expect(analysis.kind).toBe('plaintext');
	});

	it('detects password-protected archives', async () => {
		const blob = await buildArchive(minimalInput, { password: 'test-password-123' });
		expect(await isPasswordProtectedBlob(blob)).toBe(true);
		const analysis = await analyzeArchiveConfidentiality(blob);
		expect(analysis.kind).toBe('password_protected');
	});

	it('re-exports plaintext archive with password envelope', async () => {
		const source = await buildArchive(minimalInput);
		const strengthened = await reexportArchiveWithPassword(
			source,
			'new-password-123',
			'test'
		);
		expect(await isPasswordProtectedBlob(strengthened)).toBe(true);
	});
});
