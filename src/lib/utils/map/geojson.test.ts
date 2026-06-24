import { describe, expect, it } from 'vitest';
import { createSightLine, destinationPoint } from './geojson';
import { haversineDistanceM } from '$lib/utils/haversine';

describe('destinationPoint', () => {
	it('moves north for bearing 0', () => {
		const end = destinationPoint(48, 2, 0, 500);
		expect(end.latitude).toBeGreaterThan(48);
		expect(Math.abs(end.longitude - 2)).toBeLessThan(0.01);
	});

	it('respects distance within tolerance', () => {
		const end = destinationPoint(48, 2, 45, 500);
		const distance = haversineDistanceM(48, 2, end.latitude, end.longitude);
		expect(Math.abs(distance - 500)).toBeLessThan(2);
	});
});

describe('createSightLine', () => {
	it('returns a line from user to destination point', () => {
		const line = createSightLine(2, 48, 90, 500);
		expect(line.geometry.coordinates).toHaveLength(2);
		expect(line.geometry.coordinates[0]).toEqual([2, 48]);
		expect(line.geometry.coordinates[1][0]).toBeGreaterThan(2);
	});
});
