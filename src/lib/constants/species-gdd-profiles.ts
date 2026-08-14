/**
 * Per-species / genus GDD–phenology profiles for YRS.
 *
 * Resolution order: exact species override → genus default → category catalog fallback.
 * Numeric values sit in published degree-day ranges where tagged `literature`;
 * otherwise `genus_default` / `editorial`. Not a survival-validated model.
 */

import {
	GDD_BASE_TEMP,
	PHENOLOGY_LOGISTIC_PARAMS,
	YRS_GDD_WINDOWS,
	getSpeciesGddCategory,
	isEvergreenSpecies,
	isSpeciesInYrsCatalog,
	type YrsGddWindow
} from '$lib/constants/gdd-config';
import { resolveSpeciesCanonicalName } from '$lib/constants/species-gdd-aliases';
import type { GddBaseCategory, GddPhenologyStageId } from '$lib/types/gdd';

export type SpeciesGddSource = 'editorial' | 'literature' | 'genus_default';

export interface SpeciesGddProfile {
	baseTempC: number;
	yrsWindow: YrsGddWindow;
	/** Override logistic midpoints; omit → category PHENOLOGY_LOGISTIC_PARAMS */
	phenologyMidpoints?: Partial<Record<GddPhenologyStageId, number>>;
	category: GddBaseCategory;
	source: SpeciesGddSource;
	citation?: string;
}

function categoryProfile(
	category: GddBaseCategory,
	source: SpeciesGddSource,
	citation?: string
): SpeciesGddProfile {
	return {
		baseTempC: GDD_BASE_TEMP[category].default,
		yrsWindow: { ...YRS_GDD_WINDOWS[category] },
		category,
		source,
		citation
	};
}

function withMidpoints(
	base: SpeciesGddProfile,
	midpoints: Partial<Record<GddPhenologyStageId, number>>,
	source: SpeciesGddSource,
	citation: string
): SpeciesGddProfile {
	return { ...base, phenologyMidpoints: midpoints, source, citation };
}

/**
 * Genus-level defaults (EU yamadori targets).
 * Tbase / budbreak midpoints chosen within common temperate degree-day literature ranges
 * (e.g. Quercus later than Betula; Fagus relatively narrow).
 */
const GENUS_DEFAULTS: Record<string, SpeciesGddProfile> = {
	Quercus: withMidpoints(
		{
			baseTempC: 5.5,
			yrsWindow: { earlyMin: 80, optimalMin: 160, optimalMax: 420, lateMax: 580 },
			category: 'foret',
			source: 'literature',
			citation: 'genus Quercus EU — Tbase~5–6, later budbreak vs Betula'
		},
		{
			dormance: 30,
			bourgeon_gonfle: 100,
			debourrement: 200,
			feuillaison: 320,
			croissance_active: 460
		},
		'literature',
		'genus Quercus EU — Tbase~5–6, later budbreak vs Betula'
	),
	Fagus: withMidpoints(
		{
			baseTempC: 5,
			yrsWindow: { earlyMin: 70, optimalMin: 140, optimalMax: 320, lateMax: 450 },
			category: 'foret',
			source: 'literature',
			citation: 'genus Fagus — narrow temperate budbreak window'
		},
		{
			dormance: 25,
			bourgeon_gonfle: 90,
			debourrement: 175,
			feuillaison: 280,
			croissance_active: 400
		},
		'literature',
		'genus Fagus — narrow temperate budbreak window'
	),
	Acer: withMidpoints(
		{
			baseTempC: 5,
			yrsWindow: { earlyMin: 50, optimalMin: 100, optimalMax: 300, lateMax: 450 },
			category: 'foret',
			source: 'literature',
			citation: 'genus Acer EU — early deciduous'
		},
		{
			dormance: 20,
			bourgeon_gonfle: 70,
			debourrement: 140,
			feuillaison: 250,
			croissance_active: 380
		},
		'literature',
		'genus Acer EU — early deciduous'
	),
	AcerPalmatum: withMidpoints(
		{
			baseTempC: 5.5,
			yrsWindow: { earlyMin: 60, optimalMin: 120, optimalMax: 340, lateMax: 480 },
			category: 'foret',
			source: 'genus_default',
			citation: 'Acer palmatum — editorial JP deciduous vs EU Acer'
		},
		{
			dormance: 25,
			bourgeon_gonfle: 85,
			debourrement: 160,
			feuillaison: 270,
			croissance_active: 400
		},
		'genus_default',
		'Acer palmatum — editorial JP deciduous vs EU Acer'
	),
	Betula: withMidpoints(
		{
			baseTempC: 4,
			yrsWindow: { earlyMin: 40, optimalMin: 80, optimalMax: 260, lateMax: 400 },
			category: 'foret',
			source: 'literature',
			citation: 'genus Betula — early budbreak, low Tbase'
		},
		{
			dormance: 15,
			bourgeon_gonfle: 55,
			debourrement: 110,
			feuillaison: 220,
			croissance_active: 350
		},
		'literature',
		'genus Betula — early budbreak, low Tbase'
	),
	Carpinus: withMidpoints(
		{
			baseTempC: 4.5,
			yrsWindow: { earlyMin: 55, optimalMin: 110, optimalMax: 330, lateMax: 480 },
			category: 'foret',
			source: 'genus_default',
			citation: 'genus Carpinus — forêt-aligned, slight early shift'
		},
		{
			dormance: 22,
			bourgeon_gonfle: 75,
			debourrement: 155,
			feuillaison: 270,
			croissance_active: 410
		},
		'genus_default',
		'genus Carpinus — forêt-aligned, slight early shift'
	),
	Zelkova: withMidpoints(
		{
			baseTempC: 5.5,
			yrsWindow: { earlyMin: 60, optimalMin: 120, optimalMax: 340, lateMax: 480 },
			category: 'foret',
			source: 'genus_default',
			citation: 'genus Zelkova — Acer-like editorial JP'
		},
		{
			dormance: 25,
			bourgeon_gonfle: 85,
			debourrement: 165,
			feuillaison: 275,
			croissance_active: 410
		},
		'genus_default',
		'genus Zelkova — Acer-like editorial JP'
	),
	Pinus: {
		baseTempC: 5,
		yrsWindow: { earlyMin: 50, optimalMin: 100, optimalMax: 450, lateMax: 650 },
		category: 'montagnarde',
		source: 'genus_default',
		citation: 'genus Pinus evergreen — wide lift window, no phenology logistic'
	},
	Juniperus: {
		baseTempC: 4,
		yrsWindow: { earlyMin: 40, optimalMin: 90, optimalMax: 420, lateMax: 600 },
		category: 'montagnarde',
		source: 'genus_default',
		citation: 'genus Juniperus evergreen — wide lift window'
	}
};

