import { describe, expect, it } from 'vitest';
import {
	POSITION_PUBLISH_MAX_STALE_MS,
	POSITION_PUBLISH_MIN_MOVE_M,
	shouldSkipPositionPublish
} from './positionPublishPolicy';

describe('shouldSkipPositionPublish', () => {
	const origin = { latitude: 45.0, longitude: 2.0 };
	const publishedAt = 1_000_000;

	it('never skips capture profile updates', () => {
		expect(
			shouldSkipPositionPublish({
				profile: 'capture',
				published: origin,
				lastPublishedAt: publishedAt,
				now: publishedAt + 1_000,
				next: { latitude: 45.00001, longitude: 2.0 }
			})
		).toBe(false);
	});

	it('never skips navigation profile updates', () => {
		expect(
			shouldSkipPositionPublish({
				profile: 'navigation',
				published: origin,
				lastPublishedAt: publishedAt,
				now: publishedAt + 1_000,
				next: { latitude: 45.00001, longitude: 2.0 }
			})
		).toBe(false);
	});

	it('publishes the first position on watch profile', () => {
		expect(
			shouldSkipPositionPublish({
				profile: 'watch',
				published: null,
				lastPublishedAt: null,
				now: publishedAt,
				next: origin
			})
		).toBe(false);
	});

	it('skips watch updates when barely moved within the stale window', () => {
		expect(
			shouldSkipPositionPublish({
				profile: 'watch',
				published: origin,
				lastPublishedAt: publishedAt,
				now: publishedAt + 5_000,
				next: { latitude: 45.00005, longitude: 2.0 }
			})
		).toBe(true);
	});

	it('publishes watch updates after significant movement', () => {
		const moved = { latitude: 45.0002, longitude: 2.0 };
		const movedM =
			Math.abs(moved.latitude - origin.latitude) * 111_000;
		expect(movedM).toBeGreaterThanOrEqual(POSITION_PUBLISH_MIN_MOVE_M);

		expect(
			shouldSkipPositionPublish({
				profile: 'watch',
				published: origin,
				lastPublishedAt: publishedAt,
				now: publishedAt + 5_000,
				next: moved
			})
		).toBe(false);
	});

	it('forces publish after the stale timeout even with little movement', () => {
		expect(
			shouldSkipPositionPublish({
				profile: 'proximity',
				published: origin,
				lastPublishedAt: publishedAt,
				now: publishedAt + POSITION_PUBLISH_MAX_STALE_MS,
				next: { latitude: 45.00001, longitude: 2.0 }
			})
		).toBe(false);
	});

	it('never skips when live navigation is active on compass screen', () => {
		expect(
			shouldSkipPositionPublish({
				profile: 'watch',
				published: origin,
				lastPublishedAt: publishedAt,
				now: publishedAt + 1_000,
				next: { latitude: 45.00001, longitude: 2.0 },
				liveNavigationActive: true
			})
		).toBe(false);
	});

	it('still throttles watch profile when live navigation is inactive', () => {
		expect(
			shouldSkipPositionPublish({
				profile: 'watch',
				published: origin,
				lastPublishedAt: publishedAt,
				now: publishedAt + 5_000,
				next: { latitude: 45.00005, longitude: 2.0 },
				liveNavigationActive: false
			})
		).toBe(true);
	});
});
