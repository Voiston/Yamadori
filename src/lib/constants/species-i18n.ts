import type { AppLocale } from '$lib/stores/appearanceSettings.svelte';
import { getActiveLocale } from '$lib/utils/i18n/locale';

type LocaleNames = Record<AppLocale, string>;

/** French canonical name → localized common names (fr, en, de, it, es). */
export const SPECIES_DISPLAY: Record<string, LocaleNames> = {
	'Pin sylvestre': {
		fr: 'Pin sylvestre',
		en: 'Scots pine',
		de: 'Gemeine Kiefer',
		it: 'Pino silvestre',
		es: 'Pino silvestre'
	},
	'Genévrier commun': {
		fr: 'Genévrier commun',
		en: 'Common juniper',
		de: 'Gewöhnlicher Wacholder',
		it: 'Ginepro comune',
		es: 'Enebro común'
	},
	'Charme commun': {
		fr: 'Charme commun',
		en: 'Common hornbeam',
		de: 'Gemeine Hainbuche',
		it: 'Carpino nero',
		es: 'Carpe común'
	},
	'Hêtre commun': {
		fr: 'Hêtre commun',
		en: 'European beech',
		de: 'Rotbuche',
		it: 'Faggio',
		es: 'Haya común'
	},
	'Pin noir': {
		fr: 'Pin noir',
		en: 'Austrian pine',
		de: 'Schwarzkiefer',
		it: 'Pino nero',
		es: 'Pino negro'
	},
	'Pin maritime': {
		fr: 'Pin maritime',
		en: 'Maritime pine',
		de: 'Seekiefer',
		it: 'Pino marittimo',
		es: 'Pino marítimo'
	},
	'Chêne pubescent': {
		fr: 'Chêne pubescent',
		en: 'Downy oak',
		de: 'Flaumeiche',
		it: 'Roverella',
		es: 'Quejigo'
	},
	'Chêne sessile': {
		fr: 'Chêne sessile',
		en: 'Sessile oak',
		de: 'Traubeneiche',
		it: 'Farnia',
		es: 'Roble albar'
	},
	'Chêne pédonculé': {
		fr: 'Chêne pédonculé',
		en: 'Pedunculate oak',
		de: 'Stieleiche',
		it: 'Farnia',
		es: 'Roble común'
	},
	'Érable sycomore': {
		fr: 'Érable sycomore',
		en: 'Sycamore maple',
		de: 'Bergahorn',
		it: 'Acero montano',
		es: 'Arce blanco'
	},
	If: {
		fr: 'If',
		en: 'Yew',
		de: 'Eibe',
		it: 'Tasso',
		es: 'Tejo'
	},
	Buis: {
		fr: 'Buis',
		en: 'Box',
		de: 'Buchsbaum',
		it: 'Bosso',
		es: 'Boj'
	},
	Noyer: {
		fr: 'Noyer',
		en: 'Walnut',
		de: 'Walnuss',
		it: 'Noce',
		es: 'Nogal'
	},
	'Érable champêtre': {
		fr: 'Érable champêtre',
		en: 'Field maple',
		de: 'Feldahorn',
		it: 'Acero campestre',
		es: 'Arce de Campos'
	},
	Bouleau: {
		fr: 'Bouleau',
		en: 'Birch',
		de: 'Birke',
		it: 'Betulla',
		es: 'Abedul'
	},
	Mélèze: {
		fr: 'Mélèze',
		en: 'Larch',
		de: 'Lärche',
		it: 'Larice',
		es: 'Alerce'
	},
	'Chêne vert': {
		fr: 'Chêne vert',
		en: 'Holm oak',
		de: 'Steineiche',
		it: 'Leccio',
		es: 'Encina'
	},
	'Pin à crochets': {
		fr: 'Pin à crochets',
		en: 'Mountain pine',
		de: 'Krummholzkiefer',
		it: 'Pino mugo',
		es: 'Pino de escamas'
	},
	"Pin d'Alep": {
		fr: "Pin d'Alep",
		en: 'Aleppo pine',
		de: 'Aleppokiefer',
		it: "Pino d'Aleppo",
		es: 'Pino carrasco'
	},
	'Genévrier de Phénice': {
		fr: 'Genévrier de Phénice',
		en: 'Phoenician juniper',
		de: 'Phönizischer Wacholder',
		it: 'Ginepro fenicio',
		es: 'Enebro de Fenicia'
	},
	'Érable de Montpellier': {
		fr: 'Érable de Montpellier',
		en: 'Montpellier maple',
		de: 'Französischer Ahorn',
		it: 'Acero di Montpellier',
		es: 'Arce montpellierano'
	},
	Tamaris: {
		fr: 'Tamaris',
		en: 'Tamarisk',
		de: 'Tamariske',
		it: 'Tamerice',
		es: 'Tamarisco'
	},
	Saule: {
		fr: 'Saule',
		en: 'Willow',
		de: 'Weide',
		it: 'Salice',
		es: 'Sauce'
	},
	'Aulne glutineux': {
		fr: 'Aulne glutineux',
		en: 'Common alder',
		de: 'Schwarzerle',
		it: 'Ontano nero',
		es: 'Aliso común'
	},
	'Rhododendron ferrugineux': {
		fr: 'Rhododendron ferrugineux',
		en: 'Alpen rose',
		de: 'Rostblättrige Alpenrose',
		it: 'Rododendro ferruginoso',
		es: 'Rododendro ferruginoso'
	},
	Châtaignier: {
		fr: 'Châtaignier',
		en: 'Sweet chestnut',
		de: 'Edelkastanie',
		it: 'Castagno',
		es: 'Castaño'
	},
	Cyprès: {
		fr: 'Cyprès',
		en: 'Cypress',
		de: 'Zypresse',
		it: 'Cipresso',
		es: 'Ciprés'
	},
	Olivier: {
		fr: 'Olivier',
		en: 'Olive tree',
		de: 'Olive',
		it: 'Ulivo',
		es: 'Olivo'
	},
	Frêne: {
		fr: 'Frêne',
		en: 'Ash',
		de: 'Esche',
		it: 'Frassino',
		es: 'Fresno'
	},
	Orme: {
		fr: 'Orme',
		en: 'Elm',
		de: 'Ulme',
		it: 'Olmo',
		es: 'Olmo'
	},
	Tilleul: {
		fr: 'Tilleul',
		en: 'Linden',
		de: 'Linde',
		it: 'Tiglio',
		es: 'Tilo'
	},
	Cornouiller: {
		fr: 'Cornouiller',
		en: 'Dogwood',
		de: 'Hartriegel',
		it: 'Corniolo',
		es: 'Cornejo'
	},
	Troène: {
		fr: 'Troène',
		en: 'Privet',
		de: 'Liguster',
		it: 'Ligustro',
		es: 'Ligustro'
	},
	Prunellier: {
		fr: 'Prunellier',
		en: 'Blackthorn',
		de: 'Schlehe',
		it: 'Prugnolo',
		es: 'Endrino'
	},
	'Pommier sauvage': {
		fr: 'Pommier sauvage',
		en: 'Wild apple',
		de: 'Wildapfel',
		it: 'Melo selvatico',
		es: 'Manzano silvestre'
	},
	'Pin cembro': {
		fr: 'Pin cembro',
		en: 'Swiss stone pine',
		de: 'Arve',
		it: 'Cembro',
		es: 'Pino cembra'
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
