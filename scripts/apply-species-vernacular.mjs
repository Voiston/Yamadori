/**
 * Apply vernacular nl/sv/nb names in species-i18n.ts (keyed by English common name).
 * Run: node scripts/apply-species-vernacular.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

/** @type {Record<string, { nl: string; sv: string; nb: string }>} */
const BY_EN = {
	'Scots pine': { nl: 'Grove den', sv: 'Tall', nb: 'Furu' },
	'Common juniper': { nl: 'Jeneverbes', sv: 'En', nb: 'Einer' },
	'Common hornbeam': { nl: 'Haagbeuk', sv: 'Avenbok', nb: 'Agnbøk' },
	'European beech': { nl: 'Beuk', sv: 'Bok', nb: 'Bøk' },
	'Austrian pine': { nl: 'Oostenrijkse den', sv: 'Svarttall', nb: 'Svartfuru' },
	'Maritime pine': { nl: 'Zeeden', sv: 'Strandtall', nb: 'Strandfuru' },
	'Downy oak': { nl: 'Donzige eik', sv: 'Luden ek', nb: 'Dunneik' },
	'Sessile oak': { nl: 'Wintereik', sv: 'Bergek', nb: 'Vintereik' },
	'Pedunculate oak': { nl: 'Zomereik', sv: 'Skogsek', nb: 'Sommereik' },
	'Sycamore maple': { nl: 'Gewone esdoorn', sv: 'Tysklönn', nb: 'Platanlønn' },
	Yew: { nl: 'Taxus', sv: 'Idegran', nb: 'Barlind' },
	Box: { nl: 'Buxus', sv: 'Buxbom', nb: 'Buksbom' },
	Walnut: { nl: 'Walnoot', sv: 'Valnöt', nb: 'Valnøtt' },
	'Field maple': { nl: 'Veldesdoorn', sv: 'Naverlönn', nb: 'Naverlønn' },
	Birch: { nl: 'Berk', sv: 'Björk', nb: 'Bjørk' },
	'Dwarf birch': { nl: 'Dwergberk', sv: 'Dvärgbjörk', nb: 'Dvergbjørk' },
	Larch: { nl: 'Lariks', sv: 'Lärk', nb: 'Lerk' },
	'Holm oak': { nl: 'Steeneik', sv: 'Stenek', nb: 'Steineik' },
	'Mountain pine': { nl: 'Bergden', sv: 'Bergtall', nb: 'Fjellfuru' },
	'Aleppo pine': { nl: 'Aleppoden', sv: 'Aleppotall', nb: 'Aleppofuru' },
	'Phoenician juniper': { nl: 'Fenicische jeneverbes', sv: 'Fenicisk en', nb: 'Fønikisk einer' },
	'Montpellier maple': { nl: 'Montpellier-esdoorn', sv: 'Montpellierslönn', nb: 'Montpellierlønn' },
	Tamarisk: { nl: 'Tamarisk', sv: 'Tamarisk', nb: 'Tamarisk' },
	Willow: { nl: 'Wilg', sv: 'Pil', nb: 'Selje' },
	'Common alder': { nl: 'Zwarte els', sv: 'Klibbal', nb: 'Svartor' },
	'Alpen rose': { nl: 'Alpenroos', sv: 'Alpros', nb: 'Alperose' },
	'Sweet chestnut': { nl: 'Tamme kastanje', sv: 'Äkta kastanj', nb: 'Edelkastanje' },
	Cypress: { nl: 'Cipres', sv: 'Cypress', nb: 'Sypress' },
	'Olive tree': { nl: 'Olijfboom', sv: 'Olivträd', nb: 'Oliventre' },
	Ash: { nl: 'Es', sv: 'Ask', nb: 'Ask' },
	Elm: { nl: 'Iep', sv: 'Alm', nb: 'Alm' },
	Linden: { nl: 'Linde', sv: 'Lind', nb: 'Lind' },
	Dogwood: { nl: 'Kornoelje', sv: 'Kornell', nb: 'Kornell' },
	Privet: { nl: 'Liguster', sv: 'Liguster', nb: 'Liguster' },
	Blackthorn: { nl: 'Sleedoorn', sv: 'Slån', nb: 'Slåpetorn' },
	'Wild apple': { nl: 'Wilde appel', sv: 'Vildapel', nb: 'Villeple' },
	'Swiss stone pine': { nl: 'Alpenden', sv: 'Cembratall', nb: 'Cembrafuru' },
	'Utah juniper': { nl: 'Utah-jeneverbes', sv: 'Utahen', nb: 'Utah-einer' },
	'Rocky Mountain juniper': {
		nl: 'Rocky Mountain-jeneverbes',
		sv: 'Klippbergsen',
		nb: 'Rocky Mountain-einer'
	},
	'Ponderosa pine': { nl: 'Ponderosaden', sv: 'Ponderosatall', nb: 'Ponderosafuru' },
	'Bristlecone pine': { nl: 'Borstelkegelden', sv: 'Borstkottetall', nb: 'Bustkonglefuru' },
	'Eastern hemlock': { nl: 'Oostelijke hemlockspar', sv: 'Östlig hemlock', nb: 'Østlig hemlock' },
	'Red maple': { nl: 'Rode esdoorn', sv: 'Röd lönn', nb: 'Rød lønn' },
	'Coast live oak': { nl: 'Californische steeneik', sv: 'Kalifornisk stenek', nb: 'Kalifornisk steineik' },
	'California juniper': {
		nl: 'Californische jeneverbes',
		sv: 'Kalifornisk en',
		nb: 'Kalifornisk einer'
	},
	'Douglas fir': { nl: 'Douglas', sv: 'Douglasgran', nb: 'Douglasgran' },
	'Lodgepole pine': { nl: 'Contortaden', sv: 'Contortatall', nb: 'Contortafuru' },
	'Quaking aspen': { nl: 'Amerikaanse esp', sv: 'Asp', nb: 'Osp' },
	'Western larch': { nl: 'Westelijke lariks', sv: 'Västlig lärk', nb: 'Vestlig lerk' },
	'Engelmann spruce': { nl: 'Engelmann-spar', sv: 'Engelmannsgran', nb: 'Engelmannsgran' },
	'Eastern white cedar': {
		nl: 'Oostelijke witte ceder',
		sv: 'Östlig vitceder',
		nb: 'Østlig hvitceder'
	},
	'White spruce': { nl: 'Witte spar', sv: 'Vitgran', nb: 'Hvitgran' },
	'Jack pine': { nl: 'Banksden', sv: 'Banksianatall', nb: 'Banksfuru' },
	'Sugar maple': { nl: 'Suikeresdoorn', sv: 'Sockerlönn', nb: 'Sukkerlønn' },
	Tamarack: { nl: 'Amerikaanse lariks', sv: 'Amerikansk lärk', nb: 'Amerikansk lerk' },
	'Paper birch': { nl: 'Papierberk', sv: 'Pappersbjörk', nb: 'Papirbjørk' },
	'Yellow birch': { nl: 'Gele berk', sv: 'Gulbjörk', nb: 'Gulbjørk' },
	Pohutukawa: { nl: 'Pohutukawa', sv: 'Pohutukawa', nb: 'Pohutukawa' },
	Mānuka: { nl: 'Mānuka', sv: 'Mānuka', nb: 'Mānuka' },
	Kānuka: { nl: 'Kānuka', sv: 'Kānuka', nb: 'Kānuka' },
	Rimu: { nl: 'Rimu', sv: 'Rimu', nb: 'Rimu' },
	Tōtara: { nl: 'Tōtara', sv: 'Tōtara', nb: 'Tōtara' },
	Lancewood: { nl: 'Lancewood', sv: 'Lancewood', nb: 'Lancewood' },
	'Southern beech': { nl: 'Zuidelijke beuk', sv: 'Sydbok', nb: 'Sørbøk' },
	Kahikatea: { nl: 'Kahikatea', sv: 'Kahikatea', nb: 'Kahikatea' },
	Kauri: { nl: 'Kauri', sv: 'Kauri', nb: 'Kauri' },
	'Cork oak': { nl: 'Kurkeik', sv: 'Korkek', nb: 'Korkeik' },
	Olive: { nl: 'Olijf', sv: 'Oliv', nb: 'Oliven' },
	'Strawberry tree': { nl: 'Aardbeiboom', sv: 'Smultronträd', nb: 'Jordbærtre' },
	'Portuguese oak': { nl: 'Portugese eik', sv: 'Portugisisk ek', nb: 'Portugisisk eik' }
};

