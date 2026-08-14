import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { scanProtectedAreasJp } from '$lib/geo/providers/protected/jp';
import {
	clearKsjA10PointCache,
	layerKindFromLayerNo,
	queryKsjA10At
} from '$lib/geo/providers/ksj-a10/client';
import { classifyKsjA10Hit, classifyKsjA10Hits } from '$lib/geo/providers/ksj-a10/classify';
import { pointInGeoJsonGeometry } from '$lib/geo/providers/ksj-a10/pointInPolygon';
import type { KsjA10Hit } from '$lib/geo/providers/ksj-a10/client';
import { gzipSync } from 'node:zlib';

function hit(partial: Partial<KsjA10Hit> & Pick<KsjA10Hit, 'name' | 'layerKind'>): KsjA10Hit {
	return {
		prefectureCode: '',
		layerNo: 0,
		objectId: '',
		areaHa: null,
		...partial
	};
}

describe('scanProtectedAreasJp with static parks', () => {
	beforeEach(() => {
		clearKsjA10PointCache();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		clearKsjA10PointCache();
	});

	it('returns outside_ksj caution when static parks load and point is clear', async () => {
		const empty = { type: 'FeatureCollection', features: [] };
		const gz = gzipSync(Buffer.from(JSON.stringify(empty), 'utf8'));
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength)
			}))
		);

		const scan = await scanProtectedAreasJp(35.6812, 139.7671);
		expect(scan.coverage).toBe('partial');
		expect(scan.veto).toBe(false);
		expect(scan.hits.some((h) => h.id === 'outside_ksj')).toBe(true);
	});

	it('returns unsupported when static asset fetch fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: false,
				status: 404,
				arrayBuffer: async () => new ArrayBuffer(0)
			}))
		);

		const scan = await scanProtectedAreasJp(35.6812, 139.7671);
		expect(scan.coverage).toBe('unsupported');
		expect(scan.hits).toEqual([]);
	});

	it('detects a hit from static polygons', async () => {
		const collection = {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: {
						OBJECTID: '1',
						OBJ_NAME_ja: 'テスト国立公園',
						LAYER_NO: 13,
						GRADE: '特別保護地区'
					},
					geometry: {
						type: 'Polygon',
						coordinates: [
							[
								[139.0, 35.0],
								[140.0, 35.0],
								[140.0, 36.0],
								[139.0, 36.0],
								[139.0, 35.0]
							]
						]
					}
				}
			]
		};
		const gz = gzipSync(Buffer.from(JSON.stringify(collection), 'utf8'));
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength)
			}))
		);

		const hits = await queryKsjA10At(35.5, 139.5);
		expect(hits.length).toBe(1);
		expect(hits[0].layerKind).toBe('strict');
		expect(hits[0].name).toContain('国立公園');
	});
});

describe('ksj-a10 layerKindFromLayerNo', () => {
	it('maps LAYER_NO suffixes 11/12/13', () => {
		expect(layerKindFromLayerNo(11)).toBe('region');
		expect(layerKindFromLayerNo(12)).toBe('special');
		expect(layerKindFromLayerNo(13)).toBe('strict');
		expect(layerKindFromLayerNo(111)).toBe('region');
		expect(layerKindFromLayerNo(null)).toBe('unknown');
	});
});

describe('ksj-a10 classify', () => {
	it('treats special/strict layers as national_park', () => {
		expect(classifyKsjA10Hit(hit({ name: '何か', layerKind: 'special' }))).toBe('national_park');
		expect(classifyKsjA10Hit(hit({ name: '何か', layerKind: 'strict' }))).toBe('national_park');
	});

	it('classifies 国立 / 国定 / 県立 by name', () => {
		expect(
			classifyKsjA10Hit(hit({ name: '富士箱根伊豆国立公園', layerKind: 'region' }))
		).toBe('national_park');
		expect(classifyKsjA10Hit(hit({ name: '県立自然公園', layerKind: 'region' }))).toBe(
			'state_park'
		);
	});

	it('merges overlapping hits to most restrictive', () => {
		const merged = classifyKsjA10Hits([
			hit({ name: '県立自然公園', layerKind: 'region', objectId: '1' }),
			hit({ name: '特別保護地区', layerKind: 'strict', objectId: '2' })
		]);
		expect(merged.zoneType).toBe('national_park');
		expect(merged.designation).toBe('特別保護地区');
	});
});

describe('ksj-a10 pointInGeoJsonGeometry', () => {
	it('detects point inside a simple square polygon', () => {
		const geometry = {
			type: 'Polygon',
			coordinates: [
				[
					[139.0, 35.0],
					[140.0, 35.0],
					[140.0, 36.0],
					[139.0, 36.0],
					[139.0, 35.0]
				]
			]
		};
		expect(pointInGeoJsonGeometry(139.5, 35.5, geometry)).toBe(true);
		expect(pointInGeoJsonGeometry(138.0, 35.5, geometry)).toBe(false);
	});
});
