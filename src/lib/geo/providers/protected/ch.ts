import * as m from '$lib/paraglide/messages.js';
import type {
	ProtectedAreaScan,
	ProtectedZoneCardId,
	ProtectedZoneHit
} from '$lib/types/harvest-ethics';
import { emptyZoneStatus } from '$lib/geo/providers/protected/eea';
import { resolveSwissCanton } from '$lib/geo/providers/ch/canton';
import {
	getOpenCantonProtected,
	wgs84ToLv95,
	type SwissCantonProtectedConfig
} from '$lib/geo/providers/ch/cantonRegistry';
import {
	identifyGeoAdminLayers,
	type GeoAdminIdentifyResult
} from '$lib/geo/providers/ch/identify';
import { createTimedAbortSignal, throwIfAborted } from '$lib/utils/abortSignal';
import { isApiEnabled } from '$lib/utils/apiPolicy';

/**
 * Swiss FOEN (BAFU) + optional open cantonal inventories (ZH).
 * Cantonal coverage is partial by design.
 *
 * Federal: parks, forest reserves, Emerald, AuLaV, bird reserves, Pro Natura.
 * ZH: OGD Waldreservate + Naturschutz inventaire 1980.
 */
const FETCH_TIMEOUT_MS = 12_000;
const VETO_CARD_IDS: ProtectedZoneCardId[] = ['pn', 'rnn'];

/** Gemeinde layer — used only for canton hints (avoids Nominatim when possible). */
const LAYER_GEMEINDE = 'ch.swisstopo-vd.geometa-gemeinde';

const FEDERAL_LAYERS = [
	'ch.bafu.schutzgebiete-paerke_nationaler_bedeutung_perimeter',
	'ch.bafu.waldreservate',
	'ch.bafu.schutzgebiete-smaragd',
	'ch.bafu.schutzgebiete-aulav_jagdbanngebiete',
	'ch.bafu.schutzgebiete-aulav_auen',
	'ch.bafu.schutzgebiete-aulav_moorlandschaften',
	'ch.bafu.bundesinventare-vogelreservate',
	'ch.pronatura.naturschutzgebiete'
] as const;

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

function pickLabel(attrs: Record<string, unknown>, keys?: string[]): string {
	const tryKeys = keys ?? ['label', 'name', 'Name', 'objektname', 'waldreservatname'];
	for (const key of tryKeys) {
		const value = asString(attrs[key]);
		if (value) return value;
	}
	return '';
}

function cardLabel(cardId: ProtectedZoneCardId): string {
	switch (cardId) {
		case 'pn':
			return m.veto_zone_pn();
		case 'rnn':
			return m.veto_zone_rnn();
		case 'pnr':
			return m.veto_zone_pnr();
		case 'natura2000':
			return m.veto_zone_natura2000();
		case 'rnr_regional':
			return m.veto_zone_rnr_regional();
		default:
			return cardId;
	}
}

function isNationalParkCategory(kategorie: string): boolean {
	const k = kategorie.trim().toUpperCase();
	return k === 'SNP' || k.includes('NATIONALPARK') || k.includes('NATIONAL PARK');
}

function pushHit(
	hits: ProtectedZoneHit[],
	seen: Set<string>,
	cardId: ProtectedZoneCardId,
	level: 'veto' | 'caution',
	name: string
): void {
	const key = `${cardId}:${name || cardId}`;
	if (seen.has(key)) return;
	seen.add(key);
	hits.push({
		id: cardId,
		label: name ? `${cardLabel(cardId)}: ${name}` : cardLabel(cardId),
		level
	});
}

/** Collect canton tokens from identify attributes (Gemeinde + federal). */
export function cantonHintsFromIdentify(results: GeoAdminIdentifyResult[]): string[] {
	const hints: string[] = [];
	for (const result of results) {
		const attrs = result.attributes ?? {};
		for (const key of ['kanton', 'ak', 'kantonskuerzel', 'kantonskürzel', 'kt'] as const) {
			const value = asString(attrs[key]);
			if (value) hints.push(value);
		}
	}
	return hints;
}

