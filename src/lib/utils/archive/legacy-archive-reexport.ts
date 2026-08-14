import { buildArchive } from './export';
import { isPasswordProtectedBlob, parseArchive, readArchiveManifestKeyScope } from './import';
import { ArchiveError, type ArchiveExportInput, type RebuiltArchive } from './types';
import * as m from '$lib/paraglide/messages.js';

export type WeakArchiveKind = 'legacy_app_key' | 'unprotected_archive_key';

export type WeakArchiveAnalysis =
	| { kind: 'password_protected' }
	| { kind: 'plaintext' }
	| { kind: 'weak'; weakKind: WeakArchiveKind }
	| { kind: 'invalid'; message: string };

export function rebuiltArchiveToExportInput(
	rebuilt: RebuiltArchive,
	appVersion: string
): ArchiveExportInput {
	return {
		trees: rebuilt.trees,
		parking: rebuilt.parking,
		appearanceSettings: rebuilt.appearanceSettings,
		apiSettings: rebuilt.apiSettings,
		appVersion
	};
}

export async function analyzeArchiveConfidentiality(blob: Blob): Promise<WeakArchiveAnalysis> {
	if (await isPasswordProtectedBlob(blob)) {
		return { kind: 'password_protected' };
	}

	try {
		const keyScope = await readArchiveManifestKeyScope(blob);
		if (keyScope === 'app') {
			return { kind: 'weak', weakKind: 'legacy_app_key' };
		}
		if (keyScope === 'archive') {
			return { kind: 'weak', weakKind: 'unprotected_archive_key' };
		}
		if (keyScope === 'plaintext') {
			return { kind: 'plaintext' };
		}

		await parseArchive(blob);
		return { kind: 'plaintext' };
	} catch (error) {
		if (error instanceof ArchiveError && error.code === 'ARCHIVE_PASSWORD_REQUIRED') {
			return { kind: 'password_protected' };
		}
		return {
			kind: 'invalid',
			message: error instanceof Error ? error.message : m.archive_invalid_payload()
		};
	}
}

export async function reexportArchiveWithPassword(
	blob: Blob,
	password: string,
	appVersion: string,
	decryptPassword?: string
): Promise<Blob> {
	const analysis = await analyzeArchiveConfidentiality(blob);
	if (analysis.kind === 'password_protected' && !decryptPassword) {
		throw new ArchiveError('ARCHIVE_PASSWORD_REQUIRED', m.archive_password_required());
	}
	if (analysis.kind === 'invalid') {
		throw new ArchiveError('ARCHIVE_INVALID_PAYLOAD', analysis.message);
	}

	const rebuilt = await parseArchive(
		blob,
		decryptPassword ? { password: decryptPassword } : undefined
	);

	return buildArchive(rebuiltArchiveToExportInput(rebuilt, appVersion), { password });
}
