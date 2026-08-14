import type { CadastreZoneType } from '$lib/types/cadastre';
import type { CountryCode } from '$lib/geo/countries';
import { resolveGbNation, type GbNation } from '$lib/geo/providers/protected/gb';
import {
	parseSwissCantonCode,
	swissCantonLabel,
	type SwissCantonCode
} from '$lib/geo/providers/ch/canton';

export type EuPermitLink = {
	id: string;
	label: string;
	url: string;
};

export type EuPermitLinkOptions = {
	latitude?: number;
	longitude?: number;
	/** Land / region / ISO hint from cadastre stateCode, section, etc. */
	stateHint?: string | null;
	commune?: string;
};

function forestOrPrivate(zoneType: CadastreZoneType): 'forest' | 'private' | 'other' {
	if (
		zoneType === 'state_forest' ||
		zoneType === 'communal_forest' ||
		zoneType === 'national_forest'
	) {
		return 'forest';
	}
	if (zoneType === 'private') return 'private';
	return 'other';
}

function hintBlob(options?: EuPermitLinkOptions): string {
	return `${options?.stateHint ?? ''} ${options?.commune ?? ''}`.trim();
}

function prioritize(preferredIds: string[], links: EuPermitLink[]): EuPermitLink[] {
	const preferred = preferredIds
		.map((id) => links.find((l) => l.id === id))
		.filter((l): l is EuPermitLink => Boolean(l));
	const rest = links.filter((l) => !preferredIds.includes(l.id));
	return [...preferred, ...rest];
}

type BeRegion = 'flanders' | 'wallonie' | 'brussels';

/** Approximate BE region from hint text and/or lat/lon (not cadastral truth). */
export function resolveBeRegion(options?: EuPermitLinkOptions): BeRegion | null {
	const blob = hintBlob(options).toLowerCase();
	if (/bruxelles|brussels|brussel|DE-BRU|BE-BRU/i.test(blob)) return 'brussels';
	if (
		/vlaanderen|flanders|flamand|antwerpen|gent|brugge|leuven|hasselt|kortrijk|BE-VLG/i.test(blob)
	) {
		return 'flanders';
	}
	if (
		/wallon|namur|li[eè]ge|charleroi|mons|arlon|eupen|malmedy|ostbelgien|BE-WAL/i.test(blob)
	) {
		return 'wallonie';
	}

	const { latitude: lat, longitude: lon } = options ?? {};
	if (lat == null || lon == null) return null;

	// Brussels-Capital (tight box)
	if (lat >= 50.75 && lat <= 50.92 && lon >= 4.22 && lon <= 4.5) return 'brussels';
	// Rough language border ~50.75: north → Flanders, south → Wallonia
	if (lat >= 50.75) return 'flanders';
	if (lat >= 49.45) return 'wallonie';
	return null;
}

type PtRegion = 'mainland' | 'madeira' | 'azores';

/** Approximate PT region from hint text and/or lat/lon (not cadastral truth). */
export function resolvePtRegion(options?: EuPermitLinkOptions): PtRegion | null {
	const blob = hintBlob(options).toLowerCase();
	if (/madeira|funchal|porto santo|PT-MA|RAM\b/i.test(blob)) return 'madeira';
	if (/a[cç]ores|azores|ponta delgada|angra|horta|PT-AC|RAA\b/i.test(blob)) return 'azores';

	const { latitude: lat, longitude: lon } = options ?? {};
	if (lat == null || lon == null) return null;

	// Madeira + Porto Santo
	if (lat >= 32.4 && lat <= 33.2 && lon >= -17.3 && lon <= -16.2) return 'madeira';
	// Açores (main group)
	if (lat >= 36.9 && lat <= 39.8 && lon >= -31.3 && lon <= -24.9) return 'azores';
	// Continental Portugal
	if (lat >= 36.9 && lat <= 42.2 && lon >= -9.6 && lon <= -6.1) return 'mainland';
	return null;
}

type DeLandCode =
	| 'BE'
	| 'BB'
	| 'HB'
	| 'HH'
	| 'HE'
	| 'MV'
	| 'NI'
	| 'NW'
	| 'RP'
	| 'SL'
	| 'SN'
	| 'ST'
	| 'SH'
	| 'BW'
	| 'BY'
	| 'TH';

const DE_LAND_FORST: Record<DeLandCode, EuPermitLink> = {
	NW: {
		id: 'de_forst_nw',
		label: 'Wald und Holz NRW',
		url: 'https://www.wald-und-holz.nrw.de/'
	},
	BW: {
		id: 'de_forst_bw',
		label: 'ForstBW — Baden-Württemberg',
		url: 'https://www.forstbw.de/'
	},
	BY: {
		id: 'de_forst_by',
		label: 'Bayerische Forstverwaltung',
		url: 'https://www.stmelf.bayern.de/wald/index.html'
	},
	BE: {
		id: 'de_forst_be',
		label: 'Berliner Forsten',
		url: 'https://www.berlin.de/forsten/'
	},
	BB: {
		id: 'de_forst_bb',
		label: 'Forst Brandenburg',
		url: 'https://forst.brandenburg.de/'
	},
	HH: {
		id: 'de_forst_hh',
		label: 'Hamburg — Wald / BUKEA',
		url: 'https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/themen/agrarwirtschaft/wald'
	},
	HB: {
		id: 'de_forst_hb',
		label: 'Bremen — Wald & Jagd',
		url: 'https://umwelt.bremen.de/umwelt/natur/wald-jagd-24215'
	},
	HE: {
		id: 'de_forst_he',
		label: 'HessenForst',
		url: 'https://hessen-forst.de/'
	},
	MV: {
		id: 'de_forst_mv',
		label: 'Wald-MV — Mecklenburg-Vorpommern',
		url: 'https://www.wald-mv.de/'
	},
	NI: {
		id: 'de_forst_ni',
		label: 'Niedersächsische Landesforsten',
		url: 'https://landesforsten.de/'
	},
	RP: {
		id: 'de_forst_rp',
		label: 'Wald RLP — Rheinland-Pfalz',
		url: 'https://www.wald.rlp.de/'
	},
	SL: {
		id: 'de_forst_sl',
		label: 'SaarForst Landesbetrieb',
		url: 'https://www.saarland.de/saarforst/DE/home'
	},
	SN: {
		id: 'de_forst_sn',
		label: 'Sachsenforst',
		url: 'https://www.sbs.sachsen.de/'
	},
	ST: {
		id: 'de_forst_st',
		label: 'Landesforstbetrieb Sachsen-Anhalt',
		url: 'https://landesforstbetrieb.de/'
	},
	SH: {
		id: 'de_forst_sh',
		label: 'Schleswig-Holsteinische Landesforsten',
		url: 'https://www.forst-sh.de/'
	},
	TH: {
		id: 'de_forst_th',
		label: 'ThüringenForst',
		url: 'https://www.thueringenforst.de/'
	}
};

const DE_LAND_MATCH: Array<{ code: DeLandCode; re: RegExp }> = [
	{ code: 'NW', re: /nordrhein|westfalen|DE-NW|\bNRW\b/i },
	{ code: 'BW', re: /baden|w(?:ue|ü)rttemberg|DE-BW/i },
	{ code: 'BY', re: /bayern|bavaria|münchen|munich|DE-BY/i },
	{ code: 'BE', re: /berlin|DE-BE/i },
	{ code: 'BB', re: /brandenburg|DE-BB/i },
	{ code: 'HH', re: /hamburg|DE-HH/i },
	{ code: 'HB', re: /bremen|bremerhaven|DE-HB/i },
	{ code: 'HE', re: /hessen|frankfurt|DE-HE/i },
	{ code: 'MV', re: /mecklenburg|vorpommern|DE-MV/i },
	{ code: 'NI', re: /niedersachsen|hanover|hannover|DE-NI/i },
	{ code: 'RP', re: /rheinland[- ]?pfalz|DE-RP|\bRLP\b/i },
	{ code: 'SL', re: /saarland|saarbrücken|DE-SL/i },
	{ code: 'ST', re: /sachsen[- ]?anhalt|DE-ST/i },
	{ code: 'SN', re: /sachsen|DE-SN|dresden|leipzig/i },
	{ code: 'SH', re: /schleswig|holstein|DE-SH|\bSHLF\b/i },
	{ code: 'TH', re: /th(?:ue|ü)ringen|erfurt|DE-TH/i }
];

/**
 * Rough Land boxes (hint when text is empty).
 * City-states first so they win over surrounding Flächenländer.
 */
