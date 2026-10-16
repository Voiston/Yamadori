import { getBonsaiPriorityRank } from '$lib/constants/bonsai-species';
import { compareLocalized } from '$lib/utils/i18n/locale';
import { BIOTOPE_REGIONS, type BiotopeRegion, type BoundingBox } from '$lib/constants/regions';

export function isInBoundingBox(latitude: number, longitude: number, bbox: BoundingBox): boolean {
	return (
		latitude >= bbox.south &&
		latitude <= bbox.north &&
		longitude >= bbox.west &&
		longitude <= bbox.east
	);
}

export type SpeciesSuggestions = {
	regions: BiotopeRegion[];
	species: string[];
};

function sortSpeciesByBonsaiPriority(species: string[]): string[] {
	return [...species].sort((a, b) => {
		const diff = getBonsaiPriorityRank(a) - getBonsaiPriorityRank(b);
		return diff !== 0 ? diff : compareLocalized(a, b);
	});
}

export const MAX_FAVORITE_SPECIES = 8;
export const MAX_GPS_SPECIES_PILLS = 5;
const MAX_SPECIES_NAME_LENGTH = 256;

export type ResolveCaptureSpeciesPillsInput = {
	enabled: boolean;
	favorites: readonly string[];
	gpsSpecies: readonly string[];
	gpsReady: boolean;
};

export function normalizeFavoriteSpecies(names: readonly string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const raw of names) {
		const name = raw.trim();
		if (!name || name.length > MAX_SPECIES_NAME_LENGTH) {
			continue;
		}
		const key = name.toLowerCase();
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		result.push(name);
		if (result.length >= MAX_FAVORITE_SPECIES) {
			break;
		}
	}
	return result;
}

export function resolveCaptureSpeciesPills(input: ResolveCaptureSpeciesPillsInput): string[] {
	if (!input.enabled) {
		return [];
	}
	const favorites = normalizeFavoriteSpecies(input.favorites);
	if (favorites.length > 0) {
		return favorites;
	}
	if (!input.gpsReady) {
		return [];
	}
	return input.gpsSpecies.slice(0, MAX_GPS_SPECIES_PILLS);
}

export function getSpeciesSuggestionsForPosition(
	latitude: number,
	longitude: number
): SpeciesSuggestions {
	const regions = BIOTOPE_REGIONS.filter((region) =>
		isInBoundingBox(latitude, longitude, region.bbox)
	);

	const species: string[] = [];
	for (const region of regions) {
		for (const name of region.species) {
			if (!species.includes(name)) {
				species.push(name);
			}
		}
	}

	return { regions, species: sortSpeciesByBonsaiPriority(species) };
}
