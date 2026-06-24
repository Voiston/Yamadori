import { describe, expect, it } from 'vitest';
import { unzip, zip } from 'fflate';
import { DEFAULT_ASSESSMENT, type Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { buildArchive } from './export';
import { normalizeZipEntries, parseArchive, scanEntriesForGpsLeak, isPasswordProtectedBlob } from './import';
import { isPasswordProtectedArchive } from './crypto';
import { parseLegacyBackup } from './legacy';
import { parseDataUrl } from './media';

const tinyPng =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const tinyAac = 'data:audio/aac;base64,AAA=';
const tinyWebmWithCodecs = 'data:audio/webm;codecs=opus;base64,AAA=';

function sampleTree(overrides: Partial<Tree> = {}): Tree {
	return {
		id: 'tree-1',
		species: 'Érable',
		notes: 'Bel exemplaire',
		photos: [tinyPng],
		visits: [
			{
				id: 'visit-1',
				visitedAt: '2026-01-15T10:00:00.000Z',
				note: 'Première visite',
				photoBase64: tinyPng
			}
		],
		assessment: { ...DEFAULT_ASSESSMENT, potentialScore: 4 },
		voiceNote: null,
		latitude: 45.123456,
		longitude: 6.654321,
		accuracyMeters: 5,
		altitudeMeters: 1200,
		frontHeadingDegrees: 90,
		isFavorite: true,
		climateHistory: null,
		locationLabel: 'Versant nord',
		cadastreInfo: null,
		harvestEthicsConfirmation: null,
		environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE,
		yrsAtCapture: null,
		capturedAt: '2026-01-10T08:00:00.000Z',
		...overrides
	};
}

const baseInput = {
	trees: [sampleTree()],
	parking: {
		latitude: 45.1,
		longitude: 6.6,
		accuracyMeters: 10,
		savedAt: '2026-01-10T07:00:00.000Z'
	},
	appearanceSettings: { outdoorMode: true },
	locationSettings: { backgroundTrackingEnabled: false },
	appVersion: '0.0.2-test'
};

async function unzipBlob(blob: Blob): Promise<Record<string, Uint8Array>> {
	const buffer = new Uint8Array(await blob.arrayBuffer());
	return new Promise((resolve, reject) => {
		unzip(buffer, (error, result) => {
			if (error) reject(error);
			else resolve(result);
		});
	});
}

async function rezip(entries: Record<string, Uint8Array>): Promise<Blob> {
	const zipped = await new Promise<Uint8Array>((resolve, reject) => {
		zip(entries, (error, result) => {
			if (error) reject(error);
			else resolve(result);
		});
	});
	return new Blob([new Uint8Array(zipped)], { type: 'application/zip' });
}

describe('archive media helpers', () => {
	it('parses data URLs with codec parameters', () => {
		const parsed = parseDataUrl(tinyWebmWithCodecs);
		expect(parsed?.mimeType).toBe('audio/webm');
		expect(parsed?.bytes.byteLength).toBeGreaterThan(0);
	});
});

describe('archive export/import', () => {
	it('round-trips trees, parking and settings automatically', async () => {
		const blob = await buildArchive(baseInput);
		const restored = await parseArchive(blob);

		expect(restored.preview.treeCount).toBe(1);
		expect(restored.trees[0]?.species).toBe('Érable');
		expect(restored.trees[0]?.latitude).toBe(45.123456);
		expect(restored.trees[0]?.longitude).toBe(6.654321);
		expect(restored.trees[0]?.photos[0]).toContain('data:image/');
		expect(restored.parking?.latitude).toBe(45.1);
		expect(restored.appearanceSettings.outdoorMode).toBe(true);
	});

	it('round-trips voice notes with audio/aac mime type', async () => {
		const treeVoiceNote = {
			recordedAt: '2026-01-10T08:00:00.000Z',
			durationMs: 2000,
			mimeType: 'audio/aac',
			audioBase64: tinyAac
		};
		const visitVoiceNote = {
			recordedAt: '2026-01-15T10:00:00.000Z',
			durationMs: 3000,
			mimeType: 'audio/aac',
			audioBase64: tinyAac
		};

		const blob = await buildArchive({
			...baseInput,
			trees: [
				sampleTree({
					voiceNote: treeVoiceNote,
					visits: [
						{
							id: 'visit-1',
							visitedAt: '2026-01-15T10:00:00.000Z',
							note: 'Première visite',
							photoBase64: tinyPng,
							voiceNote: visitVoiceNote
						}
					]
				})
			]
		});
		const restored = await parseArchive(blob);
		const tree = restored.trees[0];

		expect(tree?.voiceNote?.audioBase64).toMatch(/^data:audio\/aac;base64,/);
		expect(tree?.voiceNote?.mimeType).toBe('audio/aac');
		expect(tree?.voiceNote?.audioBase64).not.toContain('application/octet-stream');
		expect(tree?.visits[0]?.voiceNote?.audioBase64).toMatch(/^data:audio\/aac;base64,/);
		expect(tree?.visits[0]?.voiceNote?.mimeType).toBe('audio/aac');
	});

	it('round-trips voice notes with audio/webm codecs in data URL', async () => {
		const voiceNote = {
			recordedAt: '2026-01-10T08:00:00.000Z',
			durationMs: 2000,
			mimeType: 'audio/webm;codecs=opus',
			audioBase64: tinyWebmWithCodecs
		};

		const blob = await buildArchive({
			...baseInput,
			trees: [sampleTree({ voiceNote })]
		});
		const restored = await parseArchive(blob);
		const tree = restored.trees[0];

		expect(tree?.voiceNote).not.toBeNull();
		expect(tree?.voiceNote?.audioBase64).toMatch(/^data:audio\/webm;base64,/);
		expect(tree?.voiceNote?.mimeType).toBe('audio/webm;codecs=opus');
	});

	it('rejects corrupted encrypted payload', async () => {
		const blob = await buildArchive(baseInput);
		const entries = await unzipBlob(blob);
		const manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json']!));
		manifest.encryption.iv = 'AAAAAAAAAAAAAAAA';
		entries['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest));

		const tampered = await rezip(entries);

		await expect(parseArchive(tampered)).rejects.toMatchObject({
			code: 'ARCHIVE_INVALID_PAYLOAD'
		});
	});

	it('rejects tampered media checksum', async () => {
		const blob = await buildArchive(baseInput);
		const entries = await unzipBlob(blob);

		const mediaPath = Object.keys(entries).find((path) => path.startsWith('media/'));
		expect(mediaPath).toBeTruthy();
		if (mediaPath) {
			entries[mediaPath] = new Uint8Array([0, 1, 2]);
		}

		const tampered = await rezip(entries);

		await expect(parseArchive(tampered)).rejects.toMatchObject({
			code: 'ARCHIVE_CHECKSUM_MISMATCH'
		});
	});

	it('normalizes windows-style zip paths', async () => {
		const blob = await buildArchive(baseInput);
		const buffer = new Uint8Array(await blob.arrayBuffer());
		const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
			unzip(buffer, (error, result) => {
				if (error) reject(error);
				else resolve(result);
			});
		});

		const withBackslashes = Object.fromEntries(
			Object.entries(entries).map(([path, data]) => [path.replaceAll('/', '\\'), data])
		);

		const restored = await parseArchive(
			await rezip(normalizeZipEntries(withBackslashes))
		);
		expect(restored.trees[0]?.species).toBe('Érable');
	});

	it('round-trips with user password envelope', async () => {
		const blob = await buildArchive(baseInput, { password: 'test-password-123' });
		expect(await isPasswordProtectedBlob(blob)).toBe(true);

		const buffer = new Uint8Array(await blob.arrayBuffer());
		expect(isPasswordProtectedArchive(buffer)).toBe(true);
		expect(new TextDecoder().decode(buffer)).not.toContain('manifest.json');
		expect(new TextDecoder().decode(buffer)).not.toContain('45.123456');

		const restored = await parseArchive(blob, { password: 'test-password-123' });
		expect(restored.preview.treeCount).toBe(1);
		expect(restored.trees[0]?.species).toBe('Érable');
		expect(restored.trees[0]?.latitude).toBe(45.123456);
		expect(restored.parking?.latitude).toBe(45.1);
	});

	it('rejects wrong password on protected archive', async () => {
		const blob = await buildArchive(baseInput, { password: 'correct-password' });

		await expect(parseArchive(blob, { password: 'wrong-password' })).rejects.toMatchObject({
			code: 'ARCHIVE_WRONG_PASSWORD'
		});
	});

	it('requires password for protected archive', async () => {
		const blob = await buildArchive(baseInput, { password: 'secret-password' });

		await expect(parseArchive(blob)).rejects.toMatchObject({
			code: 'ARCHIVE_PASSWORD_REQUIRED'
		});
	});

	it('round-trips without password unchanged', async () => {
		const blob = await buildArchive(baseInput);
		expect(await isPasswordProtectedBlob(blob)).toBe(false);
		const restored = await parseArchive(blob);
		expect(restored.trees[0]?.species).toBe('Érable');
	});

	it('does not leak GPS coordinates in clear zip entries', async () => {
		const blob = await buildArchive(baseInput);
		const entries = await unzipBlob(blob);

		expect(scanEntriesForGpsLeak(entries)).toEqual([]);
		expect(new TextDecoder().decode(entries['donnees.enc'] ?? new Uint8Array())).not.toContain(
			'45.123456'
		);
	});

	it('does not leak GPS coordinates in password-protected envelope', async () => {
		const blob = await buildArchive(baseInput, { password: 'test-password-123' });
		const buffer = new Uint8Array(await blob.arrayBuffer());
		const text = new TextDecoder().decode(buffer);

		expect(text).not.toContain('manifest.json');
		expect(text).not.toContain('45.123456');
		expect(text).not.toContain('PK');
	});
});

describe('legacy JSON backup', () => {
	it('parses v1 backup format', () => {
		const legacy = parseLegacyBackup(
			JSON.stringify({
				version: 1,
				exportedAt: '2026-01-01T00:00:00.000Z',
				trees: [sampleTree()],
				parking: null
			})
		);

		expect(legacy.trees).toHaveLength(1);
		expect(legacy.trees[0]?.latitude).toBe(45.123456);
	});
});
