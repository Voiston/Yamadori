export type BoundingBox = {
	south: number;
	north: number;
	west: number;
	east: number;
};

export type MacroRegion = 'pays_de_la_loire' | 'pyrenees';

export type BiotopeRegion = {
	id: string;
	macroRegion: MacroRegion;
	name: string;
	biotope: string;
	bbox: BoundingBox;
	species: string[];
};

/** Biotopes yamadori — Pays de la Loire et Pyrénées (WGS84, bounding boxes approximatives). */
export const BIOTOPE_REGIONS: BiotopeRegion[] = [
	// — Pays de la Loire —
	{
		id: 'pdl-briere-gavre',
		macroRegion: 'pays_de_la_loire',
		name: 'Brière et Forêt du Gâvre',
		biotope: 'Pins sylvestres et futaies mixtes humides',
		bbox: { south: 47.25, north: 47.55, west: -2.05, east: -1.45 },
		species: ['Pin sylvestre', 'Charme commun', 'Hêtre commun', 'Chêne pédonculé']
	},
	{
		id: 'pdl-littoral-atlantique',
		macroRegion: 'pays_de_la_loire',
		name: 'Littoral atlantique',
		biotope: 'Dunes et friches littorales',
		bbox: { south: 46.2, north: 47.2, west: -2.55, east: -1.05 },
		species: ['Pin maritime', 'Chêne vert', 'Genévrier commun', 'Tamaris']
	},
	{
		id: 'pdl-bocage',
		macroRegion: 'pays_de_la_loire',
		name: 'Bocage angevin et mayennais',
		biotope: 'Bocage humide et haies',
		bbox: { south: 47.0, north: 48.35, west: -1.2, east: 0.35 },
		species: ['Charme commun', 'Hêtre commun', 'Chêne pédonculé', 'If', 'Érable sycomore']
	},
	{
		id: 'pdl-foret-plaine',
		macroRegion: 'pays_de_la_loire',
		name: 'Forêt de plaine',
		biotope: 'Hêtraie-chênaie de plaine (Sarthe, Bercé)',
		bbox: { south: 47.5, north: 48.35, west: -0.45, east: 0.95 },
		species: ['Pin sylvestre', 'Hêtre commun', 'Charme commun', 'Chêne sessile', 'Bouleau']
	},
	{
		id: 'pdl-marais-humide',
		macroRegion: 'pays_de_la_loire',
		name: 'Marais et zones humides',
		biotope: 'Marais briéron et vallées humides',
		bbox: { south: 46.85, north: 47.55, west: -2.15, east: -1.25 },
		species: ['Charme commun', 'Chêne pédonculé', 'Saule', 'Aulne glutineux']
	},
	{
		id: 'pdl-frange-forez',
		macroRegion: 'pays_de_la_loire',
		name: 'Frange du Forez',
		biotope: 'Lisière montagneuse et landes',
		bbox: { south: 45.05, north: 45.55, west: 3.55, east: 4.35 },
		species: ['Pin sylvestre', 'Genévrier commun', 'Érable champêtre']
	},
	// — Pyrénées —
	{
		id: 'pyr-piemont-atlantique',
		macroRegion: 'pyrenees',
		name: 'Piémont atlantique',
		biotope: 'Collines du Pays Basque et Béarn',
		bbox: { south: 42.75, north: 43.55, west: -1.85, east: -0.55 },
		species: ['Chêne pubescent', 'Hêtre commun', 'Noyer', 'Érable sycomore']
	},
	{
		id: 'pyr-vallees-centrales',
		macroRegion: 'pyrenees',
		name: 'Vallées centrales',
		biotope: 'Forêts de montagne moyenne',
		bbox: { south: 42.55, north: 43.25, west: -0.55, east: 1.55 },
		species: ['Pin sylvestre', 'Genévrier commun', 'Pin noir', 'Buis']
	},
	{
		id: 'pyr-haute-montagne',
		macroRegion: 'pyrenees',
		name: 'Haute montagne',
		biotope: 'Étages subalpin et alpin',
		bbox: { south: 42.45, north: 43.05, west: -0.25, east: 2.05 },
		species: ['Pin à crochets', 'Mélèze', 'Genévrier commun']
	},
	{
		id: 'pyr-piemont-oriental',
		macroRegion: 'pyrenees',
		name: 'Piémont oriental',
		biotope: 'Garrigues et piémont méditerranéen',
		bbox: { south: 42.35, north: 43.05, west: 1.55, east: 3.25 },
		species: ['Chêne vert', "Pin d'Alep", 'Genévrier de Phénice']
	},
	{
		id: 'pyr-couserans-ariege',
		macroRegion: 'pyrenees',
		name: 'Couserans et Ariège',
		biotope: 'Versants calcaires et forêts mixtes',
		bbox: { south: 42.65, north: 43.15, west: 0.75, east: 2.05 },
		species: ['Genévrier commun', 'Buis', 'Érable de Montpellier']
	}
];