async function queryCantonProtected(
	config: SwissCantonProtectedConfig,
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<Array<{ cardId: ProtectedZoneCardId; level: 'veto' | 'caution'; name: string }>> {
	const { e, n } = wgs84ToLv95(latitude, longitude);
	const pad = 80;
	const out: Array<{ cardId: ProtectedZoneCardId; level: 'veto' | 'caution'; name: string }> = [];

	await Promise.all(
		config.layers.map(async (layer) => {
			const params = new URLSearchParams({
				SERVICE: 'WFS',
				VERSION: '1.1.0',
				REQUEST: 'GetFeature',
				TYPENAME: layer.typeName,
				OUTPUTFORMAT: 'application/json; subtype=geojson',
				SRSNAME: 'EPSG:2056',
				BBOX: `${e - pad},${n - pad},${e + pad},${n + pad}`,
				MAXFEATURES: '5'
			});
			try {
				const response = await fetch(`${config.endpoint}?${params}`, { signal });
				if (!response.ok) return;
				const data = (await response.json()) as {
					features?: Array<{ properties?: Record<string, unknown> }>;
				};
				for (const feature of data.features ?? []) {
					const name = pickLabel(feature.properties ?? {}, layer.nameKeys);
					out.push({ cardId: layer.cardId, level: layer.level, name });
				}
			} catch {
				/* ignore layer failures */
			}
		})
	);

	return out;
}

/**
 * Live BAFU + optional open-canton scan. Always marks coverage partial.
 * Federal layers + Gemeinde are identified in a single geo.admin request.
 */
export async function scanProtectedAreasCh(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<ProtectedAreaScan> {
	throwIfAborted(options?.signal);

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const identifyResults = await identifyGeoAdminLayers(
			[...FEDERAL_LAYERS, LAYER_GEMEINDE],
			latitude,
			longitude,
			{ signal, tolerance: 10, pad: 0.01 }
		);

		const zoneStatus = emptyZoneStatus();
		const hits: ProtectedZoneHit[] = [];
		const seen = new Set<string>();

		for (const result of identifyResults) {
			const layer = result.layerBodId ?? '';
			if (layer.includes('geometa-gemeinde')) continue;

			const attrs = result.attributes ?? {};
			const name = pickLabel(attrs);

			if (layer.includes('paerke_nationaler')) {
				const kategorie = asString(attrs.kategorie) || asString(attrs.zone);
				if (isNationalParkCategory(kategorie)) {
					zoneStatus.pn = 'certain';
					pushHit(hits, seen, 'pn', 'veto', name);
				} else {
					zoneStatus.pnr = 'certain';
					pushHit(hits, seen, 'pnr', 'caution', name);
				}
				continue;
			}

			if (layer.includes('waldreservate')) {
				zoneStatus.rnn = 'certain';
				pushHit(hits, seen, 'rnn', 'veto', name);
				continue;
			}

			if (layer.includes('smaragd') || layer.includes('vogelreservate')) {
				zoneStatus.natura2000 = 'certain';
				pushHit(hits, seen, 'natura2000', 'caution', name);
				continue;
			}

			if (layer.includes('aulav') || layer.includes('pronatura')) {
				zoneStatus.rnr_regional = 'certain';
				pushHit(hits, seen, 'rnr_regional', 'caution', name);
			}
		}

		const canton = await resolveSwissCanton(latitude, longitude, {
			signal,
			hints: cantonHintsFromIdentify(identifyResults),
			nominatimEnabled: isApiEnabled('nominatim')
		});
		const cantonConfig = getOpenCantonProtected(canton);
		if (cantonConfig) {
			const localHits = await queryCantonProtected(cantonConfig, latitude, longitude, signal);
			for (const hit of localHits) {
				zoneStatus[hit.cardId] = 'certain';
				pushHit(hits, seen, hit.cardId, hit.level, hit.name);
			}
		}

		const veto = VETO_CARD_IDS.some((cardId) => zoneStatus[cardId] !== 'clear');

		return {
			scannedAt: new Date().toISOString(),
			hits,
			veto,
			zoneStatus,
			fromCache: false,
			coverage: 'partial'
		};
	} finally {
		dispose();
	}
}
