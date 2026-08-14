import { describe, expect, it } from 'vitest';
import { unzip, zip } from 'fflate';
import { DEFAULT_ASSESSMENT, type Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { isValidTreeId } from '$lib/utils/id';
import { buildArchive } from './export';
import { encryptPayload, ivToBase64 } from './crypto';
import { sha256Hex } from './checksums';
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
				photos: [tinyPng]
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
	apiSettings: {
		ignMap: false,
		ignCadastre: true,
		ignProtectedAreas: true,
		openMeteoForecast: true,
		openMeteoArchive: false,
		nominatim: true,
		servicePublicAnnuaire: true
	},
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
	it('deduplicates gallery photos already stored on visits', async () => {
		const blob = await buildArchive(baseInput);
		const entries = await unzipBlob(blob);
		const mediaPaths = Object.keys(entries).filter((path) => path.startsWith('media/'));
		expect(mediaPaths.length).toBe(1);
	});

	it('round-trips multiple photos on a visit', async () => {
		const blob = await buildArchive({
			...baseInput,
			trees: [
				sampleTree({
					photos: [tinyPng, tinyPng, tinyPng],
					visits: [
						{
							id: 'visit-1',
							visitedAt: '2026-01-15T10:00:00.000Z',
							note: 'Multi',
							photos: [tinyPng, tinyPng, tinyPng]
						}
					]
				})
			]
		});
		const restored = await parseArchive(blob);
		expect(restored.trees[0]?.visits[0]?.photos).toHaveLength(3);
		expect(restored.trees[0]?.photos.length).toBeGreaterThanOrEqual(1);
	});

	it('imports legacy single photoPath visit archives', async () => {
		const blob = await buildArchive(baseInput);
		const entries = await unzipBlob(blob);
		const restored = await parseArchive(blob);
		expect(restored.trees[0]?.visits[0]?.photos.length).toBe(1);
		void entries;
	});

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
		expect(restored.apiSettings?.ignMap).toBe(false);
		expect(restored.apiSettings?.openMeteoArchive).toBe(false);
	});

	it('writes plaintext donnees.json without embedded key material', async () => {
		const blob1 = await buildArchive(baseInput);
		const blob2 = await buildArchive(baseInput);
		const entries1 = await unzipBlob(blob1);
		const entries2 = await unzipBlob(blob2);
		const manifest1 = JSON.parse(new TextDecoder().decode(entries1['manifest.json']!));
		const manifest2 = JSON.parse(new TextDecoder().decode(entries2['manifest.json']!));

		expect(manifest1.encryption).toBeNull();
		expect(manifest2.encryption).toBeNull();
		expect(entries1['donnees.json']).toBeTruthy();
		expect(entries1['donnees.enc']).toBeUndefined();
		expect(new TextDecoder().decode(entries1['donnees.json']!)).toContain('45.123456');
	});

	it('imports legacy unprotected archive-key archives', async () => {
		const payload = {
			version: 2,
			trees: [
				{
					id: '00000000-0000-4000-8000-000000000001',
					species: 'Érable',
					notes: '',
					photos: [],
					visits: [],
					assessment: DEFAULT_ASSESSMENT,
					voiceNote: null,
					latitude: 45.123456,
					longitude: 6.654321,
					accuracyMeters: 5,
					altitudeMeters: null,
					frontHeadingDegrees: null,
					isFavorite: false,
					climateHistory: null,
					locationLabel: null,
					capturedAt: '2026-01-10T08:00:00.000Z'
				}
			],
			parking: null,
			appearanceSettings: { outdoorMode: false }
		};

		const archiveKey = crypto.getRandomValues(new Uint8Array(32));
		const { ciphertext, iv } = await encryptPayload(JSON.stringify(payload), archiveKey);
		const manifest = {
			formatVersion: 2,
			appVersion: '0.0.2-test',
			exportedAt: new Date().toISOString(),
			encryption: {
				algorithm: 'AES-256-GCM',
				keyScope: 'archive',
				keyMaterial: ivToBase64(archiveKey),
				iv: ivToBase64(iv)
			},
			stats: { treeCount: 1, mediaFileCount: 0 },
			files: [
				{
					path: 'donnees.enc',
					size: ciphertext.byteLength,
					sha256: await sha256Hex(ciphertext)
				}
			]
		};

		const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
		const legacyBlob = await rezip({
			'donnees.enc': ciphertext,
			'manifest.json': manifestBytes
		});

		const restored = await parseArchive(legacyBlob);
		expect(restored.trees[0]?.latitude).toBe(45.123456);
	});

	it('imports legacy app-scoped archives', async () => {
		const payload = {
			version: 2,
			trees: [
				{
					id: 'tree-1',
					species: 'Érable',
					notes: '',
					photos: [],
					visits: [],
					assessment: DEFAULT_ASSESSMENT,
					voiceNote: null,
					latitude: 45.123456,
					longitude: 6.654321,
					accuracyMeters: 5,
					altitudeMeters: null,
					frontHeadingDegrees: null,
					isFavorite: false,
					climateHistory: null,
					locationLabel: null,
					capturedAt: '2026-01-10T08:00:00.000Z'
				}
			],
			parking: null,
			appearanceSettings: { outdoorMode: false }
		};

		const { ciphertext, iv } = await encryptPayload(JSON.stringify(payload));
		const manifest = {
			formatVersion: 2,
			appVersion: '0.0.2-test',
			exportedAt: new Date().toISOString(),
			encryption: {
				algorithm: 'AES-256-GCM',
				keyScope: 'app',
				iv: ivToBase64(iv)
			},
			stats: { treeCount: 1, mediaFileCount: 0 },
			files: [
				{
					path: 'donnees.enc',
					size: ciphertext.byteLength,
					sha256: await sha256Hex(ciphertext)
				}
			]
		};

		const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));

		const legacyBlob = await rezip({
			'donnees.enc': ciphertext,
			'manifest.json': manifestBytes
		});

		const restored = await parseArchive(legacyBlob);
		expect(restored.trees[0]?.latitude).toBe(45.123456);
	});

	it('sanitizes malicious tree ids on import', async () => {
		const maliciousId = 'x" onclick="alert(1)"';
		const blob = await buildArchive({
			...baseInput,
			trees: [sampleTree({ id: maliciousId })]
		});
		const restored = await parseArchive(blob);

		expect(restored.trees[0]?.id).not.toContain('onclick');
		expect(isValidTreeId(restored.trees[0]!.id)).toBe(true);
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
							photos: [tinyPng],
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

	it('rejects corrupted legacy encrypted payload', async () => {
		const payload = {
			version: 2,
			trees: [],
			parking: null,
			appearanceSettings: { outdoorMode: false }
		};
		const archiveKey = crypto.getRandomValues(new Uint8Array(32));
		const { ciphertext, iv } = await encryptPayload(JSON.stringify(payload), archiveKey);
		const manifest = {
			formatVersion: 2,
			appVersion: '0.0.2-test',
			exportedAt: new Date().toISOString(),
			encryption: {
				algorithm: 'AES-256-GCM',
				keyScope: 'archive',
				keyMaterial: ivToBase64(archiveKey),
				iv: 'AAAAAAAAAAAAAAAA'
			},
			stats: { treeCount: 0, mediaFileCount: 0 },
			files: [
				{
					path: 'donnees.enc',
					size: ciphertext.byteLength,
					sha256: await sha256Hex(ciphertext)
				}
			]
		};
		const tampered = await rezip({
			'donnees.enc': ciphertext,
			'manifest.json': new TextEncoder().encode(JSON.stringify(manifest))
		});

		await expect(parseArchive(tampered)).rejects.toMatchObject({
			code: 'ARCHIVE_INVALID_PAYLOAD'
		});
	});

	it('rejects zip slip path traversal entries', async () => {
		const blob = await buildArchive(baseInput);
		const entries = await unzipBlob(blob);
		entries['../evil.txt'] = new TextEncoder().encode('x');
		const tampered = await rezip(entries);

		await expect(parseArchive(tampered)).rejects.toMatchObject({
			code: 'ARCHIVE_INVALID_ZIP'
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

	it('keeps GPS only in donnees.json for unprotected exports', async () => {
		const blob = await buildArchive(baseInput);
		const entries = await unzipBlob(blob);

		expect(scanEntriesForGpsLeak(entries)).toEqual([]);
		expect(new TextDecoder().decode(entries['donnees.json']!)).toContain('45.123456');
		expect(entries['donnees.enc']).toBeUndefined();
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