/** Map catalog display names → genus key in GENUS_DEFAULTS. */
const SPECIES_GENUS: Record<string, keyof typeof GENUS_DEFAULTS> = {
	'Chêne sessile': 'Quercus',
	'Chêne pédonculé': 'Quercus',
	'Chêne pubescent': 'Quercus',
	'Chêne vert': 'Quercus',
	'Coast live oak': 'Quercus',
	'Carvalho-português': 'Quercus',
	'Hêtre commun': 'Fagus',
	'Southern beech': 'Fagus',
	'Érable sycomore': 'Acer',
	'Érable champêtre': 'Acer',
	'Érable de Montpellier': 'Acer',
	'Red maple': 'Acer',
	'Sugar maple': 'Acer',
	'Japanese maple': 'AcerPalmatum',
	'Acer palmatum': 'AcerPalmatum',
	Bouleau: 'Betula',
	'Quaking aspen': 'Betula',
	'Yellow birch': 'Betula',
	'Paper birch': 'Betula',
	'Charme commun': 'Carpinus',
	Zelkova: 'Zelkova',
	'Zelkova serrata': 'Zelkova',
	Keyaki: 'Zelkova',
	'Pin sylvestre': 'Pinus',
	'Pin noir': 'Pinus',
	'Pin maritime': 'Pinus',
	"Pin d'Alep": 'Pinus',
	'Pin à crochets': 'Pinus',
	'Pin cembro': 'Pinus',
	'Ponderosa pine': 'Pinus',
	'Lodgepole pine': 'Pinus',
	'Bristlecone pine': 'Pinus',
	'Jack pine': 'Pinus',
	'Japanese black pine': 'Pinus',
	'Pinus thunbergii': 'Pinus',
	'Pin noir du Japon': 'Pinus',
	'Japanese red pine': 'Pinus',
	'Pinus densiflora': 'Pinus',
	'Pin rouge du Japon': 'Pinus',
	'Japanese white pine': 'Pinus',
	'Pinus parviflora': 'Pinus',
	'Pin blanc du Japon': 'Pinus',
	'Pinheiro-bravo': 'Pinus',
	'Genévrier commun': 'Juniperus',
	'Genévrier de Phénice': 'Juniperus',
	'Utah juniper': 'Juniperus',
	'California juniper': 'Juniperus',
	'Rocky Mountain juniper': 'Juniperus',
	'Japanese juniper': 'Juniperus',
	'Juniperus chinensis': 'Juniperus',
	'Genévrier de Chine': 'Juniperus'
};

