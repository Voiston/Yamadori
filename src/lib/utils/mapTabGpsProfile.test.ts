import { describe, expect, it } from 'vitest';
import { MAP_NEAR_PARKING_M, resolveMapParkingProximity, resolveMapTabGpsProfile } from './mapTabGpsProfile';

const parking = {
	latitude: 45.0,
	longitude: 2.0,
	accuracyMeters: 5,
	savedAt: '2026-01-01T12:00:00.000Z'
};

describe('resolveMapTabGpsProfile', () => {
	it('uses navigation when embedded with heading lock', () => {
		expect(
			resolveMapTabGpsProfile({
				embedded: true,
				headingLock: true,
				parking,
				userLatitude: 45.0,
				userLongitude: 2.0
			})
		).toBe('navigation');
	});

	it('uses watch when no parking is saved', () => {
		expect(
			resolveMapTabGpsProfile({
				embedded: false,
				headingLock: false,
				parking: null,
				userLatitude: 45.0,
				userLongitude: 2.0
			})
		).toBe('watch');
	});

	it('uses proximity near saved parking', () => {
		expect(
			resolveMapTabGpsProfile({
				embedded: false,
				headingLock: false,
				parking,
				userLatitude: 45.0,
				userLongitude: 2.0
			})
		).toBe('proximity');
	});

	it('uses watch when far from saved parking', () => {
		const farLat = parking.latitude + (MAP_NEAR_PARKING_M + 50) / 111_000;
		expect(
			resolveMapTabGpsProfile({
				embedded: false,
				headingLock: false,
				parking,
				userLatitude: farLat,
				userLongitude: parking.longitude
			})
		).toBe('watch');
	});
});

describe('resolveMapParkingProximity', () => {
	it('returns unknown without parking or user position', () => {
		expect(resolveMapParkingProximity(null, 45.0, 2.0)).toBe('unknown');
		expect(resolveMapParkingProximity(parking, null, 2.0)).toBe('unknown');
	});

	it('buckets near and far around the parking threshold', () => {
		expect(resolveMapParkingProximity(parking, 45.0, 2.0)).toBe('near');

		const farLat = parking.latitude + (MAP_NEAR_PARKING_M + 50) / 111_000;
		expect(resolveMapParkingProximity(parking, farLat, parking.longitude)).toBe('far');
	});
});