const DE_LAND_BBOX: Array<{
	code: DeLandCode;
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}> = [
	{ code: 'BE', minLat: 52.3, maxLat: 52.7, minLon: 13.0, maxLon: 13.8 },
	{ code: 'HH', minLat: 53.4, maxLat: 53.75, minLon: 9.7, maxLon: 10.35 },
	{ code: 'HB', minLat: 53.0, maxLat: 53.6, minLon: 8.4, maxLon: 9.0 },
	{ code: 'SL', minLat: 49.1, maxLat: 49.65, minLon: 6.3, maxLon: 7.4 },
	{ code: 'SH', minLat: 53.3, maxLat: 55.1, minLon: 8.4, maxLon: 11.4 },
	{ code: 'MV', minLat: 53.0, maxLat: 54.7, minLon: 10.5, maxLon: 14.5 },
	{ code: 'BB', minLat: 51.3, maxLat: 53.6, minLon: 11.2, maxLon: 14.8 },
	{ code: 'ST', minLat: 51.0, maxLat: 53.0, minLon: 10.5, maxLon: 13.3 },
	{ code: 'SN', minLat: 50.1, maxLat: 51.7, minLon: 11.8, maxLon: 15.1 },
	{ code: 'TH', minLat: 50.2, maxLat: 51.65, minLon: 9.8, maxLon: 12.7 },
	{ code: 'NI', minLat: 51.3, maxLat: 53.9, minLon: 6.6, maxLon: 11.6 },
	{ code: 'NW', minLat: 50.3, maxLat: 52.6, minLon: 5.8, maxLon: 9.5 },
	{ code: 'HE', minLat: 49.35, maxLat: 51.7, minLon: 7.7, maxLon: 10.3 },
	{ code: 'RP', minLat: 48.95, maxLat: 50.95, minLon: 6.1, maxLon: 8.5 },
	{ code: 'BW', minLat: 47.5, maxLat: 49.8, minLon: 7.5, maxLon: 10.5 },
	{ code: 'BY', minLat: 47.2, maxLat: 50.6, minLon: 8.9, maxLon: 13.9 }
];

export function resolveDeLand(options?: EuPermitLinkOptions): DeLandCode | null {
	const blob = hintBlob(options);
	for (const { code, re } of DE_LAND_MATCH) {
		if (re.test(blob)) return code;
	}
	const { latitude: lat, longitude: lon } = options ?? {};
	if (lat == null || lon == null) return null;
	for (const box of DE_LAND_BBOX) {
		if (lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon) {
			return box.code;
		}
	}
	return null;
}

/** Austrian Bundesland codes (ISO 3166-2 AT short forms). */
export type AtLandCode = 'W' | 'N' | 'O' | 'St' | 'S' | 'K' | 'T' | 'V' | 'B';

const AT_LAND_FORST: Record<AtLandCode, EuPermitLink> = {
	W: {
		id: 'at_land_w',
		label: 'Wien — Landesforstinspektion',
		url: 'https://www.wien.gv.at/umwelt/landesforstinspektion'
	},
	N: {
		id: 'at_land_n',
		label: 'NÖ — Landesforstdienst',
		url: 'https://www.noe.gv.at/noe/Forstwirtschaft/Landesforstdienst.html'
	},
	O: {
		id: 'at_land_o',
		label: 'Oberösterreich — Land',
		url: 'https://www.land-oberoesterreich.gv.at/'
	},
	St: {
		id: 'at_land_st',
		label: 'Steiermark — Agrar / Wald',
		url: 'https://www.agrar.steiermark.at/'
	},
	S: {
		id: 'at_land_s',
		label: 'Salzburg — Umwelt',
		url: 'https://www.salzburg.gv.at/themen/umwelt'
	},
	K: {
		id: 'at_land_k',
		label: 'Kärnten — Forstwirtschaft',
		url: 'https://www.ktn.gv.at/Themen-AZ/Details?thema=34&detail=718'
	},
	T: {
		id: 'at_land_t',
		label: 'Tirol — Forstorganisation',
		url: 'https://www.tirol.gv.at/umwelt/wald/forstorganisation/'
	},
	V: {
		id: 'at_land_v',
		label: 'Vorarlberg — geschützte Pflanzen',
		url: 'https://vorarlberg.at/-/geschuetzte-pflanzen-in-vorarlberg'
	},
	B: {
		id: 'at_land_b',
		label: 'Burgenland — Naturschutz',
		url: 'https://www.burgenland.at/themen/natur/naturschutz/'
	}
};

const AT_LAND_MATCH: Array<{ code: AtLandCode; re: RegExp }> = [
	{ code: 'W', re: /\bwien\b|\bvienna\b|AT-9|\bAT-W\b/i },
	{ code: 'V', re: /vorarlberg|AT-8|\bAT-V\b|bregenz|feldkirch|dornbirn/i },
	{ code: 'T', re: /\btirol\b|\btyrol\b|innsbruck|AT-7|\bAT-T\b/i },
	{ code: 'S', re: /salzburg|AT-5|\bAT-S\b/i },
	{ code: 'K', re: /k(?:ae|ä)rnten|carinthia|klagenfurt|AT-2|\bAT-K\b/i },
	{ code: 'St', re: /steiermark|styria|graz|AT-6|\bAT-ST\b/i },
	{ code: 'O', re: /ober(?:oe|ö)sterreich|upper austria|linz|AT-4|\bAT-O\b/i },
	{ code: 'B', re: /burgenland|eisenstadt|AT-1|\bAT-B\b/i },
	{ code: 'N', re: /nieder(?:oe|ö)sterreich|lower austria|AT-3|\bAT-N\b|sankt pölten|st\.?\s*pölten/i }
];

/** Wien first so it wins over surrounding Niederösterreich. */
const AT_LAND_BBOX: Array<{
	code: AtLandCode;
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}> = [
	{ code: 'W', minLat: 48.1, maxLat: 48.35, minLon: 16.18, maxLon: 16.6 },
	{ code: 'V', minLat: 46.85, maxLat: 47.6, minLon: 9.5, maxLon: 10.25 },
	{ code: 'T', minLat: 46.65, maxLat: 47.8, minLon: 10.1, maxLon: 12.95 },
	{ code: 'S', minLat: 46.9, maxLat: 48.05, minLon: 12.05, maxLon: 13.75 },
	{ code: 'K', minLat: 46.35, maxLat: 47.15, minLon: 12.7, maxLon: 15.15 },
	{ code: 'St', minLat: 46.6, maxLat: 47.85, minLon: 13.55, maxLon: 16.2 },
	{ code: 'O', minLat: 47.45, maxLat: 48.8, minLon: 12.7, maxLon: 15.0 },
	{ code: 'B', minLat: 46.85, maxLat: 48.15, minLon: 16.0, maxLon: 17.2 },
	{ code: 'N', minLat: 47.4, maxLat: 49.05, minLon: 14.4, maxLon: 17.1 }
];

export function resolveAtLand(options?: EuPermitLinkOptions): AtLandCode | null {
	const blob = hintBlob(options);
	for (const { code, re } of AT_LAND_MATCH) {
		if (re.test(blob)) return code;
	}
	const { latitude: lat, longitude: lon } = options ?? {};
	if (lat == null || lon == null) return null;
	for (const box of AT_LAND_BBOX) {
		if (lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon) {
			return box.code;
		}
	}
	return null;
}

/** Dutch province codes (ISO 3166-2 NL). */
export type NlProvinceCode =
	| 'DR'
	| 'FL'
	| 'FR'
	| 'GE'
	| 'GR'
	| 'LI'
	| 'NB'
	| 'NH'
	| 'OV'
	| 'UT'
	| 'ZH'
	| 'ZE';

const NL_PROVINCE_LINKS: Record<NlProvinceCode, EuPermitLink> = {
	NH: {
		id: 'nl_prov_nh',
		label: 'Noord-Holland — Natuur',
		url: 'https://www.noord-holland.nl/Onderwerpen/Natuur'
	},
	ZH: {
		id: 'nl_prov_zh',
		label: 'Zuid-Holland — Natuur & landschap',
		url: 'https://www.zuid-holland.nl/onderwerpen/natuur-landschap/'
	},
	UT: {
		id: 'nl_prov_ut',
		label: 'Utrecht — Natuur',
		url: 'https://www.provincie-utrecht.nl/onderwerpen/natuur'
	},
	GE: {
		id: 'nl_prov_ge',
		label: 'Gelderland — Natuur',
		url: 'https://www.gelderland.nl/natuur'
	},
	OV: {
		id: 'nl_prov_ov',
		label: 'Overijssel — Natuur & landschap',
		url: 'https://www.overijssel.nl/thema_s/natuur-en-landschap/'
	},
	FL: {
		id: 'nl_prov_fl',
		label: 'Flevoland — Natuur',
		url: 'https://www.flevoland.nl/loket/producten-en-diensten/natuur'
	},
	FR: {
		id: 'nl_prov_fr',
		label: 'Fryslân — Natuur',
		url: 'https://www.fryslan.frl/natuur'
	},
	GR: {
		id: 'nl_prov_gr',
		label: 'Groningen — Provincie',
		url: 'https://www.provinciegroningen.nl/'
	},
	DR: {
		id: 'nl_prov_dr',
		label: 'Drenthe — Provincie',
		url: 'https://www.provincie.drenthe.nl/'
	},
	NB: {
		id: 'nl_prov_nb',
		label: 'Noord-Brabant — Natuur & landschap',
		url: 'https://www.brabant.nl/onderwerpen/natuur-en-landschap'
	},
	LI: {
		id: 'nl_prov_li',
		label: 'Limburg — Provincie',
		url: 'https://www.limburg.nl/'
	},
	ZE: {
		id: 'nl_prov_ze',
		label: 'Zeeland — Natuur & landschap',
		url: 'https://www.zeeland.nl/onderwerpen/natuur-en-landschap'
	}
};