const path = 'src/lib/constants/species-i18n.ts';
let source = readFileSync(path, 'utf8');

source = source.replace(
	/\*\* French canonical name → localized common names \(fr, en, de, it, es\)\./,
	'** French canonical name → localized common names (fr, en, de, it, es, nl, sv, nb).'
);

let updated = 0;
/** @type {string[]} */
const missing = [];
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

source = source.replace(
	/en: '((?:\\'|[^'])*)',\r?\n\t\tde: '((?:\\'|[^'])*)',\r?\n\t\tit: '((?:\\'|[^'])*)',\r?\n\t\tes: '((?:\\'|[^'])*)',\r?\n\t\tnl: '((?:\\'|[^'])*)',\r?\n\t\tsv: '((?:\\'|[^'])*)',\r?\n\t\tnb: '((?:\\'|[^'])*)'/g,
	(full, en, de, it, es) => {
		const v = BY_EN[en];
		if (!v) {
			missing.push(en);
			return full;
		}
		updated++;
		return `en: '${en}',
		de: '${de}',
		it: '${it}',
		es: '${es}',
		nl: '${esc(v.nl)}',
		sv: '${esc(v.sv)}',
		nb: '${esc(v.nb)}'`;
	}
);

writeFileSync(path, source);
console.log(`Updated ${updated} species entries`);
if (missing.length) {
	console.warn('No vernacular map for:', [...new Set(missing)].join(', '));
}
