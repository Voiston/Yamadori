import type { AppLocale } from '$lib/stores/appearanceSettings.svelte';
import { getActiveLocale } from '$lib/utils/i18n/locale';

type LocaleNames = Record<AppLocale, string>;

/** French canonical name → localized common names (fr, en, de, it, es, nl, sv, nb). */
export const SPECIES_DISPLAY: Record<string, LocaleNames> = {
	'Pin sylvestre': {
		fr: 'Pin sylvestre',
		en: 'Scots pine',
		de: 'Gemeine Kiefer',
		it: 'Pino silvestre',
		es: 'Pino silvestre',
		nl: 'Grove den',
		sv: 'Tall',
		nb: 'Furu'
	},
	'Genévrier commun': {
		fr: 'Genévrier commun',
		en: 'Common juniper',
		de: 'Gewöhnlicher Wacholder',
		it: 'Ginepro comune',
		es: 'Enebro común',
		nl: 'Jeneverbes',
		sv: 'En',
		nb: 'Einer'
	},
	'Charme commun': {
		fr: 'Charme commun',
		en: 'Common hornbeam',
		de: 'Gemeine Hainbuche',
		it: 'Carpino nero',
		es: 'Carpe común',
		nl: 'Haagbeuk',
		sv: 'Avenbok',
		nb: 'Agnbøk'
	},
	'Hêtre commun': {
		fr: 'Hêtre commun',
		en: 'European beech',
		de: 'Rotbuche',
		it: 'Faggio',
		es: 'Haya común',
		nl: 'Beuk',
		sv: 'Bok',
		nb: 'Bøk'
	},
	'Pin noir': {
		fr: 'Pin noir',
		en: 'Austrian pine',
		de: 'Schwarzkiefer',
		it: 'Pino nero',
		es: 'Pino negro',
		nl: 'Oostenrijkse den',
		sv: 'Svarttall',
		nb: 'Svartfuru'
	},
	'Pin maritime': {
		fr: 'Pin maritime',
		en: 'Maritime pine',
		de: 'Seekiefer',
		it: 'Pino marittimo',
		es: 'Pino marítimo',
		nl: 'Zeeden',
		sv: 'Strandtall',
		nb: 'Strandfuru'
	},
	'Chêne pubescent': {
		fr: 'Chêne pubescent',
		en: 'Downy oak',
		de: 'Flaumeiche',
		it: 'Roverella',
		es: 'Quejigo',
		nl: 'Donzige eik',
		sv: 'Luden ek',
		nb: 'Dunneik'
	},
	'Chêne sessile': {
		fr: 'Chêne sessile',
		en: 'Sessile oak',
		de: 'Traubeneiche',
		it: 'Farnia',
		es: 'Roble albar',
		nl: 'Wintereik',
		sv: 'Bergek',
		nb: 'Vintereik'
	},
	'Chêne pédonculé': {
		fr: 'Chêne pédonculé',
		en: 'Pedunculate oak',
		de: 'Stieleiche',
		it: 'Farnia',
		es: 'Roble común',
		nl: 'Zomereik',
		sv: 'Skogsek',
		nb: 'Sommereik'
	},
	'Érable sycomore': {
		fr: 'Érable sycomore',
		en: 'Sycamore maple',
		de: 'Bergahorn',
		it: 'Acero montano',
		es: 'Arce blanco',
		nl: 'Gewone esdoorn',
		sv: 'Tysklönn',
		nb: 'Platanlønn'
	},
	If: {
		fr: 'If',
		en: 'Yew',
		de: 'Eibe',
		it: 'Tasso',
		es: 'Tejo',
		nl: 'Taxus',
		sv: 'Idegran',
		nb: 'Barlind'
	},
	Buis: {
		fr: 'Buis',
		en: 'Box',
		de: 'Buchsbaum',
		it: 'Bosso',
		es: 'Boj',
		nl: 'Buxus',
		sv: 'Buxbom',
		nb: 'Buksbom'
	},
	Noyer: {
		fr: 'Noyer',
		en: 'Walnut',
		de: 'Walnuss',
		it: 'Noce',
		es: 'Nogal',
		nl: 'Walnoot',
		sv: 'Valnöt',
		nb: 'Valnøtt'
	},
	'Érable champêtre': {
		fr: 'Érable champêtre',
		en: 'Field maple',
		de: 'Feldahorn',
		it: 'Acero campestre',
		es: 'Arce de Campos',
		nl: 'Veldesdoorn',
		sv: 'Naverlönn',
		nb: 'Naverlønn'
	},
	Bouleau: {
		fr: 'Bouleau',
		en: 'Birch',
		de: 'Birke',
		it: 'Betulla',
		es: 'Abedul',
		nl: 'Berk',
		sv: 'Björk',
		nb: 'Bjørk'
	},
	'Bouleau nain': {
		fr: 'Bouleau nain',
		en: 'Dwarf birch',
		de: 'Zwerg-Birke',
		it: 'Betulla nana',
		es: 'Abedul enano',
		nl: 'Dwergberk',
		sv: 'Dvärgbjörk',
		nb: 'Dvergbjørk'
	},
	Mélèze: {
		fr: 'Mélèze',
		en: 'Larch',
		de: 'Lärche',
		it: 'Larice',
		es: 'Alerce',
		nl: 'Lariks',
		sv: 'Lärk',
		nb: 'Lerk'
	},
	'Chêne vert': {
		fr: 'Chêne vert',
		en: 'Holm oak',
		de: 'Steineiche',
		it: 'Leccio',
		es: 'Encina',
		nl: 'Steeneik',
		sv: 'Stenek',
		nb: 'Steineik'
	},
	'Pin à crochets': {
		fr: 'Pin à crochets',
		en: 'Mountain pine',
		de: 'Krummholzkiefer',
		it: 'Pino mugo',
		es: 'Pino de escamas',
		nl: 'Bergden',
		sv: 'Bergtall',
		nb: 'Fjellfuru'
	},
	"Pin d'Alep": {
		fr: "Pin d'Alep",
		en: 'Aleppo pine',
		de: 'Aleppokiefer',
		it: "Pino d'Aleppo",
		es: 'Pino carrasco',
		nl: 'Aleppoden',
		sv: 'Aleppotall',
		nb: 'Aleppofuru'
	},
	'Genévrier de Phénice': {
		fr: 'Genévrier de Phénice',
		en: 'Phoenician juniper',
		de: 'Phönizischer Wacholder',
		it: 'Ginepro fenicio',
		es: 'Enebro de Fenicia',
		nl: 'Fenicische jeneverbes',
		sv: 'Fenicisk en',
		nb: 'Fønikisk einer'
	},
	'Érable de Montpellier': {
		fr: 'Érable de Montpellier',
		en: 'Montpellier maple',
		de: 'Französischer Ahorn',
		it: 'Acero di Montpellier',
		es: 'Arce montpellierano',
		nl: 'Montpellier-esdoorn',
		sv: 'Montpellierslönn',
		nb: 'Montpellierlønn'
	},
	Tamaris: {
		fr: 'Tamaris',
		en: 'Tamarisk',
		de: 'Tamariske',
		it: 'Tamerice',
		es: 'Tamarisco',
		nl: 'Tamarisk',
		sv: 'Tamarisk',
		nb: 'Tamarisk'
	},
	Saule: {
		fr: 'Saule',
		en: 'Willow',
		de: 'Weide',
		it: 'Salice',
		es: 'Sauce',
		nl: 'Wilg',
		sv: 'Pil',
		nb: 'Selje'
	},
	'Aulne glutineux': {
		fr: 'Aulne glutineux',
		en: 'Common alder',
		de: 'Schwarzerle',
		it: 'Ontano nero',
		es: 'Aliso común',
		nl: 'Zwarte els',
		sv: 'Klibbal',
		nb: 'Svartor'
	},
	'Rhododendron ferrugineux': {
		fr: 'Rhododendron ferrugineux',
		en: 'Alpen rose',
		de: 'Rostblättrige Alpenrose',
		it: 'Rododendro ferruginoso',
		es: 'Rododendro ferruginoso',
		nl: 'Alpenroos',
		sv: 'Alpros',
		nb: 'Alperose'
	},
	Châtaignier: {
		fr: 'Châtaignier',
		en: 'Sweet chestnut',
		de: 'Edelkastanie',
		it: 'Castagno',
		es: 'Castaño',
		nl: 'Tamme kastanje',
		sv: 'Äkta kastanj',
		nb: 'Edelkastanje'
	},
	Cyprès: {
		fr: 'Cyprès',
		en: 'Cypress',
		de: 'Zypresse',
		it: 'Cipresso',
		es: 'Ciprés',
		nl: 'Cipres',
		sv: 'Cypress',
		nb: 'Sypress'
	},
	Olivier: {
		fr: 'Olivier',
		en: 'Olive tree',
		de: 'Olive',
		it: 'Ulivo',
		es: 'Olivo',
		nl: 'Olijfboom',
		sv: 'Olivträd',
		nb: 'Oliventre'
	},
	Frêne: {
		fr: 'Frêne',
		en: 'Ash',
		de: 'Esche',
		it: 'Frassino',
		es: 'Fresno',
		nl: 'Es',
		sv: 'Ask',
		nb: 'Ask'
	},
	Orme: {
		fr: 'Orme',
		en: 'Elm',
		de: 'Ulme',
		it: 'Olmo',
		es: 'Olmo',
		nl: 'Iep',
		sv: 'Alm',
		nb: 'Alm'
	},
	Tilleul: {
		fr: 'Tilleul',
		en: 'Linden',
		de: 'Linde',
		it: 'Tiglio',
		es: 'Tilo',
		nl: 'Linde',
		sv: 'Lind',
		nb: 'Lind'
	},
	Cornouiller: {
		fr: 'Cornouiller',
		en: 'Dogwood',
		de: 'Hartriegel',
		it: 'Corniolo',
		es: 'Cornejo',
		nl: 'Kornoelje',
		sv: 'Kornell',
		nb: 'Kornell'
	},
	Troène: {
		fr: 'Troène',
		en: 'Privet',
		de: 'Liguster',
		it: 'Ligustro',
		es: 'Ligustro',
		nl: 'Liguster',
		sv: 'Liguster',
		nb: 'Liguster'
	},
	Prunellier: {
		fr: 'Prunellier',
		en: 'Blackthorn',
		de: 'Schlehe',
		it: 'Prugnolo',
		es: 'Endrino',
		nl: 'Sleedoorn',
		sv: 'Slån',
		nb: 'Slåpetorn'
	},
	'Pommier sauvage': {
		fr: 'Pommier sauvage',
		en: 'Wild apple',
		de: 'Wildapfel',
		it: 'Melo selvatico',
		es: 'Manzano silvestre',
		nl: 'Wilde appel',
		sv: 'Vildapel',
		nb: 'Villeple'
	},
	'Pin cembro': {
		fr: 'Pin cembro',
		en: 'Swiss stone pine',
		de: 'Arve',
		it: 'Cembro',
		es: 'Pino cembra',
		nl: 'Alpenden',
		sv: 'Cembratall',
		nb: 'Cembrafuru'
	},
	'Utah juniper': {
		fr: 'Genévrier d’Utah',
		en: 'Utah juniper',
		de: 'Utah-Wacholder',
		it: 'Ginepro dello Utah',
		es: 'Enebro de Utah',
		nl: 'Utah-jeneverbes',
		sv: 'Utahen',
		nb: 'Utah-einer'
	},
	'Rocky Mountain juniper': {
		fr: 'Genévrier des Rocheuses',
		en: 'Rocky Mountain juniper',
		de: 'Rocky-Mountain-Wacholder',
		it: 'Ginepro delle Montagne Rocciose',
		es: 'Enebro de las Rocosas',
		nl: 'Rocky Mountain-jeneverbes',
		sv: 'Klippbergsen',
		nb: 'Rocky Mountain-einer'
	},
	'Ponderosa pine': {
		fr: 'Pin ponderosa',
		en: 'Ponderosa pine',
		de: 'Gelbkiefer',
		it: 'Pino ponderosa',
		es: 'Pino ponderosa',
		nl: 'Ponderosaden',
		sv: 'Ponderosatall',
		nb: 'Ponderosafuru'
	},
	'Bristlecone pine': {
		fr: 'Pin à cônes hérissés',
		en: 'Bristlecone pine',
		de: 'Grannenkiefer',
		it: 'Pino dai coni setolosi',
		es: 'Pino longevo',
		nl: 'Borstelkegelden',
		sv: 'Borstkottetall',
		nb: 'Bustkonglefuru'
	},
	'Eastern hemlock': {
		fr: 'Pruche du Canada',
		en: 'Eastern hemlock',
		de: 'Kanadische Hemlocktanne',
		it: 'Tsuga canadese',
		es: 'Tsuga del Canadá',
		nl: 'Oostelijke hemlockspar',
		sv: 'Östlig hemlock',
		nb: 'Østlig hemlock'
	},
	'Red maple': {
		fr: 'Érable rouge',
		en: 'Red maple',
		de: 'Rot-Ahorn',
		it: 'Acero rosso',
		es: 'Arce rojo',
		nl: 'Rode esdoorn',
		sv: 'Röd lönn',
		nb: 'Rød lønn'
	},
	'Coast live oak': {
		fr: 'Chêne de Californie',
		en: 'Coast live oak',
		de: 'Kalifornische Lebenseiche',
		it: 'Quercia sempreverde californiana',
		es: 'Encino costero',
		nl: 'Californische steeneik',
		sv: 'Kalifornisk stenek',
		nb: 'Kalifornisk steineik'
	},
	'California juniper': {
		fr: 'Genévrier de Californie',
		en: 'California juniper',
		de: 'Kalifornischer Wacholder',
		it: 'Ginepro della California',
		es: 'Enebro de California',
		nl: 'Californische jeneverbes',
		sv: 'Kalifornisk en',
		nb: 'Kalifornisk einer'
	},
	'Douglas fir': {
		fr: 'Douglas',
		en: 'Douglas fir',
		de: 'Douglasie',
		it: 'Abete di Douglas',
		es: 'Abeto de Douglas',
		nl: 'Douglas',
		sv: 'Douglasgran',
		nb: 'Douglasgran'
	},
	'Lodgepole pine': {
		fr: 'Pin tordu',
		en: 'Lodgepole pine',
		de: 'Küstenkiefer',
		it: 'Pino contorto',
		es: 'Pino contorta',
		nl: 'Contortaden',
		sv: 'Contortatall',
		nb: 'Contortafuru'
	},
	'Quaking aspen': {
		fr: 'Peuplier faux-tremble',
		en: 'Quaking aspen',
		de: 'Amerikanische Zitterpappel',
		it: 'Pioppo tremulo americano',
		es: 'Álamo temblón',
		nl: 'Amerikaanse esp',
		sv: 'Asp',
		nb: 'Osp'
	},
	'Western larch': {
		fr: 'Mélèze de l’Ouest',
		en: 'Western larch',
		de: 'Westliche Lärche',
		it: 'Larice occidentale',
		es: 'Alerce occidental',
		nl: 'Westelijke lariks',
		sv: 'Västlig lärk',
		nb: 'Vestlig lerk'
	},
	'Engelmann spruce': {
		fr: 'Épicéa d’Engelmann',
		en: 'Engelmann spruce',
		de: 'Engelmann-Fichte',
		it: 'Abete di Engelmann',
		es: 'Picea de Engelmann',
		nl: 'Engelmann-spar',
		sv: 'Engelmannsgran',
		nb: 'Engelmannsgran'
	},
	'Eastern white cedar': {
		fr: 'Thuya occidental',
		en: 'Eastern white cedar',
		de: 'Abendländischer Lebensbaum',
		it: 'Tuia occidentale',
		es: 'Tuya occidental',
		nl: 'Oostelijke witte ceder',
		sv: 'Östlig vitceder',
		nb: 'Østlig hvitceder'
	},
	'White spruce': {
		fr: 'Épinette blanche',
		en: 'White spruce',
		de: 'Weiß-Fichte',
		it: 'Abete bianco americano',
		es: 'Picea blanca',
		nl: 'Witte spar',
		sv: 'Vitgran',
		nb: 'Hvitgran'
	},
	'Jack pine': {
		fr: 'Pin gris',
		en: 'Jack pine',
		de: 'Banks-Kiefer',
		it: 'Pino di Banks',
		es: 'Pino de Banks',
		nl: 'Banksden',
		sv: 'Banksianatall',
		nb: 'Banksfuru'
	},
	'Sugar maple': {
		fr: 'Érable à sucre',
		en: 'Sugar maple',
		de: 'Zucker-Ahorn',
		it: 'Acero da zucchero',
		es: 'Arce azucarero',
		nl: 'Suikeresdoorn',
		sv: 'Sockerlönn',
		nb: 'Sukkerlønn'
	},
	Tamarack: {
		fr: 'Mélèze laricin',
		en: 'Tamarack',
		de: 'Amerikanische Lärche',
		it: 'Larice americano',
		es: 'Alerce americano',
		nl: 'Amerikaanse lariks',
		sv: 'Amerikansk lärk',
		nb: 'Amerikansk lerk'
	},
	'Paper birch': {
		fr: 'Bouleau à papier',
		en: 'Paper birch',
		de: 'Papier-Birke',
		it: 'Betulla da carta',
		es: 'Abedul de papel',
		nl: 'Papierberk',
		sv: 'Pappersbjörk',
		nb: 'Papirbjørk'
	},
	'Yellow birch': {
		fr: 'Bouleau jaune',
		en: 'Yellow birch',
		de: 'Gelb-Birke',
		it: 'Betulla gialla',
		es: 'Abedul amarillo',
		nl: 'Gele berk',
		sv: 'Gulbjörk',
		nb: 'Gulbjørk'
	},
	Pohutukawa: {
		fr: 'Pohutukawa',
		en: 'Pohutukawa',
		de: 'Pohutukawa',
		it: 'Pohutukawa',
		es: 'Pohutukawa',
		nl: 'Pohutukawa',
		sv: 'Pohutukawa',
		nb: 'Pohutukawa'
	},
	Mānuka: {
		fr: 'Mānuka',
		en: 'Mānuka',
		de: 'Mānuka',
		it: 'Mānuka',
		es: 'Mānuka',
		nl: 'Mānuka',
		sv: 'Mānuka',
		nb: 'Mānuka'
	},
	Kānuka: {
		fr: 'Kānuka',
		en: 'Kānuka',
		de: 'Kānuka',
		it: 'Kānuka',
		es: 'Kānuka',
		nl: 'Kānuka',
		sv: 'Kānuka',
		nb: 'Kānuka'
	},
	Rimu: {
		fr: 'Rimu',
		en: 'Rimu',
		de: 'Rimu',
		it: 'Rimu',
		es: 'Rimu',
		nl: 'Rimu',
		sv: 'Rimu',
		nb: 'Rimu'
	},
	Tōtara: {
		fr: 'Tōtara',
		en: 'Tōtara',
		de: 'Tōtara',
		it: 'Tōtara',
		es: 'Tōtara',
		nl: 'Tōtara',
		sv: 'Tōtara',
		nb: 'Tōtara'
	},
	Lancewood: {
		fr: 'Horoeka / Lancewood',
		en: 'Lancewood',
		de: 'Lancewood',
		it: 'Lancewood',
		es: 'Lancewood',
		nl: 'Lancewood',
		sv: 'Lancewood',
		nb: 'Lancewood'
	},
	'Southern beech': {
		fr: 'Hêtre de Nouvelle-Zélande',
		en: 'Southern beech',
		de: 'Südbuche',
		it: 'Faggio australe',
		es: 'Haya austral',
		nl: 'Zuidelijke beuk',
		sv: 'Sydbok',
		nb: 'Sørbøk'
	},
	Kahikatea: {
		fr: 'Kahikatea',
		en: 'Kahikatea',
		de: 'Kahikatea',
		it: 'Kahikatea',
		es: 'Kahikatea',
		nl: 'Kahikatea',
		sv: 'Kahikatea',
		nb: 'Kahikatea'
	},
	Kauri: {
		fr: 'Kauri',
		en: 'Kauri',
		de: 'Kauri',
		it: 'Kauri',
		es: 'Kauri',
		nl: 'Kauri',
		sv: 'Kauri',
		nb: 'Kauri'
	},
	Sobreiro: {
		fr: 'Chêne-liège',
		en: 'Cork oak',
		de: 'Korkeiche',
		it: 'Sughera',
		es: 'Alcornoque',
		nl: 'Kurkeik',
		sv: 'Korkek',
		nb: 'Korkeik'
	},
	Azinheira: {
		fr: 'Chêne vert ibérique',
		en: 'Holm oak',
		de: 'Steineiche',
		it: 'Leccio',
		es: 'Encina',
		nl: 'Steeneik',
		sv: 'Stenek',
		nb: 'Steineik'
	},
	Oliveira: {
		fr: 'Olivier',
		en: 'Olive',
		de: 'Olive',
		it: 'Olivo',
		es: 'Olivo',
		nl: 'Olijf',
		sv: 'Oliv',
		nb: 'Oliven'
	},
	'Pinheiro-bravo': {
		fr: 'Pin maritime',
		en: 'Maritime pine',
		de: 'Seekiefer',
		it: 'Pino marittimo',
		es: 'Pino marítimo',
		nl: 'Zeeden',
		sv: 'Strandtall',
		nb: 'Strandfuru'
	},
	Medronheiro: {
		fr: 'Arbousier',
		en: 'Strawberry tree',
		de: 'Erdbeerbaum',
		it: 'Corbezzolo',
		es: 'Madroño',
		nl: 'Aardbeiboom',
		sv: 'Smultronträd',
		nb: 'Jordbærtre'
	},
	'Carvalho-português': {
		fr: 'Chêne portugais',
		en: 'Portuguese oak',
		de: 'Portugiesische Eiche',
		it: 'Quercia portoghese',
		es: 'Roble portugués',
		nl: 'Portugese eik',
		sv: 'Portugisisk ek',
		nb: 'Portugisisk eik'
	}
};

function normalizeSearch(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '');
}

export function speciesDisplayName(frenchName: string, locale?: AppLocale): string {
	const activeLocale = locale ?? getActiveLocale();
	return SPECIES_DISPLAY[frenchName]?.[activeLocale] ?? frenchName;
}

/** Normalized concatenation of all locale names — for cross-language species search. */
export function getSpeciesSearchKey(frenchName: string): string {
	const entry = SPECIES_DISPLAY[frenchName];
	if (!entry) return normalizeSearch(frenchName);
	return [...new Set(Object.values(entry).map(normalizeSearch))].join(' ');
}
