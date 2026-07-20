import type { CadastreZoneType } from '$lib/types/cadastre';
import type { CountryCode } from '$lib/geo/countries';
import { resolveGbNation, type GbNation } from '$lib/geo/providers/protected/gb';

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
	if (/vlaanderen|flanders|flamand|antwerpen|gent|brugge|leuven|BE-VLG/i.test(blob)) {
		return 'flanders';
	}
	if (/wallon|namur|li[eè]ge|charleroi|mons|BE-WAL/i.test(blob)) return 'wallonie';

	const { latitude: lat, longitude: lon } = options ?? {};
	if (lat == null || lon == null) return null;

	// Brussels-Capital (tight box)
	if (lat >= 50.75 && lat <= 50.92 && lon >= 4.22 && lon <= 4.5) return 'brussels';
	// Rough language border ~50.75: north → Flanders, south → Wallonia
	if (lat >= 50.75) return 'flanders';
	if (lat >= 49.45) return 'wallonie';
	return null;
}

type DeLandCode = 'BE' | 'MV' | 'ST' | 'HH' | 'HB' | 'NW' | 'BW' | 'RP';

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
	BE: {
		id: 'de_forst_be',
		label: 'Berlin — Wald',
		url: 'https://www.berlin.de/sen/uvk/natur-und-gruen/wald/'
	},
	HH: {
		id: 'de_forst_hh',
		label: 'Hamburg — Wald / BUKEA',
		url: 'https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea'
	},
	MV: {
		id: 'de_forst_mv',
		label: 'Wald-MV — Mecklenburg-Vorpommern',
		url: 'https://www.wald-mv.de/'
	},
	ST: {
		id: 'de_forst_st',
		label: 'Sachsen-Anhalt — Wald / MULE',
		url: 'https://mule.sachsen-anhalt.de/'
	},
	HB: {
		id: 'de_forst_hb',
		label: 'Bremen — Umwelt / Wald',
		url: 'https://www.bauumwelt.bremen.de/'
	},
	RP: {
		id: 'de_forst_rp',
		label: 'Wald RLP — Rheinland-Pfalz',
		url: 'https://www.wald.rlp.de/'
	}
};

const DE_LAND_MATCH: Array<{ code: DeLandCode; re: RegExp }> = [
	{ code: 'NW', re: /nordrhein|westfalen|DE-NW|\bNRW\b/i },
	{ code: 'BW', re: /baden|w(?:ue|ü)rttemberg|DE-BW/i },
	{ code: 'BE', re: /berlin|DE-BE/i },
	{ code: 'HH', re: /hamburg|DE-HH/i },
	{ code: 'MV', re: /mecklenburg|vorpommern|DE-MV/i },
	{ code: 'ST', re: /sachsen-anhalt|DE-ST/i },
	{ code: 'HB', re: /bremen|bremerhaven|DE-HB/i },
	{ code: 'RP', re: /rheinland[- ]?pfalz|DE-RP|\bRLP\b/i }
];

/** Rough Land boxes for open-ALKIS Länder (hint when text is empty). */
const DE_LAND_BBOX: Array<{
	code: DeLandCode;
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}> = [
	{ code: 'NW', minLat: 50.3, maxLat: 52.6, minLon: 5.8, maxLon: 9.5 },
	{ code: 'BW', minLat: 47.5, maxLat: 49.8, minLon: 7.5, maxLon: 10.5 },
	{ code: 'BE', minLat: 52.3, maxLat: 52.7, minLon: 13.0, maxLon: 13.8 },
	{ code: 'HH', minLat: 53.4, maxLat: 53.75, minLon: 9.7, maxLon: 10.35 },
	{ code: 'MV', minLat: 53.0, maxLat: 54.7, minLon: 10.5, maxLon: 14.5 },
	{ code: 'ST', minLat: 51.0, maxLat: 53.0, minLon: 10.5, maxLon: 13.3 },
	{ code: 'HB', minLat: 53.0, maxLat: 53.6, minLon: 8.4, maxLon: 9.0 },
	{ code: 'RP', minLat: 48.95, maxLat: 50.95, minLon: 6.1, maxLon: 8.5 }
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

type EsCcaa =
	| 'and' | 'cat' | 'mad' | 'val' | 'gal' | 'pvas' | 'ara' | 'cyl' | 'clm' | 'ext';

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
		url: 'https://www.aragon.es/-/medio-ambiente'
	},
	cyl: {
		id: 'es_ccaa_cyl',
		label: 'Castilla y León — medio ambiente',
		url: 'https://medioambiente.jcyl.es/'
	},
	clm: {
		id: 'es_ccaa_clm',
		label: 'Castilla-La Mancha — medio ambiente',
		url: 'https://www.castillalamancha.es/tema/medio-ambiente'
	},
	ext: {
		id: 'es_ccaa_ext',
		label: 'Extremadura — medio ambiente',
		url: 'https://www.juntaex.es/temas/medio-ambiente'
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
	{ code: 'ext', re: /extremadura|badajoz|c[aá]ceres|ES-EX/i }
];