const NL_PROVINCE_MATCH: Array<{ code: NlProvinceCode; re: RegExp }> = [
	{ code: 'NH', re: /noord[- ]?holland|amsterdam|haarlem|NL-NH|\bNH\b/i },
	{ code: 'ZH', re: /zuid[- ]?holland|rotterdam|den haag|the hague|NL-ZH|\bZH\b/i },
	{ code: 'UT', re: /\butrecht\b|NL-UT/i },
	{ code: 'GE', re: /gelderland|arnhem|nijmegen|NL-GE/i },
	{ code: 'OV', re: /overijssel|zwolle|enschede|NL-OV/i },
	{ code: 'FL', re: /flevoland|lelystad|almere|NL-FL/i },
	{ code: 'FR', re: /frysl[aâ]n|friesland|leeuwarden|NL-FR/i },
	{ code: 'GR', re: /\bgroningen\b|NL-GR/i },
	{ code: 'DR', re: /\bdrenthe\b|assen|NL-DR/i },
	{ code: 'NB', re: /noord[- ]?brabant|\bbrabant\b|eindhoven|den bosch|'s-hertogenbosch|NL-NB/i },
	{ code: 'LI', re: /\blimburg\b|maastricht|NL-LI/i },
	{ code: 'ZE', re: /\bzeeland\b|middelburg|NL-ZE/i }
];

/** Smaller / distinctive provinces first where boxes overlap. */
const NL_PROVINCE_BBOX: Array<{
	code: NlProvinceCode;
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}> = [
	{ code: 'FL', minLat: 52.25, maxLat: 52.85, minLon: 5.15, maxLon: 5.95 },
	{ code: 'UT', minLat: 51.9, maxLat: 52.35, minLon: 4.85, maxLon: 5.65 },
	{ code: 'ZE', minLat: 51.2, maxLat: 51.8, minLon: 3.3, maxLon: 4.3 },
	{ code: 'LI', minLat: 50.75, maxLat: 51.8, minLon: 5.55, maxLon: 6.25 },
	{ code: 'GR', minLat: 53.05, maxLat: 53.55, minLon: 6.45, maxLon: 7.25 },
	{ code: 'FR', minLat: 52.85, maxLat: 53.55, minLon: 5.0, maxLon: 6.45 },
	{ code: 'DR', minLat: 52.6, maxLat: 53.2, minLon: 6.1, maxLon: 7.1 },
	{ code: 'OV', minLat: 52.1, maxLat: 52.85, minLon: 5.85, maxLon: 7.1 },
	{ code: 'GE', minLat: 51.75, maxLat: 52.55, minLon: 5.2, maxLon: 6.75 },
	{ code: 'NB', minLat: 51.25, maxLat: 51.85, minLon: 4.2, maxLon: 6.0 },
	{ code: 'NH', minLat: 52.15, maxLat: 53.2, minLon: 4.45, maxLon: 5.35 },
	{ code: 'ZH', minLat: 51.55, maxLat: 52.35, minLon: 3.85, maxLon: 5.15 }
];

export function resolveNlProvince(options?: EuPermitLinkOptions): NlProvinceCode | null {
	const blob = hintBlob(options);
	for (const { code, re } of NL_PROVINCE_MATCH) {
		if (re.test(blob)) return code;
	}
	const { latitude: lat, longitude: lon } = options ?? {};
	if (lat == null || lon == null) return null;
	for (const box of NL_PROVINCE_BBOX) {
		if (lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon) {
			return box.code;
		}
	}
	return null;
}

/** Swedish län letter codes (ISO 3166-2 SE). */
export type SeLanCode =
	| 'AB'
	| 'C'
	| 'D'
	| 'E'
	| 'F'
	| 'G'
	| 'H'
	| 'I'
	| 'K'
	| 'M'
	| 'N'
	| 'O'
	| 'S'
	| 'T'
	| 'U'
	| 'W'
	| 'X'
	| 'Y'
	| 'Z'
	| 'AC'
	| 'BD';

const SE_LAN_LINKS: Record<SeLanCode, EuPermitLink> = {
	AB: {
		id: 'se_lan_ab',
		label: 'Länsstyrelsen Stockholm',
		url: 'https://www.lansstyrelsen.se/stockholm/'
	},
	C: {
		id: 'se_lan_c',
		label: 'Länsstyrelsen Uppsala',
		url: 'https://www.lansstyrelsen.se/uppsala/'
	},
	D: {
		id: 'se_lan_d',
		label: 'Länsstyrelsen Södermanland',
		url: 'https://www.lansstyrelsen.se/sodermanland/'
	},
	E: {
		id: 'se_lan_e',
		label: 'Länsstyrelsen Östergötland',
		url: 'https://www.lansstyrelsen.se/ostergotland/'
	},
	F: {
		id: 'se_lan_f',
		label: 'Länsstyrelsen Jönköping',
		url: 'https://www.lansstyrelsen.se/jonkoping/'
	},
	G: {
		id: 'se_lan_g',
		label: 'Länsstyrelsen Kronoberg',
		url: 'https://www.lansstyrelsen.se/kronoberg/'
	},
	H: {
		id: 'se_lan_h',
		label: 'Länsstyrelsen Kalmar',
		url: 'https://www.lansstyrelsen.se/kalmar/'
	},
	I: {
		id: 'se_lan_i',
		label: 'Länsstyrelsen Gotland',
		url: 'https://www.lansstyrelsen.se/gotland/'
	},
	K: {
		id: 'se_lan_k',
		label: 'Länsstyrelsen Blekinge',
		url: 'https://www.lansstyrelsen.se/blekinge/'
	},
	M: {
		id: 'se_lan_m',
		label: 'Länsstyrelsen Skåne',
		url: 'https://www.lansstyrelsen.se/skane/'
	},
	N: {
		id: 'se_lan_n',
		label: 'Länsstyrelsen Halland',
		url: 'https://www.lansstyrelsen.se/halland/'
	},
	O: {
		id: 'se_lan_o',
		label: 'Länsstyrelsen Västra Götaland',
		url: 'https://www.lansstyrelsen.se/vastra-gotaland/'
	},
	S: {
		id: 'se_lan_s',
		label: 'Länsstyrelsen Värmland',
		url: 'https://www.lansstyrelsen.se/varmland/'
	},
	T: {
		id: 'se_lan_t',
		label: 'Länsstyrelsen Örebro',
		url: 'https://www.lansstyrelsen.se/orebro/'
	},
	U: {
		id: 'se_lan_u',
		label: 'Länsstyrelsen Västmanland',
		url: 'https://www.lansstyrelsen.se/vastmanland/'
	},
	W: {
		id: 'se_lan_w',
		label: 'Länsstyrelsen Dalarna',
		url: 'https://www.lansstyrelsen.se/dalarna/'
	},
	X: {
		id: 'se_lan_x',
		label: 'Länsstyrelsen Gävleborg',
		url: 'https://www.lansstyrelsen.se/gavleborg/'
	},
	Y: {
		id: 'se_lan_y',
		label: 'Länsstyrelsen Västernorrland',
		url: 'https://www.lansstyrelsen.se/vasternorrland/'
	},
	Z: {
		id: 'se_lan_z',
		label: 'Länsstyrelsen Jämtland',
		url: 'https://www.lansstyrelsen.se/jamtland/'
	},
	AC: {
		id: 'se_lan_ac',
		label: 'Länsstyrelsen Västerbotten',
		url: 'https://www.lansstyrelsen.se/vasterbotten/'
	},
	BD: {
		id: 'se_lan_bd',
		label: 'Länsstyrelsen Norrbotten',
		url: 'https://www.lansstyrelsen.se/norrbotten/'
	}
};

const SE_LAN_MATCH: Array<{ code: SeLanCode; re: RegExp }> = [
	{ code: 'AB', re: /stockholm|SE-AB|\bAB\b/i },
	{ code: 'I', re: /gotland|visby|SE-I\b/i },
	{ code: 'M', re: /sk[aå]ne|malm[oö]|SE-M\b/i },
	{ code: 'O', re: /v[aä]stra\s*g[oö]taland|g[oö]teborg|gothenburg|SE-O\b/i },
	{ code: 'AC', re: /v[aä]sterbotten|ume[aå]|SE-AC/i },
	{ code: 'BD', re: /norrbotten|lule[aå]|SE-BD/i },
	{ code: 'C', re: /uppsala|SE-C\b/i },
	{ code: 'D', re: /s[oö]dermanland|SE-D\b/i },
	{ code: 'E', re: /[oö]sterg[oö]tland|link[oö]ping|SE-E\b/i },
	{ code: 'F', re: /j[oö]nk[oö]ping|SE-F\b/i },
	{ code: 'G', re: /kronoberg|v[aä]xj[oö]|SE-G\b/i },
	{ code: 'H', re: /\bkalmar\b|SE-H\b/i },
	{ code: 'K', re: /blekinge|karlskrona|SE-K\b/i },
	{ code: 'N', re: /\bhalland\b|halmstad|SE-N\b/i },
	{ code: 'S', re: /v[aä]rmland|karlstad|SE-S\b/i },
	{ code: 'T', re: /[oö]rebro|SE-T\b/i },
	{ code: 'U', re: /v[aä]stmanland|v[aä]ster[aå]s|SE-U\b/i },
	{ code: 'W', re: /\bdalarna\b|falun|SE-W\b/i },
	{ code: 'X', re: /g[aä]vleborg|g[aä]vle|SE-X\b/i },
	{ code: 'Y', re: /v[aä]sternorrland|sundsvall|SE-Y\b/i },
	{ code: 'Z', re: /j[aä]mtland|[oö]stersund|SE-Z\b/i }
];

/** Distinctive / small län first so they win over neighbours. */
const SE_LAN_BBOX: Array<{
	code: SeLanCode;
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}> = [
	{ code: 'I', minLat: 56.85, maxLat: 58.05, minLon: 17.9, maxLon: 19.6 },
	{ code: 'AB', minLat: 58.85, maxLat: 60.05, minLon: 17.3, maxLon: 19.3 },
	{ code: 'M', minLat: 55.3, maxLat: 56.55, minLon: 12.5, maxLon: 14.55 },
	{ code: 'K', minLat: 56.0, maxLat: 56.45, minLon: 14.5, maxLon: 16.0 },
	{ code: 'N', minLat: 56.3, maxLat: 57.55, minLon: 11.9, maxLon: 13.5 },
	{ code: 'O', minLat: 57.3, maxLat: 59.3, minLon: 11.0, maxLon: 14.5 },
	{ code: 'C', minLat: 59.5, maxLat: 60.7, minLon: 16.8, maxLon: 18.6 },
	{ code: 'D', minLat: 58.7, maxLat: 59.6, minLon: 15.8, maxLon: 17.6 },
	{ code: 'E', minLat: 57.7, maxLat: 58.9, minLon: 14.7, maxLon: 16.9 },
	{ code: 'F', minLat: 57.0, maxLat: 58.1, minLon: 13.4, maxLon: 15.5 },
	{ code: 'G', minLat: 56.5, maxLat: 57.3, minLon: 13.5, maxLon: 15.5 },
	{ code: 'H', minLat: 56.2, maxLat: 58.1, minLon: 15.4, maxLon: 17.2 },
	{ code: 'T', minLat: 58.7, maxLat: 60.0, minLon: 14.3, maxLon: 15.9 },
	{ code: 'U', minLat: 59.3, maxLat: 60.3, minLon: 15.5, maxLon: 17.0 },
	{ code: 'S', minLat: 58.7, maxLat: 61.1, minLon: 11.9, maxLon: 14.5 },
	{ code: 'W', minLat: 60.0, maxLat: 62.3, minLon: 12.8, maxLon: 16.0 },
	{ code: 'X', minLat: 60.1, maxLat: 62.3, minLon: 14.8, maxLon: 17.8 },
	{ code: 'Y', minLat: 62.0, maxLat: 64.0, minLon: 15.5, maxLon: 19.2 },
	{ code: 'Z', minLat: 61.5, maxLat: 65.1, minLon: 12.0, maxLon: 16.0 },
	{ code: 'AC', minLat: 63.5, maxLat: 66.4, minLon: 14.5, maxLon: 22.0 },
	{ code: 'BD', minLat: 65.0, maxLat: 69.1, minLon: 16.0, maxLon: 24.2 }
];

export function resolveSeLan(options?: EuPermitLinkOptions): SeLanCode | null {
	const blob = hintBlob(options);
	for (const { code, re } of SE_LAN_MATCH) {
		if (re.test(blob)) return code;
	}
	const { latitude: lat, longitude: lon } = options ?? {};
	if (lat == null || lon == null) return null;
	for (const box of SE_LAN_BBOX) {
		if (lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon) {
			return box.code;
		}
	}
	return null;
}

/** Statsforvalteren embeter (post-reform regional offices). */
export type NoStatsforvalterCode =
	| 'OV'
	| 'IN'
	| 'VT'
	| 'AG'
	| 'RO'
	| 'VL'
	| 'MR'
	| 'TR'
	| 'ND'
	| 'TF';

const NO_STATSFORVALTER_LINKS: Record<NoStatsforvalterCode, EuPermitLink> = {
	OV: {
		id: 'no_sf_ov',
		label: 'Statsforvalteren Oslo og Viken',
		url: 'https://www.statsforvalteren.no/ov/'
	},
	IN: {
		id: 'no_sf_in',
		label: 'Statsforvalteren Innlandet',
		url: 'https://www.statsforvalteren.no/innlandet/'
	},
	VT: {
		id: 'no_sf_vt',
		label: 'Statsforvalteren Vestfold og Telemark',
		url: 'https://www.statsforvalteren.no/vestfold-og-telemark/'
	},
	AG: {
		id: 'no_sf_ag',
		label: 'Statsforvalteren Agder',
		url: 'https://www.statsforvalteren.no/agder/'
	},
	RO: {
		id: 'no_sf_ro',
		label: 'Statsforvalteren Rogaland',
		url: 'https://www.statsforvalteren.no/rogaland/'
	},
	VL: {
		id: 'no_sf_vl',
		label: 'Statsforvalteren Vestland',
		url: 'https://www.statsforvalteren.no/vestland/'
	},
	MR: {
		id: 'no_sf_mr',
		label: 'Statsforvalteren Møre og Romsdal',
		url: 'https://www.statsforvalteren.no/more-og-romsdal/'
	},
	TR: {
		id: 'no_sf_tr',
		label: 'Statsforvalteren Trøndelag',
		url: 'https://www.statsforvalteren.no/trondelag/'
	},
	ND: {
		id: 'no_sf_nd',
		label: 'Statsforvalteren Nordland',
		url: 'https://www.statsforvalteren.no/nordland/'
	},
	TF: {
		id: 'no_sf_tf',
		label: 'Statsforvalteren Troms og Finnmark',
		url: 'https://www.statsforvalteren.no/troms-finnmark/'
	}
};

const NO_STATSFORVALTER_MATCH: Array<{ code: NoStatsforvalterCode; re: RegExp }> = [
	{ code: 'OV', re: /oslo|viken|b[aæ]rum|drammen|fredrikstad/i },
	{ code: 'IN', re: /innlandet|lillehammer|gj[oø]vik|hamar|heds?mark|oppland/i },
	{ code: 'VT', re: /vestfold|telemark|skien|t[oø]nsberg|porsgrunn/i },
	{ code: 'AG', re: /\bagder\b|kristiansand|arendal/i },
	{ code: 'RO', re: /rogaland|stavanger|sandnes/i },
	{ code: 'VL', re: /vestland|bergen|hordaland|sogn|fjordane/i },
	{ code: 'MR', re: /m[oø]re|romsdal|[aå]lesund|molde/i },
	{ code: 'TR', re: /tr[oø]ndelag|trondheim/i },
	{ code: 'ND', re: /nordland|bod[oø]|narvik/i },
	{ code: 'TF', re: /troms|finnmark|troms[oø]|alta|kirkenes/i }
];

const NO_STATSFORVALTER_BBOX: Array<{
	code: NoStatsforvalterCode;
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}> = [
	{ code: 'OV', minLat: 58.7, maxLat: 60.9, minLon: 9.5, maxLon: 12.0 },
	{ code: 'VT', minLat: 58.7, maxLat: 59.9, minLon: 7.8, maxLon: 10.6 },
	{ code: 'AG', minLat: 57.9, maxLat: 59.3, minLon: 6.5, maxLon: 9.3 },
	{ code: 'RO', minLat: 58.3, maxLat: 59.7, minLon: 4.8, maxLon: 7.0 },
	{ code: 'VL', minLat: 59.5, maxLat: 62.3, minLon: 4.5, maxLon: 8.5 },
	{ code: 'MR', minLat: 61.8, maxLat: 63.5, minLon: 5.0, maxLon: 9.5 },
	{ code: 'IN', minLat: 60.0, maxLat: 62.7, minLon: 8.5, maxLon: 12.5 },
	{ code: 'TR', minLat: 62.5, maxLat: 65.5, minLon: 9.0, maxLon: 14.5 },
	{ code: 'ND', minLat: 65.0, maxLat: 69.3, minLon: 11.5, maxLon: 18.5 },
	{ code: 'TF', minLat: 68.5, maxLat: 71.4, minLon: 16.0, maxLon: 31.5 }
];

export function resolveNoStatsforvalter(
	options?: EuPermitLinkOptions
): NoStatsforvalterCode | null {
	const blob = hintBlob(options);
	for (const { code, re } of NO_STATSFORVALTER_MATCH) {
		if (re.test(blob)) return code;
	}
	const { latitude: lat, longitude: lon } = options ?? {};
	if (lat == null || lon == null) return null;
	for (const box of NO_STATSFORVALTER_BBOX) {
		if (lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon) {
			return box.code;
		}
	}
	return null;
}

type EsCcaa =
	| 'and'
	| 'cat'
	| 'mad'
	| 'val'
	| 'gal'
	| 'pvas'
	| 'ara'
	| 'cyl'
	| 'clm'
	| 'ext'
	| 'ast'
	| 'cb'
	| 'mur'
	| 'nav'
	| 'rio'
	| 'bal'
	| 'cn';

const ES_CCAA_LINKS: Record<EsCcaa, EuPermitLink> = {
	and: {
		id: 'es_ccaa_and',
		label: 'Andalucía — medio ambiente',
		url: 'https://www.juntadeandalucia.es/medioambiente/'
	},
	cat: {
		id: 'es_ccaa_cat',
		label: 'Catalunya — medi ambient',
		url: 'https://mediambient.gencat.cat/'
	},
	mad: {
		id: 'es_ccaa_mad',
		label: 'Comunidad de Madrid — medio ambiente',
		url: 'https://www.comunidad.madrid/servicios/urbanismo-medio-ambiente'
	},
	val: {
		id: 'es_ccaa_val',
		label: 'Generalitat Valenciana — agroambient',
		url: 'https://agroambient.gva.es/'
	},
	gal: {
		id: 'es_ccaa_gal',
		label: 'Xunta — medio ambiente',
		url: 'https://cma.xunta.gal/'
	},
	pvas: {
		id: 'es_ccaa_pvas',
		label: 'Euskadi — medio ambiente',
		url: 'https://www.euskadi.eus/medio-ambiente/'
	},
	ara: {
		id: 'es_ccaa_ara',
		label: 'Aragón — medio ambiente',
		url: 'https://www.aragon.es/temas/medio-ambiente'
	},
	cyl: {
		id: 'es_ccaa_cyl',
		label: 'Castilla y León — medio ambiente',
		url: 'https://medioambiente.jcyl.es/'
	},
	clm: {
		id: 'es_ccaa_clm',
		label: 'Castilla-La Mancha — medio ambiente',
		url: 'https://www.castillalamancha.es/'
	},
	ext: {
		id: 'es_ccaa_ext',
		label: 'Extremadura — medio ambiente',
		url: 'https://www.juntaex.es/temas/medio-ambiente'
	},
	ast: {
		id: 'es_ccaa_ast',
		label: 'Asturias — medio ambiente',
		url: 'https://medioambiente.asturias.es/'
	},
	cb: {
		id: 'es_ccaa_cb',
		label: 'Cantabria — medio ambiente',
		url: 'https://www.cantabria.es/medio-ambiente'
	},
	mur: {
		id: 'es_ccaa_mur',
		label: 'Región de Murcia — medio ambiente',
		url: 'https://www.carm.es/'
	},
	nav: {
		id: 'es_ccaa_nav',
		label: 'Navarra — medio ambiente',
		url: 'https://www.navarra.es/es/medio-ambiente'
	},
	rio: {
		id: 'es_ccaa_rio',
		label: 'La Rioja — medio ambiente',
		url: 'https://www.larioja.org/medio-ambiente/es'
	},
	bal: {
		id: 'es_ccaa_bal',
		label: 'Illes Balears — medi ambient',
		url: 'https://www.caib.es/sites/mediambient/'
	},
	cn: {
		id: 'es_ccaa_cn',
		label: 'Canarias — medio ambiente',
		url: 'https://www.gobiernodecanarias.org/medioambiente/'
	}
};

const ES_CCAA_MATCH: Array<{ code: EsCcaa; re: RegExp }> = [
	{ code: 'and', re: /andaluc|sevilla|m[aá]laga|granada|c[oó]rdoba|ES-AN/i },
	{ code: 'cat', re: /catalu|barcelona|girona|tarragona|lleida|ES-CT/i },
	{ code: 'mad', re: /madrid|ES-MD/i },
	{ code: 'val', re: /valenci|alicante|castell[oó]n|ES-VC/i },
	{ code: 'gal', re: /galicia|a coru[nñ]a|pontevedra|lugo|ourense|ES-GA/i },
	{ code: 'pvas', re: /euskadi|pa[ií]s vasco|bizkaia|gipuzkoa|araba|ES-PV/i },
	{ code: 'ara', re: /arag[oó]n|zaragoza|huesca|teruel|ES-AR/i },
	{ code: 'cyl', re: /castilla y le[oó]n|valladolid|le[oó]n|burgos|ES-CL/i },
	{ code: 'clm', re: /castilla[- ]?la mancha|toledo|albacete|ES-CM/i },
	{ code: 'ext', re: /extremadura|badajoz|c[aá]ceres|ES-EX/i },
	{ code: 'ast', re: /asturias|oviedo|gij[oó]n|ES-AS/i },
	{ code: 'cb', re: /cantabria|santander|ES-CB/i },
	{ code: 'mur', re: /murcia|ES-MC/i },
	{ code: 'nav', re: /navarra|nafarroa|pamplona|iruña|ES-NC/i },
	{ code: 'rio', re: /la rioja|logro[nñ]o|ES-RI/i },
	{ code: 'bal', re: /baleares|balears|mallorca|menorca|ibiza|eivissa|ES-IB/i },
	{ code: 'cn', re: /canarias|tenerife|gran canaria|las palmas|ES-CN/i }
];

export function resolveEsCcaa(options?: EuPermitLinkOptions): EsCcaa | null {
	const blob = hintBlob(options);
	for (const { code, re } of ES_CCAA_MATCH) {
		if (re.test(blob)) return code;
	}
	return null;
}

type ItRegione =
	| 'vda'
	| 'pie'
	| 'lom'
	| 'taa'
	| 'ven'
	| 'fri'
	| 'lig'
	| 'emr'
	| 'tos'
	| 'umb'
	| 'mar'
	| 'laz'
	| 'abr'
	| 'mol'
	| 'cam'
	| 'pug'
	| 'bas'
	| 'cal'
	| 'sic'
	| 'sar';

const IT_REGIONE_LINKS: Record<ItRegione, EuPermitLink> = {
	vda: {
		id: 'it_reg_vda',
		label: 'Valle d’Aosta — ambiente',
		url: 'https://www.regione.vda.it/ambiente/'
	},
	pie: {
		id: 'it_reg_pie',
		label: 'Piemonte — ambiente',
		url: 'https://www.regione.piemonte.it/web/temi/ambiente-territorio'
	},
	lom: {
		id: 'it_reg_lom',
		label: 'Lombardia — ambiente',
		url: 'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/DettaglioRedazionale/servizi-e-informazioni/cittadini/Ambiente'
	},
	taa: {
		id: 'it_reg_taa',
		label: 'Trentino-Alto Adige — ambiente',
		url: 'https://www.regione.taa.it/'
	},
	ven: {
		id: 'it_reg_ven',
		label: 'Veneto — ambiente',
		url: 'https://www.regione.veneto.it/web/ambiente-e-territorio'
	},
	fri: {
		id: 'it_reg_fri',
		label: 'Friuli-Venezia Giulia — ambiente',
		url: 'https://www.regione.fvg.it/rafvg/cms/RAFVG/ambiente-territorio/'
	},
	lig: {
		id: 'it_reg_lig',
		label: 'Liguria — ambiente',
		url: 'https://www.regione.liguria.it/homepage/ambiente.html'
	},
	emr: {
		id: 'it_reg_emr',
		label: 'Emilia-Romagna — ambiente',
		url: 'https://www.regione.emilia-romagna.it/'
	},
	tos: {
		id: 'it_reg_tos',
		label: 'Toscana — ambiente',
		url: 'https://www.regione.toscana.it/ambiente'
	},
	umb: {
		id: 'it_reg_umb',
		label: 'Umbria — ambiente',
		url: 'https://www.regione.umbria.it/ambiente'
	},
	mar: {
		id: 'it_reg_mar',
		label: 'Marche — ambiente',
		url: 'https://www.regione.marche.it/Regione-Utile/Ambiente'
	},
	laz: {
		id: 'it_reg_laz',
		label: 'Lazio — aree naturali protette',
		url: 'https://www.parchilazio.it/'
	},
	abr: {
		id: 'it_reg_abr',
		label: 'Abruzzo — ambiente',
		url: 'https://www.regione.abruzzo.it/contenuti/ambiente'
	},
	mol: {
		id: 'it_reg_mol',
		label: 'Molise — ambiente',
		url: 'https://www.regione.molise.it/'
	},
	cam: {
		id: 'it_reg_cam',
		label: 'Campania — ambiente',
		url: 'https://www.regione.campania.it/'
	},
	pug: {
		id: 'it_reg_pug',
		label: 'Puglia — ambiente',
		url: 'https://www.regione.puglia.it/web/ambiente'
	},
	bas: {
		id: 'it_reg_bas',
		label: 'Basilicata — ambiente',
		url: 'https://www.regione.basilicata.it/'
	},
	cal: {
		id: 'it_reg_cal',
		label: 'Calabria — ambiente',
		url: 'https://www.regione.calabria.it/'
	},
	sic: {
		id: 'it_reg_sic',
		label: 'Sicilia — territorio e ambiente',
		url: 'https://www.regione.sicilia.it/istituzioni/regione/strutture-regionali/assessorato-territorio-ambiente'
	},
	sar: {
		id: 'it_reg_sar',
		label: 'Sardegna — ambiente',
		url: 'https://www.regione.sardegna.it/argomenti/ambiente/'
	}
};

const IT_REGIONE_MATCH: Array<{ code: ItRegione; re: RegExp }> = [
	{ code: 'vda', re: /valle d['’]?aosta|aosta|IT-23/i },
	{ code: 'pie', re: /piemonte|torino|cuneo|IT-21/i },
	{ code: 'lom', re: /lombardia|milano|bergamo|brescia|IT-25/i },
	{ code: 'taa', re: /trentino|alto adige|s[uü]dtirol|bolzano|bozen|trento|IT-32/i },
	{ code: 'ven', re: /veneto|venezia|verona|padova|IT-34/i },
	{ code: 'fri', re: /friuli|trieste|udine|IT-36/i },
	{ code: 'lig', re: /liguria|genova|IT-42/i },
	{ code: 'emr', re: /emilia[- ]?romagna|bologna|modena|IT-45/i },
	{ code: 'tos', re: /toscana|firenze|siena|IT-52/i },
	{ code: 'umb', re: /umbria|perugia|IT-55/i },
	{ code: 'mar', re: /marche|ancona|IT-57/i },
	{ code: 'laz', re: /lazio|roma|rome|IT-62/i },
	{ code: 'abr', re: /abruzzo|l['’]?aquila|pescara|IT-65/i },
	{ code: 'mol', re: /molise|campobasso|IT-67/i },
	{ code: 'cam', re: /campania|napoli|naples|salerno|IT-72/i },
	{ code: 'pug', re: /puglia|bari|lecce|IT-75/i },
	{ code: 'bas', re: /basilicata|potenza|matera|pollino|IT-77/i },
	{ code: 'cal', re: /calabria|cosenza|reggio calabria|IT-78/i },
	{ code: 'sic', re: /sicilia|palermo|catania|madonie|IT-82/i },
	{ code: 'sar', re: /sardegna|cagliari|sassari|IT-88/i }
];

export function resolveItRegione(options?: EuPermitLinkOptions): ItRegione | null {
	const blob = hintBlob(options);
	for (const { code, re } of IT_REGIONE_MATCH) {
		if (re.test(blob)) return code;
	}
	return null;
}

const CH_CANTON_LINKS: Record<SwissCantonCode, EuPermitLink> = {
	ZH: {
		id: 'ch_canton_zh',
		label: 'Zürich — Umwelt',
		url: 'https://www.zh.ch/de/umwelt-tiere.html'
	},
	BE: {
		id: 'ch_canton_be',
		label: 'Bern — Umwelt',
		url: 'https://www.be.ch/umwelt'
	},
	LU: {
		id: 'ch_canton_lu',
		label: 'Luzern — Umwelt',
		url: 'https://umwelt.lu.ch/'
	},
	UR: {
		id: 'ch_canton_ur',
		label: 'Uri — Umwelt',
		url: 'https://www.ur.ch/'
	},
	SZ: {
		id: 'ch_canton_sz',
		label: 'Schwyz — Umwelt',
		url: 'https://www.sz.ch/umwelt'
	},
	OW: {
		id: 'ch_canton_ow',
		label: 'Obwalden — Umwelt',
		url: 'https://www.ow.ch/'
	},
	NW: {
		id: 'ch_canton_nw',
		label: 'Nidwalden — Umwelt',
		url: 'https://www.nw.ch/umwelt'
	},
	GL: {
		id: 'ch_canton_gl',
		label: 'Glarus — Kanton',
		url: 'https://www.gl.ch/'
	},
	ZG: {
		id: 'ch_canton_zg',
		label: 'Zug — Amt für Umwelt',
		url: 'https://zg.ch/de/baudirektion/amt-fuer-umwelt'
	},
	FR: {
		id: 'ch_canton_fr',
		label: 'Fribourg — SEN',
		url: 'https://www.fr.ch/sen'
	},
	SO: {
		id: 'ch_canton_so',
		label: 'Solothurn — Amt für Umwelt',
		url: 'https://so.ch/verwaltung/bau-und-justizdepartement/amt-fuer-umwelt/'
	},
	BS: {
		id: 'ch_canton_bs',
		label: 'Basel-Stadt — AUE',
		url: 'https://www.aue.bs.ch/'
	},
	BL: {
		id: 'ch_canton_bl',
		label: 'Basel-Landschaft — BUD',
		url: 'https://www.baselland.ch/politik-und-behorden/direktionen/bau-und-umweltschutzdirektion'
	},
	SH: {
		id: 'ch_canton_sh',
		label: 'Schaffhausen — BUD',
		url: 'https://sh.ch/'
	},
	AR: {
		id: 'ch_canton_ar',
		label: 'Appenzell Ausserrhoden — Umwelt',
		url: 'https://www.ar.ch/verwaltung/departement-bau-und-volkswirtschaft/amt-fuer-umwelt/'
	},
	AI: {
		id: 'ch_canton_ai',
		label: 'Appenzell Innerrhoden — Natur & Umwelt',
		url: 'https://www.ai.ch/themen/natur-umwelt'
	},
	SG: {
		id: 'ch_canton_sg',
		label: 'St. Gallen — Umwelt',
		url: 'https://www.sg.ch/umwelt-natur/umwelt.html'
	},
	GR: {
		id: 'ch_canton_gr',
		label: 'Graubünden — ANU',
		url: 'https://www.anu.gr.ch/'
	},
	AG: {
		id: 'ch_canton_ag',
		label: 'Aargau — Umwelt',
		url: 'https://www.ag.ch/umwelt'
	},
	TG: {
		id: 'ch_canton_tg',
		label: 'Thurgau — Umwelt',
		url: 'https://umwelt.tg.ch/'
	},
	TI: {
		id: 'ch_canton_ti',
		label: 'Ticino — SPAAS',
		url: 'https://www4.ti.ch/dt/da/spaas/'
	},
	VD: {
		id: 'ch_canton_vd',
		label: 'Vaud — environnement',
		url: 'https://www.vd.ch/themes/environnement'
	},
	VS: {
		id: 'ch_canton_vs',
		label: 'Valais — SEN',
		url: 'https://www.vs.ch/web/sen'
	},
	NE: {
		id: 'ch_canton_ne',
		label: 'Neuchâtel — SENE',
		url: 'https://www.ne.ch/autorites/DDTE/SENE'
	},
	GE: {
		id: 'ch_canton_ge',
		label: 'Genève — OCEV',
		url: 'https://www.ge.ch/organisation/office-cantonal-environnement'
	},
	JU: {
		id: 'ch_canton_ju',
		label: 'Jura — autorités',
		url: 'https://www.jura.ch/fr/Autorites.html'
	}
};

const CH_CANTON_MATCH: Array<{ code: SwissCantonCode; re: RegExp }> = [
	{ code: 'ZH', re: /z[uü]rich|zurich|CH-ZH/i },
	{ code: 'BE', re: /\bbern\b|\bberne\b|CH-BE/i },
	{ code: 'LU', re: /luzern|lucerne|CH-LU/i },
	{ code: 'UR', re: /\buri\b|CH-UR/i },
	{ code: 'SZ', re: /schwyz|CH-SZ/i },
	{ code: 'OW', re: /obwalden|CH-OW/i },
	{ code: 'NW', re: /nidwalden|CH-NW/i },
	{ code: 'GL', re: /glarus|CH-GL/i },
	{ code: 'ZG', re: /\bzug\b|CH-ZG/i },
	{ code: 'FR', re: /fribourg|freiburg|CH-FR/i },
	{ code: 'SO', re: /solothurn|soleure|CH-SO/i },
	{ code: 'BS', re: /basel[- ]?stadt|b[aâ]le[- ]?ville|CH-BS/i },
	{ code: 'BL', re: /basel[- ]?land|b[aâ]le[- ]?campagne|CH-BL/i },
	{ code: 'SH', re: /schaffhausen|CH-SH/i },
	{ code: 'AR', re: /appenzell[- ]?ausser|appenzell rhodes[- ]?ext|CH-AR/i },
	{ code: 'AI', re: /appenzell[- ]?inner|appenzell rhodes[- ]?int|CH-AI/i },
	{ code: 'SG', re: /st\.?\s*gallen|saint[- ]?gall|CH-SG/i },
	{ code: 'GR', re: /graub[uü]nden|grisons|CH-GR/i },
	{ code: 'AG', re: /aargau|argovie|CH-AG/i },
	{ code: 'TG', re: /thurgau|thurgovie|CH-TG/i },
	{ code: 'TI', re: /ticino|tessin|CH-TI/i },
	{ code: 'VD', re: /\bvaud\b|lausanne|CH-VD/i },
	{ code: 'VS', re: /valais|wallis|CH-VS/i },
	{ code: 'NE', re: /neuch[aâ]tel|CH-NE/i },
	{ code: 'GE', re: /gen[eè]ve|geneva|genf|CH-GE/i },
	{ code: 'JU', re: /\bjura\b|CH-JU/i }
];

/** Resolve Swiss canton from cadastre / commune hints (sync; GPS uses resolveSwissCanton). */
export function resolveChCanton(options?: EuPermitLinkOptions): SwissCantonCode | null {
	const blob = hintBlob(options);
	const parsed = parseSwissCantonCode(blob);
	if (parsed) return parsed;
	for (const { code, re } of CH_CANTON_MATCH) {
		if (re.test(blob)) return code;
	}
	return null;
}

function gbNationLinks(
	nation: GbNation | null,
	kind: 'forest' | 'private' | 'other'
): EuPermitLink[] {
	const forestry: EuPermitLink = {
		id: 'gb_forestry',
		label: 'Forestry Commission (England)',
		url: 'https://www.gov.uk/guidance/tree-felling-licence-when-you-need-to-apply'
	};
	const naturalEngland: EuPermitLink = {
		id: 'gb_natural_england',
		label: 'Natural England',
		url: 'https://www.gov.uk/guidance/wildlife-licences'
	};
	const natureScot: EuPermitLink = {
		id: 'gb_naturescot',
		label: 'NatureScot',
		url: 'https://www.nature.scot/professional-advice/protected-areas-and-species/licensing/species-licensing-z-guide/plants-and-fungi-and-licensing'
	};
	const nrw: EuPermitLink = {
		id: 'gb_nrw',
		label: 'Natural Resources Wales',
		url: 'https://naturalresources.wales/guidance-and-advice/environmental-topics/wildlife-and-biodiversity/protected-species-licensing/'
	};
	const forestryScotland: EuPermitLink = {
		id: 'gb_forestry_scotland',
		label: 'Scottish Forestry',
		url: 'https://forestry.gov.scot/support-regulations/felling-permissions'
	};
	const daera: EuPermitLink = {
		id: 'gb_daera',
		label: 'DAERA / NIEA (Northern Ireland)',
		url: 'https://www.daera-ni.gov.uk/articles/wildlife-licensing'
	};
	const localCouncil: EuPermitLink = {
		id: 'gb_local_council',
		label: 'Find your local council (GOV.UK)',
		url: 'https://www.gov.uk/find-local-council'
	};
	const hmlr: EuPermitLink = {
		id: 'gb_hmlr',
		label: 'HM Land Registry — search property',
		url: 'https://www.gov.uk/search-property-information-land-registry'
	};
	const ros: EuPermitLink = {
		id: 'gb_ros',
		label: 'Registers of Scotland',
		url: 'https://www.ros.gov.uk/'
	};
	const lrni: EuPermitLink = {
		id: 'gb_lrni',
		label: 'Land Registry NI',
		url: 'https://www.finance-ni.gov.uk/topics/land-registration'
	};

	if (nation === 'scotland') {
		if (kind === 'forest') {
			return [forestryScotland, natureScot, naturalEngland, forestry, nrw, daera];
		}
		if (kind === 'private') {
			return [localCouncil, ros, natureScot, forestryScotland, naturalEngland, nrw, daera, forestry];
		}
		return [natureScot, forestryScotland, naturalEngland, nrw, daera, forestry];
	}
	if (nation === 'wales') {
		if (kind === 'forest') {
			return [nrw, forestry, naturalEngland, natureScot, forestryScotland, daera];
		}
		if (kind === 'private') {
			return [localCouncil, hmlr, nrw, naturalEngland, natureScot, daera, forestry];
		}
		return [nrw, naturalEngland, natureScot, daera, forestry];
	}
	if (nation === 'ni') {
		if (kind === 'forest') {
			return [daera, forestry, naturalEngland, natureScot, nrw, forestryScotland];
		}
		if (kind === 'private') {
			return [localCouncil, lrni, daera, naturalEngland, natureScot, nrw, forestry];
		}
		return [daera, naturalEngland, natureScot, nrw, forestry];
	}
	// England or unknown — England hubs first, keep all nations as fallbacks
	if (kind === 'forest') {
		return [forestry, naturalEngland, forestryScotland, natureScot, nrw, daera];
	}
	if (kind === 'private') {
		return [localCouncil, hmlr, naturalEngland, natureScot, nrw, daera, forestry];
	}
	return [naturalEngland, natureScot, nrw, daera, forestry];
}

/**
 * Starting points for EU/CH authorization workflows (not permits themselves).
 * Mirrors the US/CA/NZ permit-link pattern for priority countries.
 * Optional region hints reorder / inject Land or CCAA portals when known.
 */
export function getEuPermitLinks(
	country: CountryCode | null,
	zoneType: CadastreZoneType,
	options?: EuPermitLinkOptions
): EuPermitLink[] {
	if (!country) return [];
	const kind = forestOrPrivate(zoneType);

	switch (country) {
		case 'FR': {
			const onf: EuPermitLink = {
				id: 'fr_onf',
				label: 'ONF — annuaire communal (contact territorial)',
				url: 'https://www.onf.fr/aux-cotes-des-territoires/annuaire-communal'
			};
			const mairie: EuPermitLink = {
				id: 'fr_service_public',
				label: 'Service-Public — contacter la mairie',
				url: 'https://lannuaire.service-public.gouv.fr/navigation/mairie'
			};
			if (kind === 'forest') return [onf, mairie];
			if (kind === 'private') return [mairie, onf];
			return [mairie, onf];
		}
		case 'DE': {
			const bfn: EuPermitLink = {
				id: 'de_bfn',
				label: 'BfN — Naturschutz & Schutzgebiete',
				url: 'https://www.bfn.de/schutzgebiete'
			};
			const wald: EuPermitLink = {
				id: 'de_wald',
				label: 'BWaldG — Betreten des Waldes (§ 14)',
				url: 'https://www.gesetze-im-internet.de/bwaldg/__14.html'
			};
			const lander: EuPermitLink = {
				id: 'de_lander_forst',
				label: 'Forstverwaltungen der Länder (Übersicht)',
				url: 'https://www.bmel.de/DE/themen/wald.html'
			};
			const land = resolveDeLand(options);
			const landLink = land ? DE_LAND_FORST[land] : null;
			const base =
				kind === 'forest'
					? [lander, wald, bfn]
					: kind === 'private'
						? [lander, bfn, wald]
						: [bfn, lander];
			if (!landLink) return base;
			return [landLink, ...base.filter((l) => l.id !== landLink.id)];
		}
		case 'ES': {
			const miteco: EuPermitLink = {
				id: 'es_miteco',
				label: 'MITECO — biodiversidad',
				url: 'https://www.miteco.gob.es/es/biodiversidad.html'
			};
			const catastro: EuPermitLink = {
				id: 'es_catastro',
				label: 'Sede Electrónica del Catastro',
				url: 'https://www.sedecatastro.gob.es/'
			};
			const ccaa: EuPermitLink = {
				id: 'es_ccaa',
				label: 'MITECO — LESRPE / Catálogo español',
				url: 'https://www.miteco.gob.es/es/biodiversidad/temas/inventarios-nacionales/inventario-espanol-patrimonio-natural-biodiv/sistema-indicadores/02c-lesrpe-ceesa.html'
			};
			const region = resolveEsCcaa(options);
			const regionLink = region ? ES_CCAA_LINKS[region] : null;
			const base =
				kind === 'private' ? [catastro, ccaa, miteco] : [miteco, ccaa, catastro];
			if (!regionLink) return base;
			return [regionLink, ...base];
		}
		case 'IT': {
			const mase: EuPermitLink = {
				id: 'it_mase',
				label: 'MASE — aree protette / Natura 2000',
				url: 'https://www.mase.gov.it/portale/aree-naturali-protette-e-rete-natura-2000'
			};
			const catasto: EuPermitLink = {
				id: 'it_catasto',
				label: 'Geoportale Cartografia Catastale',
				url: 'https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/consultazione-cartografia-catastale/geoportale-cartografico-catastale'
			};
			const carabinieri: EuPermitLink = {
				id: 'it_carabinieri_forestali',
				label: 'Carabinieri Forestali',
				url: 'https://www.carabinieri.it/chi-siamo/oggi/organizzazione/tutela-forestale-ambientale-e-agroalimentare'
			};
			const region = resolveItRegione(options);
			const regionLink = region ? IT_REGIONE_LINKS[region] : null;
			const base =
				kind === 'forest'
					? [carabinieri, mase, catasto]
					: kind === 'private'
						? [catasto, mase, carabinieri]
						: [mase, catasto, carabinieri];
			if (!regionLink) return base;
			return [regionLink, ...base];
		}
		case 'CH': {
			const bafu: EuPermitLink = {
				id: 'ch_bafu',
				label: 'OFEV / BAFU — biodiversité',
				url: 'https://www.bafu.admin.ch/fr/biodiversite'
			};
			const cadastre: EuPermitLink = {
				id: 'ch_cadastre',
				label: 'cadastre.ch — mensuration officielle',
				url: 'https://www.cadastre.ch/'
			};
			const region = resolveChCanton(options);
			const regionLink = region
				? {
						...CH_CANTON_LINKS[region],
						label: `${swissCantonLabel(region)} — environnement / Umwelt`
					}
				: null;
			const base = kind === 'private' ? [cadastre, bafu] : [bafu, cadastre];
			if (!regionLink) return base;
			return [regionLink, ...base];
		}
		case 'BE': {
			const wallonie: EuPermitLink = {
				id: 'be_spw',
				label: 'Wallonie — biodiversité (SPW)',
				url: 'https://biodiversite.wallonie.be/'
			};
			const flanders: EuPermitLink = {
				id: 'be_vlaanderen',
				label: 'Vlaanderen — Soortenbescherming (ANB)',
				url: 'https://natuurenbos.vlaanderen.be/dieren-en-planten/soortenbescherming'
			};
			const brussels: EuPermitLink = {
				id: 'be_brussels',
				label: 'Bruxelles — ordonnance conservation de la nature',
				url: 'https://www.ejustice.just.fgov.be/eli/ordonnance/2012/03/01/2012031122/justel'
			};
			const cadastre: EuPermitLink = {
				id: 'be_cadgis',
				label: 'CadGIS — parcelle / cadastre (SPF Finances)',
				url: 'https://eservices.minfin.fgov.be/cadgis/'
			};
			const region = resolveBeRegion(options);
			if (kind === 'private') {
				// Owner-ID first; regional nature hubs next; Brussels ordinance last.
				const privateBase = [cadastre, wallonie, flanders, brussels];
				if (region === 'flanders') {
					return [cadastre, flanders, wallonie, brussels];
				}
				if (region === 'wallonie') {
					return [cadastre, wallonie, flanders, brussels];
				}
				if (region === 'brussels') {
					return [cadastre, wallonie, flanders, brussels];
				}
				return privateBase;
			}
			const all = [wallonie, flanders, brussels, cadastre];
			if (region === 'flanders') return prioritize(['be_vlaanderen'], all);
			if (region === 'wallonie') return prioritize(['be_spw'], all);
			if (region === 'brussels') return prioritize(['be_brussels'], all);
			return [wallonie, flanders, brussels, cadastre];
		}
		case 'NL': {
			const rvo: EuPermitLink = {
				id: 'nl_rvo',
				label: 'RVO — Omgevingswet & natuur',
				url: 'https://www.rvo.nl/onderwerpen/omgevingswet-natuur'
			};
			const rvoFlora: EuPermitLink = {
				id: 'nl_rvo_flora',
				label: 'RVO — omgevingsvergunning flora-fauna',
				url: 'https://www.rvo.nl/onderwerpen/buiten-werken/omgevingsvergunning-flora-en-fauna'
			};
			const iploHout: EuPermitLink = {
				id: 'nl_iplo_hout',
				label: 'IPLO — vellen houtopstand / herplant',
				url: 'https://iplo.nl/regelgeving/regels-voor-activiteiten/activiteiten-natuur/vellen-houtopstand-herbeplanten/rijksregels-vellen-houtopstand-herbeplanten/'
			};
			const loket: EuPermitLink = {
				id: 'nl_omgevingsloket',
				label: 'Omgevingsloket',
				url: 'https://omgevingswet.overheid.nl/'
			};
			const staatsbos: EuPermitLink = {
				id: 'nl_staatsbosbeheer',
				label: 'Staatsbosbeheer',
				url: 'https://www.staatsbosbeheer.nl/'
			};
			const prov = resolveNlProvince(options);
			const provLink = prov ? NL_PROVINCE_LINKS[prov] : null;
			const base =
				kind === 'forest'
					? [iploHout, staatsbos, rvo, loket]
					: kind === 'private'
						? [rvoFlora, loket, rvo, iploHout]
						: [rvo, rvoFlora, loket, iploHout];
			if (!provLink) return base;
			return [provLink, ...base];
		}
		case 'AT': {
			const bmluk: EuPermitLink = {
				id: 'at_bmluk',
				label: 'BMLUK — Wald',
				url: 'https://www.bmluk.gv.at/themen/wald.html'
			};
			const forstg: EuPermitLink = {
				id: 'at_forstg',
				label: 'BMLUK — Forstgesetz 1975',
				url: 'https://www.bmluk.gv.at/themen/wald/wald-in-oesterreich/Forstrecht/Forstgesetz.html'
			};
			const land = resolveAtLand(options);
			const landLink = land ? AT_LAND_FORST[land] : null;
			const base =
				kind === 'forest'
					? [bmluk, forstg]
					: kind === 'private'
						? [bmluk, forstg]
						: [bmluk, forstg];
			if (!landLink) return base;
			return [landLink, ...base];
		}
		case 'PT': {
			const icnf: EuPermitLink = {
				id: 'pt_icnf',
				label: 'ICNF — sobreiros e azinheiras',
				url: 'https://www.icnf.pt/florestas/sobreiros-e-azinheiras'
			};
			const dgt: EuPermitLink = {
				id: 'pt_dgt',
				label: 'DGT — cadastro predial',
				url: 'https://www.dgterritorio.gov.pt/cadastro'
			};
			const madeira: EuPermitLink = {
				id: 'pt_madeira',
				label: 'IFCN Madeira — florestas e conservação',
				url: 'https://ifcn.madeira.gov.pt/'
			};
			const azores: EuPermitLink = {
				id: 'pt_azores',
				label: 'Açores — Ambiente e Ação Climática (SRAAC)',
				url: 'https://portal.azores.gov.pt/web/sraac/home'
			};
			const region = resolvePtRegion(options);
			const base = kind === 'private' ? [dgt, icnf] : [icnf, dgt];
			if (region === 'madeira') return prioritize(['pt_madeira'], [...base, madeira, azores]);
			if (region === 'azores') return prioritize(['pt_azores'], [...base, madeira, azores]);
			return base;
		}
		case 'IE': {
			const npws: EuPermitLink = {
				id: 'ie_npws',
				label: 'NPWS — Flora Protection Order',
				url: 'https://www.npws.ie/legislation/irish-law/flora-protection-order-1999'
			};
			const coillte: EuPermitLink = {
				id: 'ie_coillte',
				label: 'Coillte — our forests',
				url: 'https://www.coillte.ie/our-forests/'
			};
			const localAuth: EuPermitLink = {
				id: 'ie_local_authority',
				label: 'Local authority planning (LGMA)',
				url: 'https://www.lgma.ie/en/'
			};
			if (kind === 'forest') return [coillte, npws, localAuth];
			if (kind === 'private') return [localAuth, npws, coillte];
			return [npws, coillte, localAuth];
		}
		case 'DK': {
			const natur: EuPermitLink = {
				id: 'dk_naturstyrelsen',
				label: 'Naturstyrelsen — tilladelser',
				url: 'https://naturstyrelsen.dk/regler-og-tilladelser/aktiviteter-og-tilladelser-paa-naturstyrelsens-arealer'
			};
			const miljo: EuPermitLink = {
				id: 'dk_miljostyrelsen',
				label: 'Artsfredningsbekendtgørelsen (BEK 521)',
				url: 'https://www.retsinformation.dk/eli/lta/2021/521'
			};
			const kommune: EuPermitLink = {
				id: 'dk_kommune',
				label: 'Kontakt din kommune (borger.dk)',
				url: 'https://www.borger.dk/'
			};
			if (kind === 'forest') return [natur, miljo, kommune];
			if (kind === 'private') return [kommune, miljo, natur];
			return [natur, miljo, kommune];
		}
		case 'FI': {
			const metsa: EuPermitLink = {
				id: 'fi_metsahallitus',
				label: 'Metsähallitus — luvat',
				url: 'https://www.metsa.fi/luvat/'
			};
			const ym: EuPermitLink = {
				id: 'fi_ymparisto',
				label: 'Jokaisenoikeudet (YM)',
				url: 'https://ym.fi/jokaisenoikeudet'
			};
			const kunta: EuPermitLink = {
				id: 'fi_kunta',
				label: 'Kuntaliitto — kunnat',
				url: 'https://www.kuntaliitto.fi/kunnat'
			};
			if (kind === 'forest') return [metsa, ym, kunta];
			if (kind === 'private') return [kunta, ym, metsa];
			return [metsa, ym, kunta];
		}
		case 'GB': {
			const { latitude, longitude } = options ?? {};
			const nation =
				latitude != null && longitude != null
					? resolveGbNation(latitude, longitude)
					: null;
			return gbNationLinks(nation, kind);
		}
		case 'SE': {
			const skogs: EuPermitLink = {
				id: 'se_skogsstyrelsen',
				label: 'Skogsstyrelsen — artskydd',
				url: 'https://www.skogsstyrelsen.se/lag-och-tillsyn/artskydd/'
			};
			const natur: EuPermitLink = {
				id: 'se_naturvardsverket',
				label: 'Naturvårdsverket — Allemansrätten',
				url: 'https://www.naturvardsverket.se/allemansratten/'
			};
			const artskydd: EuPermitLink = {
				id: 'se_artskydd',
				label: 'Naturvårdsverket — fridlysta arter',
				url: 'https://www.naturvardsverket.se/amnesomraden/arter-och-artskydd/fridlysta-arter'
			};
			const kommun: EuPermitLink = {
				id: 'se_kommun',
				label: 'SKR — hitta din kommun',
				url: 'https://skr.se/kommunerochregioner/kommunerlista.8288.html'
			};
			const lan = resolveSeLan(options);
			const lanLink = lan ? SE_LAN_LINKS[lan] : null;
			const base =
				kind === 'forest'
					? [skogs, natur, artskydd, kommun]
					: kind === 'private'
						? [kommun, natur, artskydd, skogs]
						: [natur, skogs, artskydd, kommun];
			if (!lanLink) return base;
			return [lanLink, ...base];
		}
		case 'NO': {
			const milj: EuPermitLink = {
				id: 'no_miljodir',
				label: 'Miljødirektoratet — allemannsretten',
				url: 'https://www.miljodirektoratet.no/ansvarsomrader/friluftsliv/friluftsliv-og-allemannsretten/allemannsretten/'
			};
			const landbruk: EuPermitLink = {
				id: 'no_landbruksdirektoratet',
				label: 'Landbruksdirektoratet — skogbruk',
				url: 'https://www.landbruksdirektoratet.no/nb/skogbruk'
			};
			const naturmangfold: EuPermitLink = {
				id: 'no_naturmangfold',
				label: 'Naturmangfoldloven (Lovdata)',
				url: 'https://lovdata.no/dokument/NL/lov/2009-06-19-100'
			};
			const kommune: EuPermitLink = {
				id: 'no_kommune',
				label: 'KS — finn din kommune',
				url: 'https://www.ks.no/'
			};
			const sf = resolveNoStatsforvalter(options);
			const sfLink = sf ? NO_STATSFORVALTER_LINKS[sf] : null;
			const base =
				kind === 'forest'
					? [landbruk, milj, naturmangfold, kommune]
					: kind === 'private'
						? [kommune, milj, landbruk, naturmangfold]
						: [milj, landbruk, naturmangfold, kommune];
			if (!sfLink) return base;
			return [sfLink, ...base];
		}
		default:
			return [];
	}
}
