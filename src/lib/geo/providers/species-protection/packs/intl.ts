import type { SpeciesProtectionPack } from '$lib/geo/providers/species-protection/types';
import type { CountryCode } from '$lib/geo/countries';
import {
	buildActaPlantarumSpeciesSearchUrl,
	buildArtfaktaSpeciesSearchUrl,
	buildArtsdatabankenSpeciesSearchUrl,
	buildBiodiversityAtlasAtSpeciesSearchUrl,
	buildFloraOnSpeciesSearchUrl,
	buildFloraWebSpeciesSearchUrl,
	buildGbifSpeciesSearchUrl,
	buildInfoFloraSpeciesSearchUrl,
	buildNbdcSpeciesSearchUrl,
	buildArterDkSpeciesSearchUrl,
	buildLajiFiSpeciesSearchUrl,
	buildNbnAtlasSpeciesSearchUrl,
	buildVerspreidingsatlasSpeciesSearchUrl,
	buildWaarnemingenBeSpeciesSearchUrl
} from '$lib/geo/speciesSearchUrls';

const ANTHOS_BASE = 'https://www.anthos.es/';

/** Anthos has no stable query URL; GBIF ES-scoped search as practical lookup. */
function buildAnthosGbifUrl(species: string): string {
	const query = species.trim();
	if (!query) return ANTHOS_BASE;
	return `https://www.gbif.org/species/search?${new URLSearchParams({ q: query, country: 'ES' })}`;
}

function pack(
	country: CountryCode,
	entries: SpeciesProtectionPack['entries'],
	options?: {
		sourceName?: string;
		buildSourceUrl?: (species: string) => string;
	}
): SpeciesProtectionPack {
	return {
		country,
		coverage: 'partial',
		sourceName: options?.sourceName ?? 'GBIF',
		buildSourceUrl: options?.buildSourceUrl ?? buildGbifSpeciesSearchUrl,
		entries
	};
}

/** Curated yamadori-relevant lists — always non-exhaustive → coverage partial. */

/**
 * Curated DE pack — yamadori-relevant taxa.
 * `national` = BArtSchV Anlage 1 (besonders geschützt; footnote 8 = wild populations).
 * `regional` = Land lists / parks / biotopes (not in Anlage 1 for that taxon).
 */
