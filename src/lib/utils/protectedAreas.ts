import * as m from '$lib/paraglide/messages.js';
import type {
	ProtectedAreaScan,
	ProtectedZoneCardId,
	ProtectedZoneHit,
	ProtectedZonePresence
} from '$lib/types/harvest-ethics';
import { cadastreCacheKey, isInCadastreCoverage } from '$lib/utils/cadastre';
import {
	getCachedProtectedAreaScan,
	saveCachedProtectedAreaScan
} from '$lib/utils/protectedAreasCache';

const APICARTO_NATURE_URL = 'https://apicarto.ign.fr/api/nature';
const APICARTO_PARCELLE_URL = 'https://apicarto.ign.fr/api/cadastre/parcelle';
const FETCH_TIMEOUT_MS = 8_000;
const MEMORY_CACHE_TTL_MS = 30 * 60_000;
const NATURE_FETCH_CONCURRENCY = 4;

type NatureLayer = {
	id: string;
	cardId: ProtectedZoneCardId;
	level: ProtectedZoneHit['level'];
	label: () => string;
};

const NATURE_LAYERS: NatureLayer[] = [
	{ id: 'pn', cardId: 'pn', level: 'veto', label: () => m.veto_zone_pn() },
	{ id: 'rnn', cardId: 'rnn', level: 'veto', label: () => m.veto_zone_rnn() },
	{ id: 'pnr', cardId: 'pnr', level: 'caution', label: () => m.veto_zone_pnr() },
	{ id: 'rnc', cardId: 'rnr_regional', level: 'caution', label: () => m.veto_zone_rnr_regional() },
	{ id: 'rncf', cardId: 'rnr_regional', level: 'caution', label: () => m.veto_zone_rnr_regional() },
	{ id: 'natura-habitat', cardId: 'natura2000', level: 'caution', label: () => m.veto_zone_natura2000() },
	{ id: 'natura-oiseaux', cardId: 'natura2000', level: 'caution', label: () => m.veto_zone_natura2000() },
	{ id: 'znieff1', cardId: 'znieff', level: 'caution', label: () => m.veto_zone_znieff() },
	{ id: 'znieff2', cardId: 'znieff', level: 'caution', label: () => m.veto_zone_znieff() }
];

const SCANNABLE_CARD_IDS: ProtectedZoneCardId[] = [
	'pn',
	'rnn',
	'pnr',
	'rnr_regional',
	'natura2000',
	'znieff'
];
const VETO_CARD_IDS: ProtectedZoneCardId[] = ['pn', 'rnn'];

type GeoJsonGeometry = {
	type: string;
	coordinates: unknown;
};

type GeoJsonFeatureCollection = {
	features?: { geometry?: GeoJsonGeometry }[];
};

type MemoryCacheEntry = {
	expiresAt: number;
	value: ProtectedAreaScan;
};

const memoryCache = new Map<string, MemoryCacheEntry>();

function emptyZoneStatus(): Record<ProtectedZoneCardId, ProtectedZonePresence> {
	return {
		pn: 'clear',
		rnn: 'clear',
		pnr: 'clear',
		rnr_regional: 'clear',
		natura2000: 'clear',
		znieff: 'clear',
		appb: 'clear'
	};
}

function readMemoryCache(key: string): ProtectedAreaScan | undefined {
	const entry = memoryCache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		memoryCache.delete(key);
		return undefined;
	}
	return entry.value;
}

function writeMemoryCache(key: string, value: ProtectedAreaScan): void {
	memoryCache.set(key, { value, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
}

function geometryParam(geometry: GeoJsonGeometry): string {
	return JSON.stringify(geometry);
}

function pointGeometry(longitude: number, latitude: number): GeoJsonGeometry {
	return { type: 'Point', coordinates: [longitude, latitude] };
}

async function fetchGeoJson(url: string): Promise<GeoJsonFeatureCollection | null> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) return null;
		return (await response.json()) as GeoJsonFeatureCollection;
	} catch {
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}

async function fetchNatureLayer(layerId: string, geometry: GeoJsonGeometry): Promise<boolean> {
	const params = new URLSearchParams({
		geom: geometryParam(geometry),
		_limit: '1'
	});
	const data = await fetchGeoJson(`${APICARTO_NATURE_URL}/${layerId}?${params}`);
	return (data?.features?.length ?? 0) > 0;
}

async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	mapper: (item: T) => Promise<R>
): Promise<R[]> {
	if (items.length === 0) {
		return [];
	}

	const results = new Array<R>(items.length);
	let nextIndex = 0;
	const workerCount = Math.min(concurrency, items.length);

	async function worker(): Promise<void> {
		while (nextIndex < items.length) {
			const index = nextIndex;
			nextIndex += 1;
			results[index] = await mapper(items[index]);
		}
	}

	await Promise.all(Array.from({ length: workerCount }, () => worker()));
	return results;
}

