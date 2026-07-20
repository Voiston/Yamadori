export type BoundingBox = {
	south: number;
	north: number;
	west: number;
	east: number;
};

export type MacroRegion =
	| 'pays_de_la_loire'
	| 'pyrenees'
	| 'us_southwest'
	| 'us_pacific_northwest'
	| 'us_rockies'
	| 'us_appalachians'
	| 'us_california'
	| 'ca_bc_coast'
	| 'ca_bc_interior'
	| 'ca_rockies'
	| 'ca_prairies'
	| 'ca_boreal'
	| 'ca_quebec'
	| 'ca_maritimes'
	| 'nz_northland'
	| 'nz_central_ni'
	| 'nz_wellington'
	| 'nz_nelson'
	| 'nz_west_coast'
	| 'nz_canterbury'
	| 'nz_otago'
	| 'pt_norte'
	| 'pt_centro'
	| 'pt_lisboa'
	| 'pt_alentejo'
	| 'pt_algarve'
	| 'pt_madeira'
	| 'pt_azores';

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
	},
	// — USA —
	{
		id: 'us-southwest-deserts',
		macroRegion: 'us_southwest',
		name: 'Southwest deserts & plateaus',
		biotope: 'Pinyon-juniper and high desert',
		bbox: { south: 31.0, north: 38.5, west: -115.5, east: -105.5 },
		species: ['Utah juniper', 'Ponderosa pine', 'California juniper']
	},
	{
		id: 'us-pacific-northwest',
		macroRegion: 'us_pacific_northwest',
		name: 'Pacific Northwest',
		biotope: 'Conifer forests and coastal ranges',
		bbox: { south: 42.0, north: 49.0, west: -124.5, east: -116.5 },
		species: ['Douglas fir', 'Western larch', 'Lodgepole pine']
	},
	{
		id: 'us-rockies',
		macroRegion: 'us_rockies',
		name: 'Rocky Mountains',
		biotope: 'Subalpine and montane conifers',
		bbox: { south: 35.0, north: 49.0, west: -114.0, east: -104.0 },
		species: ['Ponderosa pine', 'Bristlecone pine', 'Engelmann spruce', 'Rocky Mountain juniper']
	},
	{
		id: 'us-appalachians',
		macroRegion: 'us_appalachians',
		name: 'Appalachians',
		biotope: 'Eastern hardwoods and hemlock',
		bbox: { south: 34.0, north: 45.0, west: -85.0, east: -74.0 },
		species: ['Eastern hemlock', 'Red maple', 'Quaking aspen']
	},
	{
		id: 'us-california',
		macroRegion: 'us_california',
		name: 'California chaparral & coast',
		biotope: 'Coast live oak and California juniper',
		bbox: { south: 32.5, north: 42.0, west: -124.5, east: -114.0 },
		species: ['Coast live oak', 'California juniper', 'Ponderosa pine']
	},
	// — Canada —
	{
		id: 'ca-bc-coast',
		macroRegion: 'ca_bc_coast',
		name: 'BC Coast',
		biotope: 'Coastal temperate rainforest',
		bbox: { south: 48.0, north: 55.5, west: -129.5, east: -122.5 },
		species: ['Douglas fir', 'Western larch']
	},
	{
		id: 'ca-bc-interior',
		macroRegion: 'ca_bc_interior',
		name: 'BC Interior',
		biotope: 'Dry interior forests and plateaus',
		bbox: { south: 49.0, north: 56.0, west: -122.5, east: -114.0 },
		species: ['Ponderosa pine', 'Lodgepole pine', 'Douglas fir', 'Western larch']
	},
	{
		id: 'ca-rockies',
		macroRegion: 'ca_rockies',
		name: 'Canadian Rockies',
		biotope: 'Subalpine conifers',
		bbox: { south: 49.0, north: 54.5, west: -120.0, east: -113.5 },
		species: ['Engelmann spruce', 'Lodgepole pine', 'Western larch']
	},
	{
		id: 'ca-prairies',
		macroRegion: 'ca_prairies',
		name: 'Prairies',
		biotope: 'Parkland and dry forest edges',
		bbox: { south: 49.0, north: 54.0, west: -114.0, east: -96.0 },
		species: ['White spruce', 'Quaking aspen', 'Jack pine']
	},
	{
		id: 'ca-boreal',
		macroRegion: 'ca_boreal',
		name: 'Boreal Shield',
		biotope: 'Boreal conifers and birch',
		bbox: { south: 46.0, north: 56.0, west: -96.0, east: -74.0 },
		species: ['White spruce', 'Jack pine', 'Tamarack', 'Paper birch']
	},
	{
		id: 'ca-quebec',
		macroRegion: 'ca_quebec',
		name: 'Québec / Appalachians',
		biotope: 'Northern hardwoods and cedar',
		bbox: { south: 45.0, north: 50.0, west: -75.0, east: -64.0 },
		species: ['Sugar maple', 'Eastern white cedar', 'Yellow birch', 'Eastern hemlock']
	},
	{
		id: 'ca-maritimes',
		macroRegion: 'ca_maritimes',
		name: 'Maritimes',
		biotope: 'Acadian forest',
		bbox: { south: 43.5, north: 48.0, west: -67.5, east: -59.5 },
		species: ['Eastern white cedar', 'Eastern hemlock', 'Red maple', 'Paper birch']
	},
	// — New Zealand —
	{
		id: 'nz-northland',
		macroRegion: 'nz_northland',
		name: 'Northland / Auckland',
		biotope: 'Coastal subtropical and kauri–broadleaf',
		bbox: { south: -37.5, north: -34.0, west: 172.5, east: 175.5 },
		species: ['Pohutukawa', 'Mānuka', 'Kānuka', 'Kauri']
	},
	{
		id: 'nz-central-ni',
		macroRegion: 'nz_central_ni',
		name: 'Central North Island',
		biotope: 'Volcanic plateau and mixed podocarp',
		bbox: { south: -39.8, north: -37.5, west: 174.5, east: 177.5 },
		species: ['Tōtara', 'Rimu', 'Mānuka', 'Kānuka']
	},
	{
		id: 'nz-wellington',
		macroRegion: 'nz_wellington',
		name: 'Wellington / East Coast',
		biotope: 'Coastal scrub and regenerating forest',
		bbox: { south: -41.6, north: -39.8, west: 174.0, east: 178.5 },
		species: ['Lancewood', 'Kānuka', 'Mānuka']
	},
	{
		id: 'nz-nelson',
		macroRegion: 'nz_nelson',
		name: 'Nelson / Marlborough',
		biotope: 'Dry hills and beech margins',
		bbox: { south: -42.5, north: -40.4, west: 172.0, east: 174.5 },
		species: ['Southern beech', 'Lancewood', 'Kānuka']
	},
	{
		id: 'nz-west-coast',
		macroRegion: 'nz_west_coast',
		name: 'West Coast',
		biotope: 'Temperate rainforest and podocarp',
		bbox: { south: -44.5, north: -41.5, west: 166.5, east: 172.0 },
		species: ['Rimu', 'Kahikatea', 'Southern beech']
	},
	{
		id: 'nz-canterbury',
		macroRegion: 'nz_canterbury',
		name: 'Canterbury',
		biotope: 'Eastern drylands and foothill forest',
		bbox: { south: -44.5, north: -42.5, west: 170.0, east: 173.5 },
		species: ['Tōtara', 'Kahikatea', 'Lancewood']
	},
	{
		id: 'nz-otago',
		macroRegion: 'nz_otago',
		name: 'Otago / Southland / Fiordland',
		biotope: 'Southern beech and alpine margins',
		bbox: { south: -47.5, north: -44.5, west: 166.5, east: 171.5 },
		species: ['Southern beech', 'Rimu', 'Kahikatea']
	},
	// — Portugal —
	{
		id: 'pt-norte',
		macroRegion: 'pt_norte',
		name: 'Norte / Minho–Douro',
		biotope: 'Atlantic oak and pine',
		bbox: { south: 40.7, north: 42.2, west: -8.9, east: -6.2 },
		species: ['Carvalho-português', 'Pinheiro-bravo', 'Sobreiro']
	},
	{
		id: 'pt-centro',
		macroRegion: 'pt_centro',
		name: 'Centro',
		biotope: 'Pine and cork oak mosaic',
		bbox: { south: 39.3, north: 40.7, west: -9.0, east: -6.5 },
		species: ['Pinheiro-bravo', 'Sobreiro', 'Medronheiro']
	},
	{
		id: 'pt-lisboa',
		macroRegion: 'pt_lisboa',
		name: 'Lisboa / Oeste',
		biotope: 'Coastal scrub and olive',
		bbox: { south: 38.4, north: 39.5, west: -9.6, east: -8.4 },
		species: ['Oliveira', 'Medronheiro', 'Pinheiro-bravo']
	},
	{
		id: 'pt-alentejo',
		macroRegion: 'pt_alentejo',
		name: 'Alentejo',
		biotope: 'Montado — cork and holm oak',
		bbox: { south: 37.3, north: 39.5, west: -8.8, east: -6.5 },
		species: ['Sobreiro', 'Azinheira', 'Oliveira']
	},
	{
		id: 'pt-algarve',
		macroRegion: 'pt_algarve',
		name: 'Algarve',
		biotope: 'Mediterranean scrub and carob',
		bbox: { south: 36.9, north: 37.5, west: -9.0, east: -7.3 },
		species: ['Oliveira', 'Medronheiro', 'Azinheira']
	},
	{
		id: 'pt-madeira',
		macroRegion: 'pt_madeira',
		name: 'Madeira',
		biotope: 'Laurisilva and coastal scrub',
		bbox: { south: 32.4, north: 33.2, west: -17.3, east: -16.2 },
		species: ['Medronheiro', 'Oliveira']
	},
	{
		id: 'pt-azores',
		macroRegion: 'pt_azores',
		name: 'Açores',
		biotope: 'Atlantic islands — humid scrub',
		bbox: { south: 36.9, north: 39.8, west: -31.3, east: -24.9 },
		species: ['Medronheiro', 'Pinheiro-bravo']
	}
];
