import * as m from '$lib/paraglide/messages.js';
import type { CadastreInfo, CadastreZoneType } from '$lib/types/cadastre';
import {
	getCachedCadastre,
	saveCachedCadastre,
	clearCadastrePersistentCache
} from '$lib/utils/cadastreCache';

const APICARTO_PARCELLE_URL = 'https://apicarto.ign.fr/api/cadastre/parcelle';
const APICARTO_COMMUNE_URL = 'https://apicarto.ign.fr/api/cadastre/commune';
const APICARTO_WFS_URL = 'https://apicarto.ign.fr/api/wfs-geoportail/search';

/**
 * Couche WFS « Forêts publiques » (ONF) sur la Géoplateforme.
 * Voir https://www.geoportail.gouv.fr/custom_layer/forets-publiques
 */
const PUBLIC_FOREST_WFS_SOURCES = [
	'ONF.ESPACES_NATURELS:forets_publiques',
	'PROTECTEDAREAS.FORESTPUBLIQUE:forets_publiques'
] as const;

const FETCH_TIMEOUT_MS = 8_000;
const MIN_REQUEST_INTERVAL_MS = 500;
const MEMORY_CACHE_TTL_MS = 30 * 60_000;
const COORD_PRECISION = 4;

/** Métropole + Corse (hors DOM-TOM et étranger). */
const COVERAGE = {
	minLat: 41,
	maxLat: 51.5,
	minLon: -5.5,
	maxLon: 10
} as const;

type GeoJsonFeature = {
	properties?: Record<string, unknown>;
};

type GeoJsonFeatureCollection = {
	features?: GeoJsonFeature[];
};

type CacheEntry = {
	expiresAt: number;
	value: CadastreInfo | null;
};

let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();
const memoryCache = new Map<string, CacheEntry>();

function throttleRequest<T>(fn: () => Promise<T>): Promise<T> {
	const run = async (): Promise<T> => {
		const now = Date.now();
		const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastRequestAt));
		if (waitMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, waitMs));
		}
		lastRequestAt = Date.now();
		return fn();
	};

	const result = queue.then(run, run);
	queue = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}

export function isInCadastreCoverage(latitude: number, longitude: number): boolean {
	return (
		latitude >= COVERAGE.minLat &&
		latitude <= COVERAGE.maxLat &&
		longitude >= COVERAGE.minLon &&
		longitude <= COVERAGE.maxLon
	);
}

export function cadastreCacheKey(latitude: number, longitude: number): string {
	return `${latitude.toFixed(COORD_PRECISION)},${longitude.toFixed(COORD_PRECISION)}`;
}

function readCached(key: string): CadastreInfo | null | undefined {
	const entry = memoryCache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		memoryCache.delete(key);
		return undefined;
	}
	return entry.value;
}