export function resolveEsCcaa(options?: EuPermitLinkOptions): EsCcaa | null {
	const blob = hintBlob(options);
	for (const { code, re } of ES_CCAA_MATCH) {
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
		url: 'https://www.gov.uk/government/organisations/forestry-commission'
	};
	const naturalEngland: EuPermitLink = {
		id: 'gb_natural_england',
		label: 'Natural England',
		url: 'https://www.gov.uk/government/organisations/natural-england'
	};
	const natureScot: EuPermitLink = {
		id: 'gb_naturescot',
		label: 'NatureScot',
		url: 'https://www.nature.scot/'
	};
	const nrw: EuPermitLink = {
		id: 'gb_nrw',
		label: 'Natural Resources Wales',
		url: 'https://naturalresources.wales/'
	};
	const forestryScotland: EuPermitLink = {
		id: 'gb_forestry_scotland',
		label: 'Scottish Forestry',
		url: 'https://forestry.gov.scot/'
	};
	const daera: EuPermitLink = {
		id: 'gb_daera',
		label: 'DAERA / NIEA (Northern Ireland)',
		url: 'https://www.daera-ni.gov.uk/topics/biodiversity-land-and-landscapes/protected-areas'
	};

	if (nation === 'scotland') {
		return kind === 'forest'
			? [forestryScotland, natureScot, naturalEngland, forestry, nrw, daera]
			: [natureScot, forestryScotland, naturalEngland, nrw, daera, forestry];
	}
	if (nation === 'wales') {
		return kind === 'forest'
			? [nrw, forestry, naturalEngland, natureScot, forestryScotland, daera]
			: [nrw, naturalEngland, natureScot, daera, forestry];
	}
	if (nation === 'ni') {
		return kind === 'forest'
			? [daera, forestry, naturalEngland, natureScot, nrw, forestryScotland]
			: [daera, naturalEngland, natureScot, nrw, forestry];
	}
	// England or unknown — England hubs first, keep all nations as fallbacks
	if (kind === 'forest') {
		return [forestry, naturalEngland, forestryScotland, natureScot, nrw, daera];
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
				label: 'ONF — autorisations & contacts',
				url: 'https://www.onf.fr/+/1a8::autorisations-et-occupations.html'
			};
			const mairie: EuPermitLink = {
				id: 'fr_service_public',
				label: 'Service-Public — contacter la mairie',
				url: 'https://www.service-public.fr/particuliers/vosdroits/F34574'
			};
			if (kind === 'forest') return [onf, mairie];
			if (kind === 'private') return [mairie, onf];
			return [mairie, onf];
		}
		case 'DE': {
			const bfn: EuPermitLink = {
				id: 'de_bfn',
				label: 'BfN — Naturschutz & Schutzgebiete',
				url: 'https://www.bfn.de/'
			};
			const wald: EuPermitLink = {
				id: 'de_wald',
				label: 'BWaldG — Betreten des Waldes (§ 14)',
				url: 'https://www.gesetze-im-internet.de/bwaldg/__14.html'
			};
			const lander: EuPermitLink = {
				id: 'de_lander_forst',
				label: 'Forstverwaltungen der Länder (Übersicht)',
				url: 'https://www.bmel.de/DE/themen/wald/wald.html'
			};
			const land = resolveDeLand(options);
			const landLink = land ? DE_LAND_FORST[land] : null;
			const base =
				kind === 'forest'
					? [lander, wald, bfn]
					: kind === 'private'
						? [bfn, wald, lander]
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
				label: 'Comunidades autónomas — medio ambiente (portal)',
				url: 'https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/medio-ambiente-industrias/comunidades-autonomas.html'
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
				label: 'MASE — aree protette',
				url: 'https://www.mase.gov.it/'
			};
			const carabinieri: EuPermitLink = {
				id: 'it_carabinieri_forestali',
				label: 'Carabinieri Forestali',
				url: 'https://www.carabinieri.it/chi-siamo/organizzazione/organizzazione-per-la-tutela-forestale-ambientale-e-agroalimentare'
			};
			return kind === 'forest' ? [carabinieri, mase] : [mase, carabinieri];
		}
		case 'CH': {
			const bafu: EuPermitLink = {
				id: 'ch_bafu',
				label: 'OFEV / BAFU — forêts & nature',
				url: 'https://www.bafu.admin.ch/bafu/fr/home.html'
			};
			const canton: EuPermitLink = {
				id: 'ch_cantons',
				label: 'OFEV — contacts forestiers cantonaux',
				url: 'https://www.bafu.admin.ch/bafu/fr/home/themes/forets/info-specialistes.html'
			};
			const cadastre: EuPermitLink = {
				id: 'ch_cadastre',
				label: 'cadastre.ch — mensuration officielle',
				url: 'https://www.cadastre.ch/'
			};
			if (kind === 'private') return [cadastre, canton, bafu];
			return [bafu, canton, cadastre];
		}
		case 'BE': {
			const wallonie: EuPermitLink = {
				id: 'be_spw',
				label: 'SPW — environnement (Wallonie)',
				url: 'https://environnement.wallonie.be/'
			};
			const flanders: EuPermitLink = {
				id: 'be_vlaanderen',
				label: 'Vlaanderen — Natuur & Bos',
				url: 'https://www.natuurenbos.be/'
			};
			const brussels: EuPermitLink = {
				id: 'be_brussels',
				label: 'Bruxelles Environnement',
				url: 'https://environnement.brussels/'
			};
			const all = [wallonie, flanders, brussels];
			const region = resolveBeRegion(options);
			if (region === 'flanders') return prioritize(['be_vlaanderen'], all);
			if (region === 'wallonie') return prioritize(['be_spw'], all);
			if (region === 'brussels') return prioritize(['be_brussels'], all);
			return all;
		}
		case 'NL': {
			const rvo: EuPermitLink = {
				id: 'nl_rvo',
				label: 'RVO — natuurvergunningen',
				url: 'https://www.rvo.nl/onderwerpen/wetten-en-regels-natuur'
			};
			const staatsbos: EuPermitLink = {
				id: 'nl_staatsbosbeheer',
				label: 'Staatsbosbeheer — vergunningen',
				url: 'https://www.staatsbosbeheer.nl/'
			};
			return kind === 'forest' ? [staatsbos, rvo] : [rvo, staatsbos];
		}
		case 'AT': {
			const bml: EuPermitLink = {
				id: 'at_bml',
				label: 'BML — Forst & Umwelt',
				url: 'https://www.bml.gv.at/'
			};
			const lander: EuPermitLink = {
				id: 'at_lander',
				label: 'Landesforstdirektionen (Übersicht)',
				url: 'https://www.bml.gv.at/themen/wald.html'
			};
			return [bml, lander];
		}
		case 'PT': {
			const icnf: EuPermitLink = {
				id: 'pt_icnf',
				label: 'ICNF — conservação da natureza',
				url: 'https://www.icnf.pt/'
			};
			const dgt: EuPermitLink = {
				id: 'pt_dgt',
				label: 'DGT — cadastro predial',
				url: 'https://www.dgterritorio.gov.pt/'
			};
			return kind === 'private' ? [dgt, icnf] : [icnf, dgt];
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
				label: 'Skogsstyrelsen',
				url: 'https://www.skogsstyrelsen.se/'
			};
			const natur: EuPermitLink = {
				id: 'se_naturvardsverket',
				label: 'Naturvårdsverket',
				url: 'https://www.naturvardsverket.se/'
			};
			return kind === 'forest' ? [skogs, natur] : [natur, skogs];
		}
		case 'NO': {
			const milj: EuPermitLink = {
				id: 'no_miljodir',
				label: 'Miljødirektoratet',
				url: 'https://www.miljodirektoratet.no/'
			};
			const landbruk: EuPermitLink = {
				id: 'no_landbruksdirektoratet',
				label: 'Landbruksdirektoratet',
				url: 'https://www.landbruksdirektoratet.no/'
			};
			return [milj, landbruk];
		}
		default:
			return [];
	}
}
