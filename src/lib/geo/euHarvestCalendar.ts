/**
 * Indicative dormancy / collection windows for European yamadori species by climate zone.
 * Months are 1–12 inclusive. Editorial guidance — not a legal or agronomic guarantee.
 */

import { BIOTOPE_REGIONS } from '$lib/constants/regions';
import type { CountryCode } from '$lib/geo/countries';
import { matchHarvestSpecies } from '$lib/geo/matchHarvestSpecies';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { isInBoundingBox } from '$lib/utils/species-suggestions';

export type EuHarvestZone = 'eu_atlantic' | 'eu_mediterranean' | 'eu_alpine' | 'eu_continental';

export type EuHarvestWindow = {
	species: string;
	aliases?: readonly string[];
	zone: EuHarvestZone;
	startMonth: number;
	endMonth: number;
	note?: string;
};

export const EU_HARVEST_CALENDAR: readonly EuHarvestWindow[] = [
	{
		species: 'Charme commun',
		aliases: ['Carpinus betulus', 'Hornbeam', 'Hainbuche', 'Carpino bianco', 'Haagbeuk'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Hêtre commun',
		aliases: ['Fagus sylvatica', 'Beech', 'Rotbuche', 'Faggio', 'Beuk'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Chêne pédonculé',
		aliases: ['Quercus robur', 'English oak', 'Stieleiche', 'Farnia'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Chêne sessile',
		aliases: ['Quercus petraea', 'Sessile oak', 'Traubeneiche'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Pin sylvestre',
		aliases: ['Pinus sylvestris', 'Scots pine', 'Waldkiefer', 'Pino silvestre'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Érable sycomore',
		aliases: ['Acer pseudoplatanus', 'Sycamore maple', 'Bergahorn', 'Acero di monte'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Bouleau',
		aliases: ['Betula pendula', 'Silver birch', 'Hänge-Birke', 'Betulla', 'Berk'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'If',
		aliases: ['Taxus baccata', 'Yew', 'Eibe', 'Tasso'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Carvalho-português',
		aliases: ['Quercus faginea', 'Portuguese oak'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Pinheiro-bravo',
		aliases: ['Pinus pinaster', 'Maritime pine', 'Pin maritime'],
		zone: 'eu_atlantic',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Chêne vert',
		aliases: ['Quercus ilex', 'Holm oak', 'Steineiche', 'Leccio', 'Encina'],
		zone: 'eu_mediterranean',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: "Pin d'Alep",
		aliases: ['Pinus halepensis', 'Aleppo pine', 'Aleppo-Kiefer', 'Pino d\'Aleppo'],
		zone: 'eu_mediterranean',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Genévrier de Phénice',
		aliases: ['Juniperus phoenicea', 'Phoenicean juniper'],
		zone: 'eu_mediterranean',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Olivier',
		aliases: ['Olea europaea', 'Olive', 'Olivo', 'Olivenbaum', 'Acebuche'],
		zone: 'eu_mediterranean',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Pin maritime',
		aliases: ['Pinus pinaster', 'Maritime pine', 'Pinheiro-bravo'],
		zone: 'eu_mediterranean',
		startMonth: 11,
		endMonth: 2
	},
	{
		species: 'Érable de Montpellier',
		aliases: ['Acer monspessulanum', 'Montpellier maple'],
		zone: 'eu_mediterranean',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Buis',
		aliases: ['Buxus sempervirens', 'Boxwood', 'Buchsbaum', 'Bosso'],
		zone: 'eu_mediterranean',
		startMonth: 11,
		endMonth: 2
	},
	{
		species: 'Oliveira',
		aliases: ['Olea europaea', 'Olivier', 'Olive'],
		zone: 'eu_mediterranean',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Sobreiro',
		aliases: ['Quercus suber', 'Cork oak', 'Chêne-liège'],
		zone: 'eu_mediterranean',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Azinheira',
		aliases: ['Quercus rotundifolia', 'Holm oak'],
		zone: 'eu_mediterranean',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Mélèze',
		aliases: ['Larix decidua', 'European larch', 'Europäische Lärche', 'Larice'],
		zone: 'eu_alpine',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Pin à crochets',
		aliases: ['Pinus uncinata', 'Mountain pine'],
		zone: 'eu_alpine',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Pin cembro',
		aliases: ['Pinus cembra', 'Swiss stone pine', 'Zirbelkiefer', 'Cirmolo'],
		zone: 'eu_alpine',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Genévrier commun',
		aliases: ['Juniperus communis', 'Common juniper', 'Wacholder', 'Ginepro'],
		zone: 'eu_alpine',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Pin sylvestre',
		aliases: ['Pinus sylvestris', 'Scots pine', 'Waldkiefer', 'Pino silvestre'],
		zone: 'eu_alpine',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Hêtre commun',
		aliases: ['Fagus sylvatica', 'Beech', 'Rotbuche', 'Faggio', 'Beuk'],
		zone: 'eu_continental',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Charme commun',
		aliases: ['Carpinus betulus', 'Hornbeam', 'Hainbuche', 'Carpino bianco', 'Haagbeuk'],
		zone: 'eu_continental',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Érable champêtre',
		aliases: ['Acer campestre', 'Field maple', 'Feldahorn', 'Acero campestre'],
		zone: 'eu_continental',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Pin sylvestre',
		aliases: ['Pinus sylvestris', 'Scots pine', 'Waldkiefer', 'Pino silvestre'],
		zone: 'eu_continental',
		startMonth: 11,
		endMonth: 3
	},
	// Nordic / UK extras on continental & atlantic
	{
		species: 'Bouleau',
		aliases: ['Betula pendula', 'Silver birch', 'Hänge-Birke', 'Björk', 'Bjørk'],
		zone: 'eu_continental',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'If',
		aliases: ['Taxus baccata', 'Yew', 'Eibe', 'Tasso'],
		zone: 'eu_continental',
		startMonth: 11,
		endMonth: 3
	}
];

const MACRO_TO_ZONE: Record<string, EuHarvestZone> = {
	pays_de_la_loire: 'eu_atlantic',
	pyrenees: 'eu_alpine',
	pt_norte: 'eu_atlantic',
	pt_centro: 'eu_mediterranean',
	pt_lisboa: 'eu_mediterranean',
	pt_alentejo: 'eu_mediterranean',
	pt_algarve: 'eu_mediterranean',
	pt_madeira: 'eu_mediterranean',
	pt_azores: 'eu_atlantic'
};

const BIOTOPE_TO_ZONE: Record<string, EuHarvestZone> = {
	'pyr-piemont-oriental': 'eu_mediterranean',
	'pyr-haute-montagne': 'eu_alpine',
	'pyr-vallees-centrales': 'eu_alpine',
	'pyr-piemont-atlantique': 'eu_atlantic',
	'pyr-couserans-ariege': 'eu_atlantic',
	'pdl-frange-forez': 'eu_continental'
};

/** Country → default zone when bbox/biotope heuristics miss (covers IE, Nordics, Rome, etc.). */
const COUNTRY_DEFAULT_ZONE: Partial<Record<CountryCode, EuHarvestZone>> = {
	FR: 'eu_atlantic',
	BE: 'eu_atlantic',
	NL: 'eu_atlantic',
	IE: 'eu_atlantic',
	GB: 'eu_atlantic',
	DK: 'eu_atlantic',
	PT: 'eu_atlantic',
	ES: 'eu_mediterranean',
	IT: 'eu_mediterranean',
	DE: 'eu_continental',
	AT: 'eu_continental',
	CH: 'eu_continental',
	SE: 'eu_continental',
	NO: 'eu_continental',
	FI: 'eu_continental'
};

export function resolveEuHarvestZone(latitude: number, longitude: number): EuHarvestZone | null {
	const regions = BIOTOPE_REGIONS.filter((region) =>
		isInBoundingBox(latitude, longitude, region.bbox)
	);
	for (const region of regions) {
		const fromBiotope = BIOTOPE_TO_ZONE[region.id];
		if (fromBiotope) return fromBiotope;
		const fromMacro = MACRO_TO_ZONE[region.macroRegion];
		if (fromMacro) return fromMacro;
	}

	// Alpine arc (CH / AT / northern IT / eastern FR)
	if (latitude >= 45.5 && latitude <= 48.2 && longitude >= 5.5 && longitude <= 16.5) {
		if (latitude >= 46 && latitude <= 47.5) return 'eu_alpine';
	}

	if (latitude >= 42 && latitude <= 51 && longitude >= -5 && longitude <= 8) {
		if (latitude < 44 && longitude > 2) return 'eu_mediterranean';
		return 'eu_atlantic';
	}
	if (latitude >= 36 && latitude <= 44 && longitude >= -10 && longitude <= 3) {
		return 'eu_mediterranean';
	}
	if (latitude >= 47 && latitude <= 55 && longitude >= 5 && longitude <= 25) {
		return 'eu_continental';
	}

	// Italy south of alpine band
	if (latitude >= 36 && latitude < 45.5 && longitude >= 6 && longitude <= 19) {
		return 'eu_mediterranean';
	}

	const country = resolveCountry(latitude, longitude);
	if (country && COUNTRY_DEFAULT_ZONE[country]) {
		return COUNTRY_DEFAULT_ZONE[country]!;
	}

	return null;
}

export function findEuHarvestWindows(
	species: string,
	zone?: EuHarvestZone | null
): EuHarvestWindow[] {
	if (!species.trim()) return [];
	return EU_HARVEST_CALENDAR.filter((entry) => {
		if (!matchHarvestSpecies(species, entry.species, entry.aliases ?? [])) return false;
		if (zone && entry.zone !== zone) return false;
		return true;
	});
}

export { formatHarvestWindowMonths } from '$lib/geo/usHarvestCalendar';
