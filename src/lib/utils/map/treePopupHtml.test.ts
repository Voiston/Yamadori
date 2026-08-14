import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSESSMENT, type Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { buildTreePopupHtml, escapeHtml, safeTreeHrefId } from './treePopupHtml';

function sampleTree(overrides: Partial<Tree> = {}): Tree {
	return {
		id: '550e8400-e29b-41d4-a716-446655440000',
		species: 'Érable',
		notes: '',
		photos: [],
		visits: [],
		assessment: { ...DEFAULT_ASSESSMENT },
		voiceNote: null,
		latitude: 45,
		longitude: 6,
		accuracyMeters: 8,
		altitudeMeters: null,
		frontHeadingDegrees: null,
		isFavorite: false,
		climateHistory: null,
		locationLabel: null,
		cadastreInfo: null,
		harvestEthicsConfirmation: null,
		environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE,
		yrsAtCapture: null,
		capturedAt: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

describe('escapeHtml', () => {
	it('escapes markup-sensitive characters', () => {
		expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
			'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
		);
		expect(escapeHtml(`O'Brien & Co`)).toBe(`O&#39;Brien &amp; Co`);
	});
});

describe('safeTreeHrefId', () => {
	it('encodes valid UUIDs', () => {
		expect(safeTreeHrefId('550e8400-e29b-41d4-a716-446655440000')).toBe(
			'550e8400-e29b-41d4-a716-446655440000'
		);
	});

	it('rejects malformed ids that could break HTML attributes', () => {
		expect(safeTreeHrefId(`" onclick="alert(1)`)).toBe('');
		expect(safeTreeHrefId('../evil')).toBe('');
	});
});

describe('buildTreePopupHtml', () => {
	it('escapes species and location label', () => {
		const html = buildTreePopupHtml(
			sampleTree({
				species: '<script>alert(1)</script>',
				locationLabel: '"><img src=x onerror=alert(1)>'
			}),
			{
				base: '',
				outdoor: false,
				viewLabel: 'View',
				formatAccuracy: (m) => `±${m} m`
			}
		);

		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
		expect(html).toContain('&quot;&gt;&lt;img');
	});

	it('falls back href when id is invalid', () => {
		const html = buildTreePopupHtml(sampleTree({ id: 'not-a-uuid' }), {
			base: '/app',
			outdoor: false,
			viewLabel: 'View',
			formatAccuracy: () => ''
		});
		expect(html).toContain('href="/app/"');
		expect(html).not.toContain('/tree/not-a-uuid');
	});
});