/** Species-specific overrides (win over genus). */
const SPECIES_OVERRIDES: Record<string, SpeciesGddProfile> = {
	'Chêne pédonculé': withMidpoints(
		GENUS_DEFAULTS.Quercus,
		{
			dormance: 28,
			bourgeon_gonfle: 95,
			debourrement: 190,
			feuillaison: 310,
			croissance_active: 450
		},
		'literature',
		'Quercus robur — slightly earlier than sessile within Quercus band'
	),
	'Chêne sessile': withMidpoints(
		GENUS_DEFAULTS.Quercus,
		{
			dormance: 32,
			bourgeon_gonfle: 105,
			debourrement: 210,
			feuillaison: 330,
			croissance_active: 470
		},
		'literature',
		'Quercus petraea — later than robur within Quercus band'
	)
};

function catalogNamesForAlias(): string[] {
	return [
		...Object.keys(SPECIES_GENUS),
		...Object.keys(SPECIES_OVERRIDES),
		'Hêtre commun',
		'Bouleau',
		'Charme commun'
	];
}

export function resolveSpeciesGddProfile(
	species: string | undefined | null
): SpeciesGddProfile | null {
	if (!species?.trim()) return null;
	const trimmed = species.trim();
	const canonical =
		resolveSpeciesCanonicalName(trimmed, catalogNamesForAlias()) ??
		resolveSpeciesCanonicalName(trimmed, Object.keys(SPECIES_GENUS)) ??
		trimmed;

	if (SPECIES_OVERRIDES[canonical]) return SPECIES_OVERRIDES[canonical];
	if (SPECIES_OVERRIDES[trimmed]) return SPECIES_OVERRIDES[trimmed];

	const genus = SPECIES_GENUS[canonical] ?? SPECIES_GENUS[trimmed];
	if (genus && GENUS_DEFAULTS[genus]) return GENUS_DEFAULTS[genus];

	const category = getSpeciesGddCategory(canonical) ?? getSpeciesGddCategory(trimmed);
	if (category) {
		return categoryProfile(category, 'editorial', 'catalog category default');
	}

	if (isEvergreenSpecies(canonical) || isEvergreenSpecies(trimmed)) {
		return {
			...categoryProfile('montagnarde', 'editorial', 'evergreen catalog — wide lift window'),
			yrsWindow: { earlyMin: 50, optimalMin: 100, optimalMax: 450, lateMax: 650 }
		};
	}

	if (isSpeciesInYrsCatalog(canonical) || isSpeciesInYrsCatalog(trimmed)) {
		return categoryProfile('foret', 'editorial', 'catalog fallback');
	}

	return null;
}

/** Logistic params for phenology: category steepness + optional species midpoints. */
export function resolvePhenologyLogisticParams(
	category: GddBaseCategory,
	species?: string | null
): Record<GddPhenologyStageId, { midpoint: number; steepness: number }> {
	const base = PHENOLOGY_LOGISTIC_PARAMS[category];
	const profile = resolveSpeciesGddProfile(species);
	const midpoints = profile?.phenologyMidpoints;
	if (!midpoints) return base;

	return {
		dormance: {
			midpoint: midpoints.dormance ?? base.dormance.midpoint,
			steepness: base.dormance.steepness
		},
		bourgeon_gonfle: {
			midpoint: midpoints.bourgeon_gonfle ?? base.bourgeon_gonfle.midpoint,
			steepness: base.bourgeon_gonfle.steepness
		},
		pointe_verte: {
			midpoint: midpoints.pointe_verte ?? base.pointe_verte.midpoint,
			steepness: base.pointe_verte.steepness
		},
		debourrement: {
			midpoint: midpoints.debourrement ?? base.debourrement.midpoint,
			steepness: base.debourrement.steepness
		},
		feuillaison: {
			midpoint: midpoints.feuillaison ?? base.feuillaison.midpoint,
			steepness: base.feuillaison.steepness
		},
		croissance_active: {
			midpoint: midpoints.croissance_active ?? base.croissance_active.midpoint,
			steepness: base.croissance_active.steepness
		}
	};
}

export function resolveYrsGddWindowForSpecies(
	species: string | undefined,
	fallbackCategory: GddBaseCategory
): YrsGddWindow {
	const profile = resolveSpeciesGddProfile(species);
	if (profile) return profile.yrsWindow;
	return YRS_GDD_WINDOWS[fallbackCategory];
}
