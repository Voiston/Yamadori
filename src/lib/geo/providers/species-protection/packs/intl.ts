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
			level: 'caution',
			scope: 'regional',
			label: 'Königsfarn (Osmunda regalis)',
			names: ['Königsfarn', 'Osmunda regalis', 'Osmonde royale']
		}
	],
	{ sourceName: 'FloraWeb (BfN)', buildSourceUrl: buildFloraWebSpeciesSearchUrl }
);

export const esSpeciesProtectionPack = pack(
	'ES',
	[
		{
			id: 'es_taxus',
			level: 'caution',
			scope: 'national',
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
			names: ['Acebuche', 'Olea europaea', 'Olivier sauvage', 'Wild olive']
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
		id: 'it_pinus_heldreichii',
		level: 'caution',
		scope: 'national',
		label: 'Pino loricato (Pinus heldreichii)',
		names: ['Pinus heldreichii', 'Pinus leucodermis', 'Pino loricato', 'Bosnian pine']
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
		label: 'Olivastro (Olea europaea)',
		names: ['Olivastro', 'Olea europaea', 'Olivier', 'Wild olive']
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

export const ptSpeciesProtectionPack = pack(
	'PT',
	[
		{
			id: 'pt_sobreiro',
			level: 'caution',
			scope: 'national',
			label: 'Sobreiro (Quercus suber)',
			names: ['Sobreiro', 'Quercus suber', 'Chêne-liège', 'Cork oak', 'Alcornoque']
		},
		{
			id: 'pt_azinheira',
			level: 'caution',
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

export const gbSpeciesProtectionPack = pack(
	'GB',
	[
		{
			id: 'gb_taxus',
			level: 'caution',
			scope: 'national',
			label: 'Yew (Taxus baccata)',
			names: ['Yew', 'Taxus baccata', 'If']
		},
		{
			id: 'gb_holly',
			level: 'caution',
			scope: 'national',
			label: 'Holly (Ilex aquifolium)',
			names: ['Holly', 'Ilex aquifolium', 'Houx']
		},
		{
			id: 'gb_dwarf_birch',
			level: 'caution',
			scope: 'national',
			label: 'Dwarf birch (Betula nana)',
			names: ['Dwarf birch', 'Betula nana', 'Bouleau nain']
		},
		{
			id: 'gb_juniper',
			level: 'caution',
			scope: 'national',
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
			level: 'veto',
			scope: 'national',
			label: 'Mezereon (Daphne mezereum)',
			names: ['Mezereon', 'Daphne mezereum', 'Bois-joli']
		},
		{
			id: 'gb_twinflower',
			level: 'caution',
			scope: 'national',
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
			id: 'ch_taxus',
			level: 'caution',
			scope: 'national',
			label: 'If (Taxus baccata)',
			names: ['If', 'Taxus baccata', 'Eibe', 'Yew', 'Tasso']
		},
		{
			id: 'ch_ilex',
			level: 'caution',
			scope: 'national',
			label: 'Houx (Ilex aquifolium)',
			names: ['Houx', 'Ilex aquifolium', 'Stechpalme', 'Holly']
		},
		{
			id: 'ch_daphne',
			level: 'veto',
			scope: 'national',
			label: 'Bois-joli (Daphne mezereum)',
			names: ['Bois-joli', 'Daphne mezereum', 'Daphne', 'Seidelbast']
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

export const atSpeciesProtectionPack = pack(
	'AT',
	[
		{
			id: 'at_taxus',
			level: 'veto',
			scope: 'national',
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
			scope: 'national',
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
			level: 'caution',
			scope: 'regional',
			label: 'Osmonde royale (Osmunda regalis)',
			names: ['Osmonde', 'Osmunda regalis', 'Koningsvaren']
		},
		{
			id: 'be_juniperus',
			level: 'caution',
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
			level: 'caution',
			scope: 'regional',
			label: 'Bois-joli (Daphne mezereum)',
			names: ['Bois-joli', 'Daphne mezereum', 'Daphne']
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

export const nlSpeciesProtectionPack = pack(
	'NL',
	[
		{
			id: 'nl_taxus',
			level: 'caution',
			scope: 'national',
			label: 'Venijnboom (Taxus baccata)',
			names: ['Venijnboom', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'nl_ilex',
			level: 'caution',
			scope: 'national',
			label: 'Hulst (Ilex aquifolium)',
			names: ['Hulst', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'nl_osmund',
			level: 'caution',
			scope: 'national',
			label: 'Koningsvaren (Osmunda regalis)',
			names: ['Koningsvaren', 'Osmunda regalis', 'Osmonde']
		},
		{
			id: 'nl_juniperus',
			level: 'caution',
			scope: 'national',
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

export const seSpeciesProtectionPack = pack(
	'SE',
	[
		{
			id: 'se_taxus',
			level: 'caution',
			scope: 'national',
			label: 'Idegran (Taxus baccata)',
			names: ['Idegran', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'se_ilex',
			level: 'caution',
			scope: 'national',
			label: 'Järnek (Ilex aquifolium)',
			names: ['Järnek', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'se_betula_nana',
			level: 'caution',
			scope: 'national',
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
			level: 'caution',
			scope: 'regional',
			label: 'Tibast (Daphne mezereum)',
			names: ['Tibast', 'Daphne mezereum', 'Daphne']
		},
		{
			id: 'se_linnaea',
			level: 'caution',
			scope: 'national',
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

export const noSpeciesProtectionPack = pack(
	'NO',
	[
		{
			id: 'no_taxus',
			level: 'caution',
			scope: 'national',
			label: 'Barlind (Taxus baccata)',
			names: ['Barlind', 'Taxus baccata', 'If', 'Yew']
		},
		{
			id: 'no_ilex',
			level: 'caution',
			scope: 'national',
			label: 'Kristtorn (Ilex aquifolium)',
			names: ['Kristtorn', 'Ilex aquifolium', 'Houx', 'Holly']
		},
		{
			id: 'no_betula_nana',
			level: 'caution',
			scope: 'national',
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
			scope: 'national',
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