export const deSpeciesProtectionPack = pack(
	'DE',
	[
		{
			id: 'de_taxus',
			level: 'veto',
			scope: 'national',
			label: 'Eibe (Taxus baccata)',
			names: ['Eibe', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'de_ilex',
			level: 'veto',
			scope: 'national',
			label: 'Stechpalme (Ilex aquifolium)',
			names: ['Stechpalme', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'de_daphne',
			level: 'veto',
			scope: 'national',
			label: 'Seidelbast (Daphne mezereum)',
			names: ['Seidelbast', 'Daphne mezereum', 'Daphne', 'Bois-joli']
		},
		{
			id: 'de_buxus',
			level: 'veto',
			scope: 'national',
			label: 'Buchsbaum (Buxus sempervirens)',
			names: ['Buchsbaum', 'Buxus sempervirens', 'Buis', 'Boxwood']
		},
		{
			id: 'de_pinus_mugo',
			level: 'caution',
			scope: 'regional',
			label: 'Bergkiefer (Pinus mugo)',
			names: ['Bergkiefer', 'Pinus mugo', 'Pin mugo', 'Mountain pine']
		},
		{
			id: 'de_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Wacholder (Juniperus communis)',
			names: ['Wacholder', 'Juniperus communis', 'Genévrier', 'Juniper']
		},
		{
			id: 'de_betula_nana',
			level: 'veto',
			scope: 'national',
			label: 'Zwergbirke (Betula nana)',
			names: ['Zwergbirke', 'Betula nana', 'Bouleau nain', 'Dwarf birch']
		},
		{
			id: 'de_osmunda',
			level: 'veto',
			scope: 'national',
			label: 'Königsfarn (Osmunda regalis)',
			names: ['Königsfarn', 'Osmunda regalis', 'Osmonde royale']
		}
	],
	{ sourceName: 'FloraWeb (BfN)', buildSourceUrl: buildFloraWebSpeciesSearchUrl }
);

/**
 * Curated ES pack — yamadori-relevant taxa.
 * `national` is reserved for LESRPE/CEEA listings; regional CCAA protection uses `regional`.
 * Non-exhaustive; competence is largely autonomous-community.
 */
export const esSpeciesProtectionPack = pack(
	'ES',
	[
		{
			id: 'es_abies_pinsapo',
			level: 'veto',
			scope: 'regional',
			label: 'Pinsapo (Abies pinsapo)',
			names: ['Pinsapo', 'Abies pinsapo', 'Spanish fir', 'Sapin d’Espagne']
		},
		{
			id: 'es_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'Tejo (Taxus baccata)',
			names: ['Tejo', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'es_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Acebo (Ilex aquifolium)',
			names: ['Acebo', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'es_pinus_uncinata',
			level: 'caution',
			scope: 'regional',
			label: 'Pino negro (Pinus uncinata)',
			names: ['Pinus uncinata', 'Pino negro', 'Pin à crochets', 'Mountain pine']
		},
		{
			id: 'es_quercus_suber',
			level: 'caution',
			scope: 'regional',
			label: 'Alcornoque (Quercus suber)',
			names: ['Alcornoque', 'Quercus suber', 'Chêne-liège', 'Cork oak', 'Sobreiro']
		},
		{
			id: 'es_olea',
			level: 'caution',
			scope: 'regional',
			label: 'Acebuche (Olea europaea var. sylvestris)',
			names: [
				'Acebuche',
				'Olea europaea var. sylvestris',
				'Olea europaea sylvestris',
				'Olivier sauvage',
				'Wild olive'
			]
		},
		{
			id: 'es_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Enebro (Juniperus communis)',
			names: ['Enebro', 'Juniperus communis', 'Genévrier', 'Juniper']
		},
		{
			id: 'es_buxus',
			level: 'caution',
			scope: 'regional',
			label: 'Boj (Buxus sempervirens)',
			names: ['Boj', 'Buxus sempervirens', 'Buis', 'Boxwood']
		}
	],
	{ sourceName: 'Anthos / GBIF ES', buildSourceUrl: buildAnthosGbifUrl }
);

export const itSpeciesProtectionPack = pack(
	'IT',
	[
		{
			id: 'it_abies_nebrodensis',
			level: 'veto',
			scope: 'regional',
			label: 'Abete delle Madonie (Abies nebrodensis)',
			names: [
				'Abete delle Madonie',
				'Abies nebrodensis',
				'Sicilian fir',
				'Sapin de Sicile'
			]
		},
		{
			id: 'it_pinus_heldreichii',
			level: 'veto',
			scope: 'regional',
			label: 'Pino loricato (Pinus heldreichii)',
			names: [
				'Pinus heldreichii',
				'Pinus leucodermis',
				'Pino loricato',
				'Bosnian pine'
			]
		},
		{
			id: 'it_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'Tasso (Taxus baccata)',
			names: ['Tasso', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'it_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Agrifoglio (Ilex aquifolium)',
			names: ['Agrifoglio', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'it_pinus_mugo',
			level: 'caution',
			scope: 'regional',
			label: 'Pino mugo (Pinus mugo)',
			names: ['Pino mugo', 'Pinus mugo', 'Pin mugo', 'Mountain pine']
		},
		{
			id: 'it_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Ginepro (Juniperus communis)',
			names: ['Ginepro', 'Juniperus communis', 'Genévrier', 'Juniper']
		},
		{
			id: 'it_olea',
			level: 'caution',
			scope: 'regional',
			label: 'Olivastro (Olea europaea var. sylvestris)',
			names: [
				'Olivastro',
				'Olea europaea var. sylvestris',
				'Olea europaea sylvestris',
				'Olivier sauvage',
				'Wild olive'
			]
		},
		{
			id: 'it_quercus_suber',
			level: 'caution',
			scope: 'regional',
			label: 'Sughera (Quercus suber)',
			names: ['Sughera', 'Quercus suber', 'Chêne-liège', 'Cork oak']
		}
	],
	{
		sourceName: 'Acta Plantarum / FlorItaly',
		buildSourceUrl: buildActaPlantarumSpeciesSearchUrl
	}
);

/**
 * Curated PT pack — yamadori-relevant taxa.
 * `national` = DL 169/2001 (corte/arranque de sobreiro e azinheira carece de autorização).
 * `regional` = áreas classificadas / listas regionais / Madeira & Açores (non-exhaustive).
 */
export const ptSpeciesProtectionPack = pack(
	'PT',
	[
		{
			id: 'pt_sobreiro',
			level: 'veto',
			scope: 'national',
			label: 'Sobreiro (Quercus suber)',
			names: ['Sobreiro', 'Quercus suber', 'Chêne-liège', 'Cork oak', 'Alcornoque']
		},
		{
			id: 'pt_azinheira',
			level: 'veto',
			scope: 'national',
			label: 'Azinheira (Quercus rotundifolia)',
			names: ['Azinheira', 'Quercus rotundifolia', 'Quercus ilex rotundifolia', 'Holm oak']
		},
		{
			id: 'pt_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'Teixo (Taxus baccata)',
			names: ['Teixo', 'Taxus baccata', 'If', 'Yew', 'Tejo']
		},
		{
			id: 'pt_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Azevinho (Ilex aquifolium)',
			names: ['Azevinho', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'pt_olea',
			level: 'caution',
			scope: 'regional',
			label: 'Zambujeiro (Olea europaea)',
			names: ['Zambujeiro', 'Olea europaea', 'Olivier sauvage']
		},
		{
			id: 'pt_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Zimbro (Juniperus communis)',
			names: ['Zimbro', 'Juniperus communis', 'Genévrier', 'Juniper']
		},
		{
			id: 'pt_juniperus_brevifolia',
			level: 'caution',
			scope: 'regional',
			label: 'Zimbro-das-ilhas (Juniperus brevifolia)',
			names: [
				'Zimbro-das-ilhas',
				'Juniperus brevifolia',
				'Azorean juniper',
				'Cedro-do-mato'
			]
		},
		{
			id: 'pt_ruscus',
			level: 'caution',
			scope: 'regional',
			label: 'Gilbardeira (Ruscus aculeatus)',
			names: ['Gilbardeira', 'Ruscus aculeatus', 'Fragon', "Butcher's broom"]
		},
		{
			id: 'pt_arbutus',
			level: 'caution',
			scope: 'regional',
			label: 'Medronheiro (Arbutus unedo)',
			names: ['Medronheiro', 'Arbutus unedo', 'Arbousier', 'Strawberry tree']
		}
	],
	{ sourceName: 'Flora-On / ICNF', buildSourceUrl: buildFloraOnSpeciesSearchUrl }
);

/**
 * Ireland (NBDC / Flora Protection Order 2022):
 * - national veto: Salix phylicifolia, Sorbus anglica — FPO scheduled
 * - regional caution: common woody spp (owner + SAC/SPA/NHA — not FPO for Taxus/Ilex/Juniper)
 */
export const ieSpeciesProtectionPack = pack(
	'IE',
	[
		{
			id: 'ie_salix_phylicifolia',
			level: 'veto',
			scope: 'national',
			label: 'Tea-leaved willow (Salix phylicifolia)',
			names: ['Tea-leaved willow', 'Salix phylicifolia', 'Saule à feuilles de myrtille']
		},
		{
			id: 'ie_sorbus_anglica',
			level: 'veto',
			scope: 'national',
			label: 'English whitebeam (Sorbus anglica)',
			names: ['English whitebeam', 'Sorbus anglica', 'Alisier d’Angleterre']
		},
		{
			id: 'ie_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'Yew (Taxus baccata)',
			names: ['Yew', 'Taxus baccata', 'If', 'Iúr']
		},
		{
			id: 'ie_holly',
			level: 'caution',
			scope: 'regional',
			label: 'Holly (Ilex aquifolium)',
			names: ['Holly', 'Ilex aquifolium', 'Houx', 'Cuileann']
		},
		{
			id: 'ie_strawberry_tree',
			level: 'caution',
			scope: 'regional',
			label: 'Strawberry tree (Arbutus unedo)',
			names: ['Strawberry tree', 'Arbutus unedo', 'Arbousier', 'Caithne']
		},
		{
			id: 'ie_juniper',
			level: 'caution',
			scope: 'regional',
			label: 'Juniper (Juniperus communis)',
			names: ['Juniper', 'Juniperus communis', 'Genévrier', 'Aiteal']
		},
		{
			id: 'ie_scots_pine',
			level: 'caution',
			scope: 'regional',
			label: 'Scots pine (Pinus sylvestris) — native stands',
			names: ['Scots pine', 'Pinus sylvestris', 'Pin sylvestre', 'Péine Albanach']
		},
		{
			id: 'ie_sessile_oak',
			level: 'caution',
			scope: 'regional',
			label: 'Sessile oak (Quercus petraea)',
			names: ['Sessile oak', 'Quercus petraea', 'Chêne sessile', 'Dair ghaelach']
		},
		{
			id: 'ie_birch',
			level: 'caution',
			scope: 'regional',
			label: 'Downy birch (Betula pubescens)',
			names: ['Downy birch', 'Betula pubescens', 'Bouleau pubescent', 'Beith chlúmhach']
		},
		{
			id: 'ie_spindle',
			level: 'caution',
			scope: 'regional',
			label: 'Spindle (Euonymus europaeus)',
			names: ['Spindle', 'Euonymus europaeus', 'Fusain', 'Feoras']
		}
	],
	{ sourceName: 'NBDC / Biodiversity Ireland', buildSourceUrl: buildNbdcSpeciesSearchUrl }
);

/**
 * Denmark (Arter.dk / BEK 521/2021 bilag 2):
 * - national veto: Osmunda (Kongebregne) — fredet plante
 * - regional caution: common woody spp (ejer + §3 / fredskov / lokal fredning — not national artsfredning)
 */
export const dkSpeciesProtectionPack = pack(
	'DK',
	[
		{
			id: 'dk_osmunda',
			level: 'veto',
			scope: 'national',
			label: 'Kongebregne (Osmunda regalis)',
			names: ['Kongebregne', 'Osmunda regalis', 'Royal fern', 'Osmonde royale']
		},
		{
			id: 'dk_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'Taks (Taxus baccata)',
			names: ['Taks', 'Taxus baccata', 'Yew', 'If']
		},
		{
			id: 'dk_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Kristtorn (Ilex aquifolium)',
			names: ['Kristtorn', 'Ilex aquifolium', 'Holly', 'Houx']
		},
		{
			id: 'dk_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Ene (Juniperus communis)',
			names: ['Ene', 'Juniperus communis', 'Juniper', 'Genévrier']
		},
		{
			id: 'dk_pinus',
			level: 'caution',
			scope: 'regional',
			label: 'Skovfyr (Pinus sylvestris)',
			names: ['Skovfyr', 'Pinus sylvestris', 'Scots pine', 'Pin sylvestre']
		},
		{
			id: 'dk_quercus',
			level: 'caution',
			scope: 'regional',
			label: 'Stilkeg (Quercus robur)',
			names: ['Stilkeg', 'Quercus robur', 'Pedunculate oak', 'Chêne pédonculé']
		},
		{
			id: 'dk_fagus',
			level: 'caution',
			scope: 'regional',
			label: 'Bøg (Fagus sylvatica)',
			names: ['Bøg', 'Fagus sylvatica', 'Beech', 'Hêtre']
		},
		{
			id: 'dk_betula',
			level: 'caution',
			scope: 'regional',
			label: 'Dunbirk (Betula pubescens)',
			names: ['Dunbirk', 'Betula pubescens', 'Downy birch', 'Bouleau pubescent']
		},
		{
			id: 'dk_euonymus',
			level: 'caution',
			scope: 'regional',
			label: 'Benved (Euonymus europaeus)',
			names: ['Benved', 'Euonymus europaeus', 'Spindle', 'Fusain']
		}
	],
	{ sourceName: 'Arter.dk', buildSourceUrl: buildArterDkSpeciesSearchUrl }
);

/**
 * Finland (Laji.fi / luonnonsuojeluasetus):
 * - national veto: Taxus (Marjakuusi), Daphne mezereum (Lehtonäsiä) — rauhoitettu
 * - regional caution: Juniperus and common timber spp (maanomistaja + suojelualueet)
 */
export const fiSpeciesProtectionPack = pack(
	'FI',
	[
		{
			id: 'fi_taxus',
			level: 'veto',
			scope: 'national',
			label: 'Marjakuusi (Taxus baccata)',
			names: ['Marjakuusi', 'Euroopanmarjakuusi', 'Taxus baccata', 'Yew', 'If']
		},
		{
			id: 'fi_daphne',
			level: 'veto',
			scope: 'national',
			label: 'Lehtonäsiä (Daphne mezereum)',
			names: ['Lehtonäsiä', 'Daphne mezereum', 'Mezereon', 'Bois-joli']
		},
		{
			id: 'fi_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Kataja (Juniperus communis)',
			names: ['Kataja', 'Juniperus communis', 'Juniper', 'Genévrier']
		},
		{
			id: 'fi_pinus',
			level: 'caution',
			scope: 'regional',
			label: 'Mänty (Pinus sylvestris)',
			names: ['Mänty', 'Pinus sylvestris', 'Scots pine', 'Pin sylvestre']
		},
		{
			id: 'fi_picea',
			level: 'caution',
			scope: 'regional',
			label: 'Kuusi (Picea abies)',
			names: ['Kuusi', 'Picea abies', 'Norway spruce', 'Épicéa']
		},
		{
			id: 'fi_betula',
			level: 'caution',
			scope: 'regional',
			label: 'Hieskoivu (Betula pubescens)',
			names: ['Hieskoivu', 'Betula pubescens', 'Downy birch', 'Bouleau pubescent']
		},
		{
			id: 'fi_quercus',
			level: 'caution',
			scope: 'regional',
			label: 'Tammi (Quercus robur)',
			names: ['Tammi', 'Quercus robur', 'Pedunculate oak', 'Chêne pédonculé']
		},
		{
			id: 'fi_alnus',
			level: 'caution',
			scope: 'regional',
			label: 'Harmaaleppä (Alnus incana)',
			names: ['Harmaaleppä', 'Alnus incana', 'Grey alder', 'Aulne blanc']
		},
		{
			id: 'fi_sorbus',
			level: 'caution',
			scope: 'regional',
			label: 'Pihlaja (Sorbus aucuparia)',
			names: ['Pihlaja', 'Sorbus aucuparia', 'Rowan', 'Sorbier']
		}
	],
	{ sourceName: 'Laji.fi / FinBIF', buildSourceUrl: buildLajiFiSpeciesSearchUrl }
);

/** `national` = Wildlife and Countryside Act 1981 Schedule 8 (pick/uproot/destroy). Other woody entries are caution/regional (landowner consent, SSSI, nation regimes). */
export const gbSpeciesProtectionPack = pack(
	'GB',
	[
		{
			id: 'gb_cotoneaster',
			level: 'veto',
			scope: 'national',
			label: 'Wild cotoneaster (Cotoneaster integerrimus)',
			names: ['Wild cotoneaster', 'Cotoneaster integerrimus', 'Cotoneaster']
		},
		{
			id: 'gb_plymouth_pear',
			level: 'veto',
			scope: 'national',
			label: 'Plymouth pear (Pyrus cordata)',
			names: ['Plymouth pear', 'Pyrus cordata', 'Poirier de Plymouth']
		},
		{
			id: 'gb_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'Yew (Taxus baccata)',
			names: ['Yew', 'Taxus baccata', 'If']
		},
		{
			id: 'gb_holly',
			level: 'caution',
			scope: 'regional',
			label: 'Holly (Ilex aquifolium)',
			names: ['Holly', 'Ilex aquifolium', 'Houx']
		},
		{
			id: 'gb_dwarf_birch',
			level: 'caution',
			scope: 'regional',
			label: 'Dwarf birch (Betula nana)',
			names: ['Dwarf birch', 'Betula nana', 'Bouleau nain']
		},
		{
			id: 'gb_juniper',
			level: 'caution',
			scope: 'regional',
			label: 'Juniper (Juniperus communis)',
			names: ['Juniper', 'Juniperus communis', 'Genévrier']
		},
		{
			id: 'gb_aspen',
			level: 'caution',
			scope: 'regional',
			label: 'Aspen (Populus tremula) — native stands',
			names: ['Aspen', 'Populus tremula', 'Tremble']
		},
		{
			id: 'gb_daphne',
			level: 'caution',
			scope: 'regional',
			label: 'Mezereon (Daphne mezereum)',
			names: ['Mezereon', 'Daphne mezereum', 'Bois-joli']
		},
		{
			id: 'gb_twinflower',
			level: 'caution',
			scope: 'regional',
			label: 'Twinflower (Linnaea borealis)',
			names: ['Twinflower', 'Linnaea borealis']
		},
		{
			id: 'gb_scots_pine_cal',
			level: 'caution',
			scope: 'regional',
			label: 'Caledonian Scots pine (Pinus sylvestris)',
			names: ['Scots pine', 'Pinus sylvestris', 'Caledonian pine', 'Pin sylvestre']
		}
	],
	{ sourceName: 'NBN Atlas', buildSourceUrl: buildNbnAtlasSpeciesSearchUrl }
);

export const chSpeciesProtectionPack = pack(
	'CH',
	[
		{
			id: 'ch_daphne',
			level: 'veto',
			scope: 'regional',
			label: 'Bois-joli (Daphne mezereum)',
			names: ['Bois-joli', 'Daphne mezereum', 'Seidelbast', 'Kellerhals']
		},
		{
			id: 'ch_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'If (Taxus baccata)',
			names: ['If', 'Taxus baccata', 'Eibe', 'Yew', 'Tasso']
		},
		{
			id: 'ch_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Houx (Ilex aquifolium)',
			names: ['Houx', 'Ilex aquifolium', 'Stechpalme', 'Holly']
		},
		{
			id: 'ch_pinus_mugo',
			level: 'caution',
			scope: 'regional',
			label: 'Pin mugo (Pinus mugo)',
			names: ['Pin mugo', 'Pinus mugo', 'Bergkiefer', 'Mountain pine']
		},
		{
			id: 'ch_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Genévrier (Juniperus communis)',
			names: ['Genévrier', 'Juniperus communis', 'Wacholder', 'Juniper']
		},
		{
			id: 'ch_betula_nana',
			level: 'caution',
			scope: 'regional',
			label: 'Bouleau nain (Betula nana)',
			names: ['Bouleau nain', 'Betula nana', 'Zwergbirke', 'Dwarf birch']
		},
		{
			id: 'ch_osmunda',
			level: 'caution',
			scope: 'regional',
			label: 'Osmonde royale (Osmunda regalis)',
			names: ['Osmonde royale', 'Osmunda regalis', 'Königsfarn', 'Royal fern']
		},
		{
			id: 'ch_buxus',
			level: 'caution',
			scope: 'regional',
			label: 'Buis (Buxus sempervirens)',
			names: ['Buis', 'Buxus sempervirens', 'Buchs', 'Boxwood']
		}
	],
	{ sourceName: 'Info Flora', buildSourceUrl: buildInfoFloraSpeciesSearchUrl }
);

/** Artenschutz = Land (no federal plant list). `national` unused; veto/regional for widely listed Land taxa. */
export const atSpeciesProtectionPack = pack(
	'AT',
	[
		{
			id: 'at_taxus',
			level: 'veto',
			scope: 'regional',
			label: 'Eibe (Taxus baccata)',
			names: ['Eibe', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'at_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Stechpalme (Ilex aquifolium)',
			names: ['Stechpalme', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'at_daphne',
			level: 'veto',
			scope: 'regional',
			label: 'Seidelbast (Daphne mezereum)',
			names: ['Seidelbast', 'Daphne mezereum', 'Daphne']
		},
		{
			id: 'at_pinus_mugo',
			level: 'caution',
			scope: 'regional',
			label: 'Legföhre (Pinus mugo)',
			names: ['Legföhre', 'Pinus mugo', 'Pin mugo', 'Mountain pine']
		},
		{
			id: 'at_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Wacholder (Juniperus communis)',
			names: ['Wacholder', 'Juniperus communis', 'Genévrier']
		},
		{
			id: 'at_betula_nana',
			level: 'caution',
			scope: 'regional',
			label: 'Zwergbirke (Betula nana)',
			names: ['Zwergbirke', 'Betula nana', 'Dwarf birch']
		},
		{
			id: 'at_osmunda',
			level: 'caution',
			scope: 'regional',
			label: 'Königsfarn (Osmunda regalis)',
			names: ['Königsfarn', 'Osmunda regalis', 'Osmonde royale']
		},
		{
			id: 'at_buxus',
			level: 'caution',
			scope: 'regional',
			label: 'Buchs (Buxus sempervirens)',
			names: ['Buchs', 'Buxus sempervirens', 'Buis', 'Boxwood']
		}
	],
	{ sourceName: 'Biodiversitäts-Atlas Österreich', buildSourceUrl: buildBiodiversityAtlasAtSpeciesSearchUrl }
);

/**
 * Curated BE pack — yamadori-relevant taxa.
 * Competence is regional (VL Soortenbesluit / WA loi 1973 annexes / BXL ordonnance 2012).
 * `veto`+`regional` for taxa explicitly listed as protected in Flanders Soortenbesluit
 * (and/or Walloon integral lists); other woody taxa stay `caution`/`regional`.
 */
export const beSpeciesProtectionPack = pack(
	'BE',
	[
		{
			id: 'be_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'If (Taxus baccata)',
			names: ['If', 'Taxus baccata', 'Taxus', 'Yew', 'Venijnboom']
		},
		{
			id: 'be_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Houx (Ilex aquifolium)',
			names: ['Houx', 'Ilex aquifolium', 'Holly', 'Hulst']
		},
		{
			id: 'be_osmund',
			level: 'veto',
			scope: 'regional',
			label: 'Osmonde royale (Osmunda regalis)',
			names: ['Osmonde', 'Osmunda regalis', 'Koningsvaren']
		},
		{
			id: 'be_juniperus',
			level: 'veto',
			scope: 'regional',
			label: 'Genévrier (Juniperus communis)',
			names: ['Genévrier', 'Juniperus communis', 'Jeneverbes', 'Juniper']
		},
		{
			id: 'be_buxus',
			level: 'caution',
			scope: 'regional',
			label: 'Buis (Buxus sempervirens)',
			names: ['Buis', 'Buxus sempervirens', 'Buxus', 'Boxwood']
		},
		{
			id: 'be_daphne',
			level: 'veto',
			scope: 'regional',
			label: 'Bois-joli (Daphne mezereum)',
			names: ['Bois-joli', 'Daphne mezereum', 'Daphne', 'Peperboompje']
		},
		{
			id: 'be_myrica',
			level: 'caution',
			scope: 'regional',
			label: 'Piment royal (Myrica gale)',
			names: ['Piment royal', 'Myrica gale', 'Gagel', 'Bog myrtle']
		},
		{
			id: 'be_salix_repens',
			level: 'caution',
			scope: 'regional',
			label: 'Saule rampant (Salix repens)',
			names: ['Saule rampant', 'Salix repens', 'Kruipwilg', 'Creeping willow']
		}
	],
	{ sourceName: 'Waarnemingen.be', buildSourceUrl: buildWaarnemingenBeSpeciesSearchUrl }
);

/** Almost no woody yamadori taxa remain nationally listed under Omgevingswet; pack is caution/regional (zorgplicht, Rode Lijst, habitats, bomenverordening). */
export const nlSpeciesProtectionPack = pack(
	'NL',
	[
		{
			id: 'nl_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'Venijnboom (Taxus baccata)',
			names: ['Venijnboom', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'nl_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Hulst (Ilex aquifolium)',
			names: ['Hulst', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'nl_osmund',
			level: 'caution',
			scope: 'regional',
			label: 'Koningsvaren (Osmunda regalis)',
			names: ['Koningsvaren', 'Osmunda regalis', 'Osmonde']
		},
		{
			id: 'nl_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Jeneverbes (Juniperus communis)',
			names: ['Jeneverbes', 'Juniperus communis', 'Genévrier', 'Juniper']
		},
		{
			id: 'nl_buxus',
			level: 'caution',
			scope: 'regional',
			label: 'Buxus (Buxus sempervirens)',
			names: ['Buxus', 'Buxus sempervirens', 'Buis']
		},
		{
			id: 'nl_daphne',
			level: 'caution',
			scope: 'regional',
			label: 'Rood peperboompje (Daphne mezereum)',
			names: ['Peperboompje', 'Daphne mezereum', 'Daphne', 'Bois-joli']
		},
		{
			id: 'nl_myrica',
			level: 'caution',
			scope: 'regional',
			label: 'Gagel (Myrica gale)',
			names: ['Gagel', 'Myrica gale', 'Piment royal', 'Bog myrtle']
		},
		{
			id: 'nl_betula_nana',
			level: 'caution',
			scope: 'regional',
			label: 'Dwergberk (Betula nana)',
			names: ['Dwergberk', 'Betula nana', 'Bouleau nain', 'Dwarf birch']
		}
	],
	{ sourceName: 'Verspreidingsatlas', buildSourceUrl: buildVerspreidingsatlasSpeciesSearchUrl }
);

/** Fridlysning is often län-specific (Idegran/Tibast). `national` unused for woody yamadori in this pack. */
export const seSpeciesProtectionPack = pack(
	'SE',
	[
		{
			id: 'se_taxus',
			level: 'veto',
			scope: 'regional',
			label: 'Idegran (Taxus baccata)',
			names: ['Idegran', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'se_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Järnek (Ilex aquifolium)',
			names: ['Järnek', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'se_betula_nana',
			level: 'caution',
			scope: 'regional',
			label: 'Dvärgbjörk (Betula nana)',
			names: ['Dvärgbjörk', 'Betula nana', 'Bouleau nain', 'Dwarf birch']
		},
		{
			id: 'se_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'En (Juniperus communis)',
			names: ['En', 'Juniperus communis', 'Genévrier', 'Juniper']
		},
		{
			id: 'se_pinus_mugo',
			level: 'caution',
			scope: 'regional',
			label: 'Bergtall (Pinus mugo)',
			names: ['Bergtall', 'Pinus mugo', 'Pin mugo']
		},
		{
			id: 'se_daphne',
			level: 'veto',
			scope: 'regional',
			label: 'Tibast (Daphne mezereum)',
			names: ['Tibast', 'Daphne mezereum', 'Daphne']
		},
		{
			id: 'se_linnaea',
			level: 'caution',
			scope: 'regional',
			label: 'Linnea (Linnaea borealis)',
			names: ['Linnea', 'Linnaea borealis', 'Twinflower', 'Linnée boréale']
		},
		{
			id: 'se_osmunda',
			level: 'caution',
			scope: 'regional',
			label: 'Kungsbräken (Osmunda regalis)',
			names: ['Kungsbräken', 'Osmunda regalis', 'Osmonde royale', 'Royal fern']
		}
	],
	{ sourceName: 'Artfakta (SLU)', buildSourceUrl: buildArtfaktaSpeciesSearchUrl }
);

/** Fredning of woody yamadori taxa is rare nationally; pack is caution/regional (rødliste, vernområder, grunneier). */
export const noSpeciesProtectionPack = pack(
	'NO',
	[
		{
			id: 'no_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'Barlind (Taxus baccata)',
			names: ['Barlind', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'no_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Kristtorn (Ilex aquifolium)',
			names: ['Kristtorn', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'no_betula_nana',
			level: 'caution',
			scope: 'regional',
			label: 'Dvergbjørk (Betula nana)',
			names: ['Dvergbjørk', 'Betula nana', 'Bouleau nain', 'Dwarf birch']
		},
		{
			id: 'no_juniperus',
			level: 'caution',
			scope: 'regional',
			label: 'Einer (Juniperus communis)',
			names: ['Einer', 'Juniperus communis', 'Genévrier', 'Juniper']
		},
		{
			id: 'no_pinus_mugo',
			level: 'caution',
			scope: 'regional',
			label: 'Buskfuru (Pinus mugo)',
			names: ['Buskfuru', 'Pinus mugo', 'Pin mugo']
		},
		{
			id: 'no_daphne',
			level: 'caution',
			scope: 'regional',
			label: 'Tysbast (Daphne mezereum)',
			names: ['Tysbast', 'Daphne mezereum', 'Daphne']
		},
		{
			id: 'no_linnaea',
			level: 'caution',
			scope: 'regional',
			label: 'Nøkleblom (Linnaea borealis)',
			names: ['Nøkleblom', 'Linnaea borealis', 'Twinflower', 'Linnea']
		},
		{
			id: 'no_salix_lapponum',
			level: 'caution',
			scope: 'regional',
			label: 'Lappvier (Salix lapponum)',
			names: ['Lappvier', 'Salix lapponum', 'Saule des Lapons', 'Downy willow']
		}
	],
	{ sourceName: 'Artsdatabanken', buildSourceUrl: buildArtsdatabankenSpeciesSearchUrl }
);
