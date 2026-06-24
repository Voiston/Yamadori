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
