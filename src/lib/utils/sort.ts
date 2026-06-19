import { CALIBER_ORDER, SIZE_CLASS_ORDER } from '$lib/constants/assessment';
import type { Tree } from '$lib/types/tree';
import { haversineDistanceM } from '$lib/utils/haversine';

export type SortKey =
	| 'date_desc'
	| 'date_asc'
	| 'distance_asc'
	| 'distance_desc'
	| 'potential_desc'
	| 'potential_asc'
	| 'size_class'
	| 'caliber'
	| 'trunk_diameter'
	| 'species'
	| 'altitude_desc'
	| 'altitude_asc';

export interface UserPosition {
	latitude: number;
	longitude: number;
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
	{ value: 'date_desc', label: 'Date (récent)' },
	{ value: 'date_asc', label: 'Date (ancien)' },
	{ value: 'distance_asc', label: 'Distance (proche)' },
	{ value: 'distance_desc', label: 'Distance (loin)' },
	{ value: 'potential_desc', label: 'Potentiel (élevé)' },
	{ value: 'potential_asc', label: 'Potentiel (faible)' },
	{ value: 'size_class', label: 'Taille' },
	{ value: 'caliber', label: 'Calibre' },
	{ value: 'trunk_diameter', label: 'Diamètre tronc' },
	{ value: 'species', label: 'Espèce (A–Z)' },
	{ value: 'altitude_desc', label: 'Altitude (haute)' },
	{ value: 'altitude_asc', label: 'Altitude (basse)' }
];

function distanceForTree(tree: Tree, userPosition?: UserPosition): number | null {
	if (
		!userPosition ||
		tree.latitude === null ||
		tree.longitude === null
	) {
		return null;
	}
	return haversineDistanceM(
		userPosition.latitude,
		userPosition.longitude,
		tree.latitude,
		tree.longitude
	);
}

function compareNullableNumber(
	a: number | null,
	b: number | null,
	direction: 'asc' | 'desc'
): number {
	if (a === null && b === null) return 0;
	if (a === null) return 1;
	if (b === null) return -1;
	return direction === 'asc' ? a - b : b - a;
}

export function sortTrees(
	trees: Tree[],
	key: SortKey,
	userPosition?: UserPosition
): Tree[] {
	const sorted = [...trees];

	sorted.sort((a, b) => {
		if (a.isFavorite !== b.isFavorite) {
			return a.isFavorite ? -1 : 1;
		}

		switch (key) {
			case 'date_desc':
				return b.capturedAt.localeCompare(a.capturedAt);
			case 'date_asc':
				return a.capturedAt.localeCompare(b.capturedAt);
			case 'distance_asc':
				return compareNullableNumber(
					distanceForTree(a, userPosition),
					distanceForTree(b, userPosition),
					'asc'
				);
			case 'distance_desc':
				return compareNullableNumber(
					distanceForTree(a, userPosition),
					distanceForTree(b, userPosition),
					'desc'
				);
			case 'potential_desc':
				return compareNullableNumber(
					a.assessment.potentialScore,
					b.assessment.potentialScore,
					'desc'
				);
			case 'potential_asc':
				return compareNullableNumber(
					a.assessment.potentialScore,
					b.assessment.potentialScore,
					'asc'
				);
			case 'size_class': {
				const aVal = a.assessment.sizeClass ? SIZE_CLASS_ORDER[a.assessment.sizeClass] : null;
				const bVal = b.assessment.sizeClass ? SIZE_CLASS_ORDER[b.assessment.sizeClass] : null;
				return compareNullableNumber(aVal, bVal, 'asc');
			}
			case 'caliber': {
				const aVal = a.assessment.caliber ? CALIBER_ORDER[a.assessment.caliber] : null;
				const bVal = b.assessment.caliber ? CALIBER_ORDER[b.assessment.caliber] : null;
				return compareNullableNumber(aVal, bVal, 'asc');
			}
			case 'trunk_diameter':
				return compareNullableNumber(
					a.assessment.trunkDiameterCm,
					b.assessment.trunkDiameterCm,
					'desc'
				);
			case 'species':
				return a.species.localeCompare(b.species, 'fr');
			case 'altitude_desc':
				return compareNullableNumber(a.altitudeMeters, b.altitudeMeters, 'desc');
			case 'altitude_asc':
				return compareNullableNumber(a.altitudeMeters, b.altitudeMeters, 'asc');
			default:
				return 0;
		}
	});

	return sorted;
}

export function getTreeDistance(tree: Tree, userPosition?: UserPosition): number | null {
	return distanceForTree(tree, userPosition);
}

export function needsUserPosition(key: SortKey): boolean {
	return key === 'distance_asc' || key === 'distance_desc';
}
