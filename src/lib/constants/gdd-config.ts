import { BIOTOPE_REGIONS } from '$lib/constants/regions';
import { resolveSpeciesCanonicalName } from '$lib/constants/species-gdd-aliases';
import * as m from '$lib/paraglide/messages.js';
import { isInBoundingBox } from '$lib/utils/species-suggestions';
import type { GddBaseCategory, GddPhenologyStageId, PhenologyStageId } from '$lib/types/gdd';

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
	'Tamaris',
	// US / CA
	'Utah juniper',
	'Ponderosa pine',
	'California juniper',
	'Douglas fir',
	'Lodgepole pine',
	'Bristlecone pine',
	'Engelmann spruce',
	'Rocky Mountain juniper',
	'Eastern hemlock',
	'Eastern white cedar',
	'White spruce',
	'Jack pine',
	// NZ / AU
	'Pohutukawa',
	'Mānuka',
	'Kānuka',
	'Kauri',
	'Tōtara',
	'Rimu',
	'Kahikatea',
	'Banksia',
	'Sheoak',
	'Bottlebrush',
	'Huon pine',
	'Celery-top pine',
	// PT
	'Pinheiro-bravo',
	'Sobreiro',
	'Oliveira',
	'Azinheira',
	// JP
	'Japanese black pine',
	'Pinus thunbergii',
	'Pin noir du Japon',
	'Japanese red pine',
	'Pinus densiflora',
	'Pin rouge du Japon',
	'Japanese white pine',
	'Pinus parviflora',
	'Pin blanc du Japon',
	'Japanese juniper',
	'Juniperus chinensis',
	'Genévrier de Chine'
]);

const MONTAGNARDE_SPECIES = new Set([
	'Mélèze',
	'Pin à crochets',
	'Pin cembro',
	'Rhododendron ferrugineux',
	'Pin sylvestre',
	'Pin noir',
	'Genévrier commun',
	'Ponderosa pine',
	'Bristlecone pine',
	'Engelmann spruce',
	'Rocky Mountain juniper',
	'Lodgepole pine',
	'Western larch',
	'White spruce',
	'Huon pine',
	'Celery-top pine',
	'Southern beech',
	// JP
	'Japanese black pine',
	'Pinus thunbergii',
	'Pin noir du Japon',
	'Japanese red pine',
	'Pinus densiflora',
	'Japanese white pine',
	'Pinus parviflora',
	'Japanese juniper',
	'Juniperus chinensis',
	'Genévrier de Chine'
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
	'Chêne vert',
	'Douglas fir',
	'Western larch',
	'Eastern hemlock',
	'Red maple',
	'Quaking aspen',
	'Sugar maple',
	'Yellow birch',
	'Paper birch',
	'Tamarack',
	'Coast live oak',
	'Tōtara',
	'Rimu',
	'Kahikatea',
	'Lancewood',
	'Southern beech',
	'Carvalho-português',
	// JP
	'Zelkova',
	'Zelkova serrata',
	'Keyaki',
	'Japanese maple',
	'Acer palmatum',
	'Érable du Japon',
	'Japanese beech',
	'Fagus crenata',
	'Hêtre du Japon',
	'Konara oak',
	'Quercus serrata'
]);

const MONTAGNARDE_BIOTOPE_IDS = new Set([
	'pyr-haute-montagne',
	'pdl-frange-forez',
	'pyr-vallees-centrales',
	'us-rockies',
	'ca-rockies',
	'nz-otago',
	'au-tas'
]);

const FORET_BIOTOPE_IDS = new Set([
	'pdl-briere-gavre',
	'pdl-bocage',
	'pdl-foret-plaine',
	'pdl-marais-humide',
	'pyr-piemont-atlantique',
	'pyr-couserans-ariege',
	'us-pacific-northwest',
	'us-appalachians',
	'ca-bc-coast',
	'ca-bc-interior',
	'ca-boreal',
	'ca-quebec',
	'ca-maritimes',
	'nz-west-coast',
	'nz-central-ni',
	'nz-nelson',
	'nz-canterbury',
	'nz-wellington'
]);

export const GDD_PHENOLOGY_STAGE_IDS: GddPhenologyStageId[] = [
	'dormance',
	'bourgeon_gonfle',
	'pointe_verte',
	'debourrement',
	'feuillaison',
	'croissance_active'
];

export const PHENOLOGY_STAGE_IDS: PhenologyStageId[] = [
	...GDD_PHENOLOGY_STAGE_IDS,
	'chandelle',
	'pinceau'
];