async function fetchParcelGeometry(
	longitude: number,
	latitude: number
): Promise<GeoJsonGeometry | null> {
	const params = new URLSearchParams({
		geom: geometryParam(pointGeometry(longitude, latitude)),
		_limit: '1'
	});
	const data = await fetchGeoJson(`${APICARTO_PARCELLE_URL}?${params}`);
	return data?.features?.[0]?.geometry ?? null;
}

async function scanLayerGroup(
	layerIds: string[],
	longitude: number,
	latitude: number,
	parcelGeometry: GeoJsonGeometry | null
): Promise<ProtectedZonePresence> {
	const pointHit = await mapWithConcurrency(layerIds, NATURE_FETCH_CONCURRENCY, (layerId) =>
		fetchNatureLayer(layerId, pointGeometry(longitude, latitude))
	);
	if (pointHit.some(Boolean)) return 'certain';

	if (!parcelGeometry) return 'clear';

	const parcelHit = await mapWithConcurrency(layerIds, NATURE_FETCH_CONCURRENCY, (layerId) =>
		fetchNatureLayer(layerId, parcelGeometry)
	);
	if (parcelHit.some(Boolean)) return 'potential';

	return 'clear';
}

function layersForCard(cardId: ProtectedZoneCardId): string[] {
	return NATURE_LAYERS.filter((layer) => layer.cardId === cardId).map((layer) => layer.id);
}

function buildHits(zoneStatus: Record<ProtectedZoneCardId, ProtectedZonePresence>): ProtectedZoneHit[] {
	const hits: ProtectedZoneHit[] = [];
	const seen = new Set<string>();

	for (const layer of NATURE_LAYERS) {
		if (zoneStatus[layer.cardId] === 'clear') continue;
		const label = layer.label();
		if (seen.has(label)) continue;
		seen.add(label);
		hits.push({
			id: layer.id,
			label,
			level: layer.level
		});
	}

	return hits;
}

async function scanProtectedAreasLive(
	latitude: number,
	longitude: number
): Promise<ProtectedAreaScan> {
	const zoneStatus = emptyZoneStatus();
	const parcelGeometry = await fetchParcelGeometry(longitude, latitude);

	await Promise.all(
		SCANNABLE_CARD_IDS.map(async (cardId) => {
			const layerIds = layersForCard(cardId);
			if (layerIds.length === 0) return;
			zoneStatus[cardId] = await scanLayerGroup(layerIds, longitude, latitude, parcelGeometry);
		})
	);

	const hits = buildHits(zoneStatus);
	const veto = VETO_CARD_IDS.some((cardId) => zoneStatus[cardId] !== 'clear');

	return {
		scannedAt: new Date().toISOString(),
		hits,
		veto,
		zoneStatus,
		fromCache: false
	};
}

export function getProtectedZoneCardClasses(status: ProtectedZonePresence): string {
	switch (status) {
		case 'certain':
			return 'border-red-300 bg-red-50 text-red-950';
		case 'potential':
			return 'border-amber-300 bg-amber-50 text-amber-950';
		default:
			return 'border-gray-200 bg-gray-50 text-gray-500';
	}
}

export function getProtectedZoneStatusMessage(status: ProtectedZonePresence): string | null {
	switch (status) {
		case 'certain':
			return m.veto_zone_status_certain();
		case 'potential':
			return m.veto_zone_status_potential();
		default:
			return null;
	}
}

export async function scanProtectedAreas(
	latitude: number,
	longitude: number,
	options: { online?: boolean } = {}
): Promise<ProtectedAreaScan> {
	const online = options.online ?? true;
	const key = cadastreCacheKey(latitude, longitude);
	const empty = (): ProtectedAreaScan => ({
		scannedAt: new Date().toISOString(),
		hits: [],
		veto: false,
		zoneStatus: emptyZoneStatus(),
		fromCache: false
	});

	if (!isInCadastreCoverage(latitude, longitude)) {
		return empty();
	}

	const cachedMemory = readMemoryCache(key);
	if (cachedMemory) return cachedMemory;

	const cachedPersistent = await getCachedProtectedAreaScan(key);
	if (!online) {
		if (cachedPersistent) {
			writeMemoryCache(key, cachedPersistent);
			return cachedPersistent;
		}
		throw new Error('protected_areas_offline_cache_miss');
	}

	try {
		const result = await scanProtectedAreasLive(latitude, longitude);
		writeMemoryCache(key, result);
		await saveCachedProtectedAreaScan(key, result);
		return result;
	} catch {
		if (cachedPersistent) {
			writeMemoryCache(key, cachedPersistent);
			return cachedPersistent;
		}
		throw new Error('protected_areas_scan_failed');
	}
}

/** Vide le cache mémoire (session / tests). */
export function clearProtectedAreasMemoryCache(): void {
	memoryCache.clear();
}

export { clearProtectedAreasPersistentCache } from '$lib/utils/protectedAreasCache';
