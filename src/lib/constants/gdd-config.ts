import { BIOTOPE_REGIONS } from '$lib/constants/regions';
import * as m from '$lib/paraglide/messages.js';
import { isInBoundingBox } from '$lib/utils/species-suggestions';
import type { GddBaseCategory, PhenologyStageId } from '$lib/types/gdd';

export const GDD_BASE_TEMP: Record<
	GddBaseCategory,
	{ min: number; max: number; default: number }
> = {
	montagnarde: { min: 0, max: 3, default: 1.5 },
	foret: { min: 4, max: 5, default: 4.5 },
	standard: { min: 9, max: 10, default: 10 }
};

export function getGddBaseCategoryLabels(): Record<GddBaseCategory, string> {
	return {
		montagnarde: m.gdd_category_montagnarde(),
		foret: m.gdd_category_foret(),
		standard: m.gdd_category_standard()
	};
}

/** Espèces persistantes — GDD brut affiché, phénologie désactivée. */
export const EVERGREEN_SPECIES = new Set([
	'Pin sylvestre',
	'Pin noir',
	'Pin maritime',
	"Pin d'Alep",
	'Pin à crochets',
	'Pin cembro',
	'Genévrier commun',
	'Genévrier de Phénice',
	'Cyprès',
	'Olivier',
	'Buis',
	'If',
	'Tamaris'
]);

const MONTAGNARDE_SPECIES = new Set([
	'Mélèze',
	'Pin à crochets',
	'Pin cembro',
	'Rhododendron ferrugineux',
	'Pin sylvestre',
	'Pin noir',
	'Genévrier commun'
]);

const FORET_SPECIES = new Set([
	'Charme commun',
	'Hêtre commun',
	'Chêne pubescent',
	'Chêne sessile',
	'Chêne pédonculé',
	'Érable sycomore',
	'Érable champêtre',
	'Érable de Montpellier',
	'Bouleau',
	'Noyer',
	'Frêne',
	'Orme',
	'Tilleul',
	'Cornouiller',
	'Troène',
	'Prunellier',
	'Pommier sauvage',
	'Châtaignier',
	'Saule',
	'Aulne glutineux',
	'Chêne vert'
]);

const MONTAGNARDE_BIOTOPE_IDS = new Set([
	'pyr-haute-montagne',
	'pdl-frange-forez',
	'pyr-vallees-centrales'
]);

const FORET_BIOTOPE_IDS = new Set([
	'pdl-briere-gavre',
	'pdl-bocage',
	'pdl-foret-plaine',
	'pdl-marais-humide',
	'pyr-piemont-atlantique',
	'pyr-couserans-ariege'
]);

export const PHENOLOGY_STAGE_IDS: PhenologyStageId[] = [
	'dormance',
	'bourgeon_gonfle',
	'debourrement',
	'feuillaison',
	'croissance_active'
];

export function getPhenologyStages(): { id: PhenologyStageId; label: string; shortLabel: string }[] {
	return [
		{ id: 'dormance', label: m.phenology_dormance(), shortLabel: m.phenology_dormance() },
		{
			id: 'bourgeon_gonfle',
			label: m.phenology_bourgeon_gonfle(),
			shortLabel: m.phenology_bourgeon_gonfle()
		},
		{
			id: 'debourrement',
			label: m.phenology_debourrement(),
			shortLabel: m.phenology_debourrement()
		},
		{ id: 'feuillaison', label: m.phenology_feuillaison(), shortLabel: m.phenology_feuillaison() },
		{
			id: 'croissance_active',
			label: m.phenology_croissance_active(),
			shortLabel: m.phenology_croissance_active()
		}
	];
}

export type PhenologyLogisticParams = { midpoint: number; steepness: number };

/** Midpoints calibrés pour ~70 % débourrement à GDD ≈ 180 (catégorie forêt). */
export const PHENOLOGY_LOGISTIC_PARAMS: Record<
	GddBaseCategory,
	Record<PhenologyStageId, PhenologyLogisticParams>
> = {
	montagnarde: {
		dormance: { midpoint: 15, steepness: 0.08 },
		bourgeon_gonfle: { midpoint: 55, steepness: 0.07 },
		debourrement: { midpoint: 130, steepness: 0.06 },
		feuillaison: { midpoint: 220, steepness: 0.05 },
		croissance_active: { midpoint: 350, steepness: 0.04 }
	},
	foret: {
		dormance: { midpoint: 25, steepness: 0.07 },
		bourgeon_gonfle: { midpoint: 80, steepness: 0.06 },
		debourrement: { midpoint: 165, steepness: 0.055 },
		feuillaison: { midpoint: 280, steepness: 0.045 },
		croissance_active: { midpoint: 420, steepness: 0.04 }
	},
	standard: {
		dormance: { midpoint: 35, steepness: 0.06 },
		bourgeon_gonfle: { midpoint: 110, steepness: 0.055 },
		debourrement: { midpoint: 220, steepness: 0.05 },
		feuillaison: { midpoint: 350, steepness: 0.04 },
		croissance_active: { midpoint: 500, steepness: 0.035 }
	}
};

export function getSpeciesGddCategory(species: string): GddBaseCategory | null {
	const trimmed = species.trim();
	if (!trimmed) return null;
	if (MONTAGNARDE_SPECIES.has(trimmed)) return 'montagnarde';
	if (FORET_SPECIES.has(trimmed)) return 'foret';
	return null;
}

export function getBiotopeGddCategory(latitude: number, longitude: number): GddBaseCategory | null {
	const regions = BIOTOPE_REGIONS.filter((region) =>
		isInBoundingBox(latitude, longitude, region.bbox)
	);
	if (regions.length === 0) return null;

	for (const region of regions) {
		if (MONTAGNARDE_BIOTOPE_IDS.has(region.id)) return 'montagnarde';
	}
	for (const region of regions) {
		if (FORET_BIOTOPE_IDS.has(region.id)) return 'foret';
	}
	return null;
}

export function isEvergreenSpecies(species: string): boolean {
	return EVERGREEN_SPECIES.has(species.trim());
}

export function resolveGddBaseCategory(
	species: string,
	latitude: number,
	longitude: number
): GddBaseCategory {
	const fromSpecies = getSpeciesGddCategory(species);
	if (fromSpecies) return fromSpecies;

	const fromBiotope = getBiotopeGddCategory(latitude, longitude);
	if (fromBiotope) return fromBiotope;

	return 'standard';
}

export function resolveGddBaseTemp(
	species: string,
	latitude: number,
	longitude: number
): { baseTempC: number; category: GddBaseCategory } {
	const category = resolveGddBaseCategory(species, latitude, longitude);
	return {
		baseTempC: GDD_BASE_TEMP[category].default,
		category
	};
}

export type GddSeasonZoneTone = 'muted' | 'good' | 'warn';

export interface GddSeasonZone {
	label: string;
	tone: GddSeasonZoneTone;
}

/** Yamadori-oriented interpretation of cumulative GDD (aligned with YRS optimal window 150–400). */
export function getGddSeasonZone(gdd: number): GddSeasonZone {
	if (gdd < 100) {
		return { label: m.gdd_zone_late_dormancy(), tone: 'muted' };
	}
	if (gdd < 150) {
		return { label: m.gdd_zone_early_awakening(), tone: 'muted' };
	}
	if (gdd <= 400) {
		return { label: m.gdd_zone_favorable_window(), tone: 'good' };
	}
	if (gdd <= 600) {
		return { label: m.gdd_zone_advanced_budbreak(), tone: 'warn' };
	}
	return { label: m.gdd_zone_late_season(), tone: 'warn' };
}
