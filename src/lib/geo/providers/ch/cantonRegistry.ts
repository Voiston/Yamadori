import type { SwissCantonCode } from '$lib/geo/providers/ch/canton';

/**
 * Approximate WGS84 → CH1903+ / LV95 (EPSG:2056) using the official
 * swisstopo approximate formulas (metre-level accuracy, enough for WFS BBOX).
 * https://www.swisstopo.admin.ch/en/knowledge-facts/surveying-geodesy/reference-systems/projections.html
 */
export function wgs84ToLv95(latitude: number, longitude: number): { e: number; n: number } {
	const phi = (latitude * 3600 - 169028.66) / 10000;
	const lam = (longitude * 3600 - 26782.5) / 10000;
	const e =
		2600072.37 +
		211455.93 * lam -
		10938.51 * lam * phi -
		0.36 * lam * phi * phi -
		44.54 * lam * lam * lam;
	const n =
		1200147.07 +
		308807.95 * phi +
		3745.25 * lam * lam +
		76.63 * phi * phi -
		194.56 * lam * lam * phi +
		119.79 * phi * phi * phi;
	return { e, n };
}

export type SwissCantonCadastreConfig = {
	code: SwissCantonCode;
	endpoint: string;
	typeName: string;
	parcelKeys: string[];
	communeKeys: string[];
	attribution: string;
};

/**
 * Open cantonal AV WFS endpoints (no account).
 * GE (SITG CAD_PARCELLE) returned an HTML portal page — not a usable WFS (2026-07).
 * BE geoservice AV WFS was 503 — expand after smoke.
 */
export const OPEN_CANTON_CADASTRE: readonly SwissCantonCadastreConfig[] = [
	{
		code: 'ZH',
		endpoint: 'https://maps.zh.ch/wfs/AVZHWFS',
		typeName: 'ms:liegenschaften_f',
		parcelKeys: ['nummer', 'egris_egrid', 'objid', 'nbident'],
		communeKeys: ['gemeinde', 'gemname', 'name'],
		attribution: '© Kanton Zürich — AVWFS (MOpublicZH)'
	},
	{
		code: 'BS',
		endpoint: 'https://wfs.geo.bs.ch/',
		typeName: 'ms:BS_Liegenschaften_Grundstuecke_Liegenschaftsparzelle',
		parcelKeys: ['bs_prznummer', 'bs_egrid', 'nummer', 'egris_egrid', 'egrid'],
		communeKeys: ['gemeinde', 'gemname', 'name'],
		attribution: '© Kanton Basel-Stadt — AV WFS (Liegenschaftsparzelle)'
	}
];

export function getOpenCantonCadastre(
	code: SwissCantonCode | null
): SwissCantonCadastreConfig | null {
	if (!code) return null;
	return OPEN_CANTON_CADASTRE.find((entry) => entry.code === code) ?? null;
}

export type SwissCantonProtectedConfig = {
	code: SwissCantonCode;
	endpoint: string;
	/** Layers queried in parallel for nature / forest reserves. */
	layers: Array<{
		typeName: string;
		nameKeys: string[];
		/** Map to veto card: forest reserve → rnn, nature inventory → caution. */
		level: 'veto' | 'caution';
		cardId: 'rnn' | 'rnr_regional' | 'pnr';
	}>;
	attribution: string;
};

export const OPEN_CANTON_PROTECTED: readonly SwissCantonProtectedConfig[] = [
	{
		code: 'ZH',
		endpoint: 'https://maps.zh.ch/wfs/OGDZHWFS',
		layers: [
			{
				typeName: 'ms:ogd-0046_arv_basis_waldreservat_f',
				nameKeys: ['waldreservatname', 'name', 'objid'],
				level: 'veto',
				cardId: 'rnn'
			},
			{
				typeName: 'ms:ogd-0127_giszhpub_inv80_naturschutzobjekte_f',
				nameKeys: ['name', 'obj_nr', 'gemeinde'],
				level: 'caution',
				cardId: 'rnr_regional'
			}
		],
		attribution: '© Kanton Zürich — Naturschutz / Waldreservate (OGD)'
	}
];

export function getOpenCantonProtected(
	code: SwissCantonCode | null
): SwissCantonProtectedConfig | null {
	if (!code) return null;
	return OPEN_CANTON_PROTECTED.find((entry) => entry.code === code) ?? null;
}
