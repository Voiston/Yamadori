import { describe, expect, it } from 'vitest';
import { ArchiveError } from './types';
import { parseArchivePayload } from './payloadSchema';

function validPayload(overrides: Record<string, unknown> = {}) {
	return {
		version: 2,
		trees: [
			{
				id: '550e8400-e29b-41d4-a716-446655440000',
				species: 'Acer',
				notes: 'ok',
				photos: ['media/a.jpg'],
				visits: [],
				assessment: { potentialScore: 3 },
				voiceNote: null,
				latitude: 45.1,
				longitude: 6.2,
				accuracyMeters: 5,
				altitudeMeters: 1000,
				frontHeadingDegrees: 90,
				isFavorite: false,
				climateHistory: null,
				locationLabel: null,
				environmentExposure: 'OPEN',
				capturedAt: '2026-01-01T00:00:00.000Z'
			}
		],
		parking: null,
		appearanceSettings: { outdoorMode: false },
		...overrides
	};
}

describe('parseArchivePayload', () => {
	it('accepts a well-formed payload', () => {
		const data = parseArchivePayload(validPayload());
		expect(data.version).toBe(2);
		expect(data.trees).toHaveLength(1);
		expect(data.trees[0]?.species).toBe('Acer');
	});

	it('rejects wrong version', () => {
		expect(() => parseArchivePayload(validPayload({ version: 1 }))).toThrow(ArchiveError);
	});

	it('rejects non-array trees', () => {
		expect(() => parseArchivePayload(validPayload({ trees: null }))).toThrow(ArchiveError);
	});

	it('rejects out-of-range latitude', () => {
		const payload = validPayload();
		(payload.trees as Array<Record<string, unknown>>)[0]!.latitude = 120;
		expect(() => parseArchivePayload(payload)).toThrow(ArchiveError);
	});

	it('rejects oversized notes', () => {
		const payload = validPayload();
		(payload.trees as Array<Record<string, unknown>>)[0]!.notes = 'x'.repeat(10_001);
		expect(() => parseArchivePayload(payload)).toThrow(ArchiveError);
	});

	it('rejects XSS-like oversized id', () => {
		const payload = validPayload();
		(payload.trees as Array<Record<string, unknown>>)[0]!.id = 'x'.repeat(200);
		expect(() => parseArchivePayload(payload)).toThrow(ArchiveError);
	});

	it('rejects missing assessment object', () => {
		const payload = validPayload();
		delete (payload.trees as Array<Record<string, unknown>>)[0]!.assessment;
		expect(() => parseArchivePayload(payload)).toThrow(ArchiveError);
	});
});
