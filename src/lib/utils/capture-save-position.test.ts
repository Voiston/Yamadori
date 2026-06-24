import { describe, expect, it } from 'vitest';
import {
	CAPTURE_SAVE_POSITION_MAX_AGE_MS,
	canReuseCapturePosition,
	ensureCapturePositionForSave
} from './capture-save-position';

const position = (accuracyMeters: number | null) => ({
	latitude: 48.1,
	longitude: 2.3,
	accuracyMeters
});

describe('canReuseCapturePosition', () => {
	it('rejects missing position', () => {
		expect(canReuseCapturePosition(null, Date.now())).toBe(false);
	});

	it('rejects missing timestamp', () => {
		expect(canReuseCapturePosition(position(10), null)).toBe(false);
	});

	it('rejects poor accuracy', () => {
		const now = Date.now();
		expect(canReuseCapturePosition(position(30), now, now)).toBe(false);
	});

	it('rejects stale position', () => {
		const now = Date.now();
		const staleAt = now - CAPTURE_SAVE_POSITION_MAX_AGE_MS - 1;
		expect(canReuseCapturePosition(position(10), staleAt, now)).toBe(false);
	});

	it('accepts recent precise position', () => {
		const now = Date.now();
		expect(canReuseCapturePosition(position(10), now, now)).toBe(true);
	});
});

describe('ensureCapturePositionForSave', () => {
	it('skips fetch when position is reusable', async () => {
		let fetched = false;
		const result = await ensureCapturePositionForSave(position(8), Date.now(), async () => {
			fetched = true;
		});
		expect(result).toBe('reused');
		expect(fetched).toBe(false);
	});

	it('fetches when position is stale', async () => {
		let fetched = false;
		const now = Date.now();
		const result = await ensureCapturePositionForSave(
			position(8),
			now - CAPTURE_SAVE_POSITION_MAX_AGE_MS - 1,
			async () => {
				fetched = true;
			}
		);
		expect(result).toBe('fetched');
		expect(fetched).toBe(true);
	});
});