export function getPhenologyStages(): {
	id: GddPhenologyStageId;
	label: string;
	shortLabel: string;
}[] {
	return [
		{ id: 'dormance', label: m.phenology_dormance(), shortLabel: m.phenology_dormance() },
		{
			id: 'bourgeon_gonfle',
			label: m.phenology_bourgeon_gonfle(),
			shortLabel: m.phenology_bourgeon_gonfle()
		},
		{
			id: 'pointe_verte',
			label: m.phenology_pointe_verte(),
			shortLabel: m.phenology_pointe_verte()
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

export function getFieldOnlyPhenologyStages(): {
	id: PhenologyStageId;
	label: string;
	shortLabel: string;
}[] {
	return [
		{ id: 'chandelle', label: m.phenology_chandelle(), shortLabel: m.phenology_chandelle() },
		{ id: 'pinceau', label: m.phenology_pinceau(), shortLabel: m.phenology_pinceau() }
	];
}

export function getPhenologyStageMeta(
	stageId: PhenologyStageId
): { id: PhenologyStageId; label: string; shortLabel: string } | undefined {
	return (
		getPhenologyStages().find((stage) => stage.id === stageId) ??
		getFieldOnlyPhenologyStages().find((stage) => stage.id === stageId)
	);
}

export type PhenologyLogisticParams = { midpoint: number; steepness: number };

/** Midpoints calibrés pour ~70 % débourrement à GDD ≈ 180 (catégorie forêt). */
export const PHENOLOGY_LOGISTIC_PARAMS: Record<
	GddBaseCategory,
	Record<GddPhenologyStageId, PhenologyLogisticParams>
> = {
	montagnarde: {
		dormance: { midpoint: 15, steepness: 0.08 },
		bourgeon_gonfle: { midpoint: 45, steepness: 0.07 },
		pointe_verte: { midpoint: 90, steepness: 0.065 },
		debourrement: { midpoint: 130, steepness: 0.06 },
		feuillaison: { midpoint: 220, steepness: 0.05 },
		croissance_active: { midpoint: 350, steepness: 0.04 }
	},
	foret: {
		dormance: { midpoint: 25, steepness: 0.07 },
		bourgeon_gonfle: { midpoint: 70, steepness: 0.06 },
		pointe_verte: { midpoint: 120, steepness: 0.055 },
		debourrement: { midpoint: 165, steepness: 0.055 },
		feuillaison: { midpoint: 280, steepness: 0.045 },
		croissance_active: { midpoint: 420, steepness: 0.04 }
	},
	standard: {
		dormance: { midpoint: 35, steepness: 0.06 },
		bourgeon_gonfle: { midpoint: 95, steepness: 0.055 },
		pointe_verte: { midpoint: 155, steepness: 0.05 },
		debourrement: { midpoint: 220, steepness: 0.05 },
		feuillaison: { midpoint: 350, steepness: 0.04 },
		croissance_active: { midpoint: 500, steepness: 0.035 }
	}
};

function allGddCatalogNames(): string[] {
	return [...MONTAGNARDE_SPECIES, ...FORET_SPECIES, ...EVERGREEN_SPECIES];
}

export function getSpeciesGddCategory(species: string): GddBaseCategory | null {
	const trimmed = species.trim();
	if (!trimmed) return null;

	const resolved =
		resolveSpeciesCanonicalName(trimmed, allGddCatalogNames()) ??
		(MONTAGNARDE_SPECIES.has(trimmed) || FORET_SPECIES.has(trimmed) ? trimmed : null);
	if (!resolved) return null;
	if (MONTAGNARDE_SPECIES.has(resolved)) return 'montagnarde';
	if (FORET_SPECIES.has(resolved)) return 'foret';
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
	const trimmed = species.trim();
	if (!trimmed) return false;
	if (EVERGREEN_SPECIES.has(trimmed)) return true;
	const resolved = resolveSpeciesCanonicalName(trimmed, EVERGREEN_SPECIES);
	return resolved !== null && EVERGREEN_SPECIES.has(resolved);
}

/** True when the species is in the YRS GDD catalog (foret, montagnarde, or evergreen). */
export function isSpeciesInYrsCatalog(species: string): boolean {
	const trimmed = species.trim();
	if (!trimmed) return false;
	if (getSpeciesGddCategory(trimmed) !== null) return true;
	return isEvergreenSpecies(trimmed);
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

/** Species/category GDD harvest windows for YRS climate scoring (aligned with phenology midpoints). */
export interface YrsGddWindow {
	optimalMin: number;
	optimalMax: number;
	earlyMin: number;
	lateMax: number;
}

export const YRS_GDD_WINDOWS: Record<GddBaseCategory, YrsGddWindow> = {
	montagnarde: { optimalMin: 80, optimalMax: 280, earlyMin: 40, lateMax: 400 },
	foret: { optimalMin: 120, optimalMax: 350, earlyMin: 60, lateMax: 500 },
	standard: { optimalMin: 150, optimalMax: 400, earlyMin: 80, lateMax: 550 }
};

export function getYrsGddWindow(category: GddBaseCategory = 'standard'): YrsGddWindow {
	return YRS_GDD_WINDOWS[category];
}

/**
 * Resolve the GDD category used for YRS windows: species mapping first, then AgriData snapshot.
 */
export function resolveYrsGddCategory(
	species: string | undefined,
	fallbackCategory: GddBaseCategory | null | undefined
): GddBaseCategory {
	if (species?.trim()) {
		const fromSpecies = getSpeciesGddCategory(species);
		if (fromSpecies) return fromSpecies;
	}
	return fallbackCategory ?? 'standard';
}

/** Yamadori-oriented interpretation of cumulative GDD (category-aware optimal window). */
export function getGddSeasonZone(
	gdd: number,
	category: GddBaseCategory = 'standard'
): GddSeasonZone {
	const window = getYrsGddWindow(category);
	if (gdd < window.earlyMin) {
		return { label: m.gdd_zone_late_dormancy(), tone: 'muted' };
	}
	if (gdd < window.optimalMin) {
		return { label: m.gdd_zone_early_awakening(), tone: 'muted' };
	}
	if (gdd <= window.optimalMax) {
		return { label: m.gdd_zone_favorable_window(), tone: 'good' };
	}
	if (gdd <= window.lateMax) {
		return { label: m.gdd_zone_advanced_budbreak(), tone: 'warn' };
	}
	return { label: m.gdd_zone_late_season(), tone: 'warn' };
}