function writeCache(key: string, value: CadastreInfo | null): void {
	memoryCache.set(key, { value, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
	void saveCachedCadastre(key, value);
}

async function readPersistentCache(key: string): Promise<CadastreInfo | null | undefined> {
	return getCachedCadastre(key);
}

function pointGeometry(longitude: number, latitude: number): string {
	return JSON.stringify({ type: 'Point', coordinates: [longitude, latitude] });
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

function pickProperty(properties: Record<string, unknown>, keys: string[]): string {
	for (const key of keys) {
		const value = asString(properties[key]);
		if (value) return value;
	}
	return '';
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

async function fetchParcelFeature(
	longitude: number,
	latitude: number
): Promise<GeoJsonFeature | null> {
	const params = new URLSearchParams({
		geom: pointGeometry(longitude, latitude),
		_limit: '1'
	});
	const data = await fetchGeoJson(`${APICARTO_PARCELLE_URL}?${params}`);
	const feature = data?.features?.[0];
	return feature ?? null;
}

async function fetchCommuneName(longitude: number, latitude: number): Promise<string> {
	const params = new URLSearchParams({
		geom: pointGeometry(longitude, latitude),
		_limit: '1'
	});
	const data = await fetchGeoJson(`${APICARTO_COMMUNE_URL}?${params}`);
	const properties = data?.features?.[0]?.properties;
	if (!properties) return '';

	return pickProperty(properties, ['nom_com', 'nom_commune', 'nom', 'libelle']);
}

async function fetchPublicForestFeature(
	longitude: number,
	latitude: number
): Promise<GeoJsonFeature | null> {
	const geom = pointGeometry(longitude, latitude);

	for (const source of PUBLIC_FOREST_WFS_SOURCES) {
		const params = new URLSearchParams({
			source,
			geom,
			_limit: '1'
		});
		const data = await fetchGeoJson(`${APICARTO_WFS_URL}?${params}`);
		const feature = data?.features?.[0];
		if (feature) return feature;
	}

	return null;
}

function classifyForestZone(properties: Record<string, unknown> | undefined): CadastreZoneType {
	if (!properties) return 'private';

	const regime = pickProperty(properties, [
		'regime',
		'REGIME',
		'type_regime',
		'TYPE_REGIME',
		'nature_gest',
		'NATURE_GEST',
		'nature',
		'NATURE'
	]).toLowerCase();

	if (regime.includes('domanial') || regime.includes('etat') || regime.includes('état')) {
		return 'state_forest';
	}

	if (
		regime.includes('communal') ||
		regime.includes('sectional') ||
		regime.includes('departement') ||
		regime.includes('département') ||
		regime.includes('etablissement') ||
		regime.includes('établissement')
	) {
		return 'communal_forest';
	}

	// Forêt publique ONF sans attribut explicite : traiter comme communale (prudence).
	return 'communal_forest';
}

function parcelLabel(section: string, parcelNumber: string): string {
	return m.cadastre_parcel_short({ section, number: parcelNumber });
}

export function getCadastreSummary(info: CadastreInfo): string {
	const parcel = parcelLabel(info.section, info.parcelNumber);
	const args = { parcel, commune: info.commune };

	switch (info.zoneType) {
		case 'state_forest':
			return m.cadastre_summary_state_forest(args);
		case 'communal_forest':
			return m.cadastre_summary_communal_forest(args);
		default:
			return m.cadastre_summary_private(args);
	}
}

export function getCadastreBannerMessage(info: CadastreInfo): { title: string; detail: string } {
	const args = {
		section: info.section,
		number: info.parcelNumber,
		commune: info.commune
	};

	switch (info.zoneType) {
		case 'state_forest':
			return {
				title: m.cadastre_state_forest_title(),
				detail: m.cadastre_state_forest_detail()
			};
		case 'communal_forest':
			return {
				title: m.cadastre_communal_title(),
				detail: m.cadastre_communal_detail(args)
			};
		default:
			return {
				title: m.cadastre_private_title(args),
				detail: m.cadastre_private_detail(args)
			};
	}
}

export function getCadastreAccentClasses(zoneType: CadastreZoneType): {
	border: string;
	accent: string;
} {
	switch (zoneType) {
		case 'state_forest':
			return { border: 'border-emerald-200', accent: 'bg-emerald-500' };
		case 'communal_forest':
			return { border: 'border-sky-200', accent: 'bg-sky-500' };
		default:
			return { border: 'border-amber-200', accent: 'bg-amber-500' };
	}
}

async function lookupCadastreUncached(latitude: number, longitude: number): Promise<CadastreInfo | null> {
	const parcelFeature = await fetchParcelFeature(longitude, latitude);
	const properties = parcelFeature?.properties ?? {};

	const section = pickProperty(properties, ['section', 'SECTION']);
	const parcelNumber = pickProperty(properties, ['numero', 'NUMERO', 'numero_parcelle']);
	const codeInsee = pickProperty(properties, ['code_insee', 'CODE_INSEE', 'insee', 'INSEE']);

	if (!section || !parcelNumber) {
		return null;
	}

	let commune = pickProperty(properties, ['nom_com', 'nom_commune', 'commune', 'NOM_COM']);
	if (!commune) {
		commune = await fetchCommuneName(longitude, latitude);
	}
	if (!commune) {
		commune = codeInsee || m.cadastre_unavailable();
	}

	const forestFeature = await fetchPublicForestFeature(longitude, latitude);
	const zoneType = forestFeature
		? classifyForestZone(forestFeature.properties)
		: 'private';

	return {
		commune,
		section,
		parcelNumber,
		codeInsee,
		zoneType,
		fetchedAt: new Date().toISOString()
	};
}

/**
 * Interroge le cadastre PCI Express et la couche forêts publiques ONF.
 * Ne divulgue aucune donnée personnelle — uniquement parcelle et régime foncier.
 */
export async function lookupCadastre(
	latitude: number,
	longitude: number
): Promise<CadastreInfo | null> {
	if (!isInCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const key = cadastreCacheKey(latitude, longitude);
	const cached = readCached(key);
	if (cached !== undefined) {
		return cached;
	}

	const persisted = await readPersistentCache(key);
	if (persisted !== undefined) {
		writeCache(key, persisted);
		return persisted;
	}

	return throttleRequest(async () => {
		const again = readCached(key);
		if (again !== undefined) return again;

		const persistedAgain = await readPersistentCache(key);
		if (persistedAgain !== undefined) {
			writeCache(key, persistedAgain);
			return persistedAgain;
		}

		const result = await lookupCadastreUncached(latitude, longitude);
		writeCache(key, result);
		return result;
	});
}

/** Vide le cache mémoire (session). */
export function clearCadastreMemoryCache(): void {
	memoryCache.clear();
}

/** Vide les caches mémoire et persistant (tests). */
export async function clearCadastreCache(): Promise<void> {
	clearCadastreMemoryCache();
	await clearCadastrePersistentCache();
}

export { clearCadastrePersistentCache, getCadastreCacheStats } from '$lib/utils/cadastreCache';
