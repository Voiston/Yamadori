import { describe, expect, it } from 'vitest';
import type { LngLat } from './downloadRegion';
import { resolveOfflinePack, selectedOfflinePackTiles } from './offlinePack';

const ring: LngLat[] = [
	[2.3, 48.84],
	[2.32, 48.84],
	[2.32, 48.86],
	[2.3, 48.86]
];

const location = { latitude: 48.85, longitude: 2.31 };

describe('resolveOfflinePack', () => {
	it('counts plan, satellite, cadastre and protected layers at pack zooms', () => {
		const estimate = resolveOfflinePack({
			ring,
			currentZoom: 12,
			basemap: 'topo',
			country: 'FR',
			location
		});

		expect(estimate.layers.map((layer) => layer.kind)).toEqual([
			'plan',
			'ortho',
			'cadastre',
			'protected'
		]);
		expect(estimate.layers.every((layer) => layer.zoomLevels.join(',') === '11,12,13,14,15,16')).toBe(
			true
		);
		expect(estimate.layers.find((layer) => layer.kind === 'cadastre')?.maxZoom).toBe(16);
		expect(estimate.layers.find((layer) => layer.kind === 'ortho')?.maxZoom).toBe(19);
		expect(estimate.cadastreAvailable).toBe(true);
		expect(estimate.protectedAvailable).toBe(true);
		expect(estimate.forecastCount).toBe(1);
		expect(estimate.mapsTiles).toBeGreaterThan(0);
		expect(estimate.cadastreTiles).toBeGreaterThan(0);
	});

	it('adds hillshade only when the satellite basemap is showing', () => {
		const estimate = resolveOfflinePack({
			ring,
			currentZoom: 12,
			basemap: 'satellite',
			country: 'FR',
			location
		});
		expect(estimate.layers.some((layer) => layer.kind === 'hillshade')).toBe(true);
	});

	it('hides overlays the country does not publish', () => {
		const estimate = resolveOfflinePack({
			ring,
			currentZoom: 12,
			basemap: 'topo',
			country: null,
			location
		});
		expect(estimate.cadastreAvailable).toBe(false);
		expect(estimate.protectedAvailable).toBe(false);
		expect(estimate.cadastreTiles).toBe(0);
	});

	it('sums only the checked tile layers', () => {
		const estimate = resolveOfflinePack({
			ring,
			currentZoom: 12,
			basemap: 'topo',
			country: 'FR',
			location
		});
		const bands = { viewZoom: true, walkZoom: true, detailZoom: false };
		const all = selectedOfflinePackTiles(estimate, {
			maps: true,
			cadastre: true,
			protectedAreas: true,
			...bands
		});
		const mapsOnly = selectedOfflinePackTiles(estimate, {
			maps: true,
			cadastre: false,
			protectedAreas: false,
			...bands
		});
		const mapsDetail = selectedOfflinePackTiles(estimate, {
			maps: true,
			cadastre: false,
			protectedAreas: false,
			viewZoom: true,
			walkZoom: true,
			detailZoom: true
		});
		const cadastreDetail = selectedOfflinePackTiles(estimate, {
			maps: false,
			cadastre: true,
			protectedAreas: false,
			viewZoom: true,
			walkZoom: true,
			detailZoom: true
		});
		const cadastreBase = selectedOfflinePackTiles(estimate, {
			maps: false,
			cadastre: true,
			protectedAreas: false,
			...bands
		});
		expect(all).toBe(estimate.mapsTiles + estimate.cadastreTiles + estimate.protectedTiles);
		expect(mapsOnly).toBe(estimate.mapsTiles);
		expect(mapsDetail).toBeGreaterThan(mapsOnly);
		expect(cadastreDetail).toBe(cadastreBase);
	});
});
