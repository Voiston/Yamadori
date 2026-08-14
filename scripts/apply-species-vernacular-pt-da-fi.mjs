/**
 * Apply vernacular pt/da/fi names in species-i18n.ts (keyed by English common name).
 * Run: node scripts/apply-species-vernacular-pt-da-fi.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

/** @type {Record<string, { pt: string; da: string; fi: string }>} */
const BY_EN = {
	'Scots pine': { pt: 'Pinheiro-silvestre', da: 'Skovfyr', fi: 'Mänty' },
	'Common juniper': { pt: 'Zimbro-comum', da: 'Ene', fi: 'Kataja' },
	'Common hornbeam': { pt: 'Carpa', da: 'Avnbøg', fi: 'Euroopanvalkopyökki' },
	'European beech': { pt: 'Faia-europeia', da: 'Bøg', fi: 'Euroopanpyökki' },
	'Austrian pine': { pt: 'Pinheiro-negro', da: 'Østrigsk fyr', fi: 'Mustamänty' },
	'Maritime pine': { pt: 'Pinheiro-bravo', da: 'Strandfyr', fi: 'Rannikkomänty' },
	'Downy oak': { pt: 'Carvalho-pubescente', da: 'Duneg', fi: 'Nukkatammi' },
	'Sessile oak': { pt: 'Carvalho-roble', da: 'Vintereg', fi: 'Talvitammi' },
	'Pedunculate oak': { pt: 'Carvalho-alvarinho', da: 'Stilkeg', fi: 'Kesätammi' },
	'Sycamore maple': { pt: 'Bordo-sicómoro', da: 'Ahorn', fi: 'Vuorivaahtera' },
	Yew: { pt: 'Teixo', da: 'Taks', fi: 'Marjakuusi' },
	Box: { pt: 'Buxo', da: 'Buksbom', fi: 'Puksipuu' },
	Walnut: { pt: 'Nogueira', da: 'Valnød', fi: 'Saksanpähkinä' },
	'Field maple': { pt: 'Bordo-campestre', da: 'Navr', fi: 'Naavavaahtera' },
	Birch: { pt: 'Bétula', da: 'Birk', fi: 'Koivu' },
	'Dwarf birch': { pt: 'Bétula-anã', da: 'Dværgbirk', fi: 'Vaivaiskoivu' },
	Larch: { pt: 'Lariço', da: 'Lærk', fi: 'Lehtikuusi' },
	'Holm oak': { pt: 'Azinheira', da: 'Korkeg', fi: 'Iberiantammi' },
	'Mountain pine': { pt: 'Pinheiro-da-montanha', da: 'Bjergfyr', fi: 'Vuorimänty' },
	'Aleppo pine': { pt: 'Pinheiro-de-Alepo', da: 'Aleppofyr', fi: 'Aleppomänty' },
	'Phoenician juniper': { pt: 'Zimbro-fenício', da: 'Fønikisk ene', fi: 'Foinikialainen kataja' },
	'Montpellier maple': { pt: 'Bordo-de-Montpellier', da: 'Montpellier-ahorn', fi: 'Montpellierinvaahtera' },
	Tamarisk: { pt: 'Tamargueira', da: 'Tamarisk', fi: 'Tamariski' },
	Willow: { pt: 'Salgueiro', da: 'Pil', fi: 'Paju' },
	'Common alder': { pt: 'Amieiro', da: 'Rødel', fi: 'Tervaleppä' },
	'Alpen rose': { pt: 'Rosa-dos-Alpes', da: 'Alperose', fi: 'Alppiruusu' },
	'Sweet chestnut': { pt: 'Castanheiro', da: 'Ægte kastanje', fi: 'Aito kastanja' },
	Cypress: { pt: 'Cipreste', da: 'Cypres', fi: 'Sypressi' },
	'Olive tree': { pt: 'Oliveira', da: 'Oliven', fi: 'Oliivipuu' },
	Ash: { pt: 'Freixo', da: 'Ask', fi: 'Saarni' },
	Elm: { pt: 'Ulmeiro', da: 'Elm', fi: 'Jalava' },
	Linden: { pt: 'Tília', da: 'Lind', fi: 'Lehmus' },
	Dogwood: { pt: 'Sanguinho', da: 'Kornel', fi: 'Kanukka' },
	Privet: { pt: 'Alfeneiro', da: 'Liguster', fi: 'Ligusteri' },
	Blackthorn: { pt: 'Abrunheiro', da: 'Slåen', fi: 'Oratuomi' },
	'Wild apple': { pt: 'Macieira-brava', da: 'Vildæble', fi: 'Metsäomena' },
	'Swiss stone pine': { pt: 'Pinheiro-cembro', da: 'Cembra-fyr', fi: 'Sembra' },
	'Utah juniper': { pt: 'Zimbro-de-Utah', da: 'Utah-ene', fi: 'Utahin kataja' },
	'Rocky Mountain juniper': {
		pt: 'Zimbro-das-Montanhas-Rochosas',
		da: 'Rocky Mountain-ene',
		fi: 'Kalliovuorten kataja'
	},
	'Ponderosa pine': { pt: 'Pinheiro-ponderosa', da: 'Ponderosa-fyr', fi: 'Ponderosamänty' },
	'Bristlecone pine': { pt: 'Pinheiro-de-escamas', da: 'Børstekoglefyr', fi: 'Harjakäpymänty' },
	'Eastern hemlock': { pt: 'Tsuga-oriental', da: 'Østlig hemlock', fi: 'Itäinen hemlokki' },
	'Red maple': { pt: 'Bordo-vermelho', da: 'Rød ahorn', fi: 'Punavaahtera' },
	'Coast live oak': { pt: 'Carvalho-da-costa', da: 'Californisk stedsegrøn eg', fi: 'Kaliforniantammi' },
	'California juniper': {
		pt: 'Zimbro-da-Califórnia',
		da: 'Californisk ene',
		fi: 'Kalifornian kataja'
	},
	'Douglas fir': { pt: 'Abeto-de-Douglas', da: 'Douglasgran', fi: 'Douglaskuusi' },
	'Lodgepole pine': { pt: 'Pinheiro-contorta', da: 'Contorta-fyr', fi: 'Kontortamänty' },
	'Quaking aspen': { pt: 'Álamo-tremedor', da: 'Bævreasp', fi: 'Haapa' },
	'Western larch': { pt: 'Lariço-ocidental', da: 'Vestlig lærk', fi: 'Lännenlehtikuusi' },
	'Engelmann spruce': { pt: 'Pícea-de-Engelmann', da: 'Engelmannsgran', fi: 'Engelmanninkuusi' },
	'Eastern white cedar': {
		pt: 'Cedro-branco-oriental',
		da: 'Østlig hvidceder',
		fi: 'Lännentuja'
	},
	'White spruce': { pt: 'Pícea-branca', da: 'Hvidgran', fi: 'Valkokuusi' },
	'Jack pine': { pt: 'Pinheiro-de-Banks', da: 'Banks-fyr', fi: 'Banksinmänty' },
	'Sugar maple': { pt: 'Bordo-açucareiro', da: 'Sukkerahorn', fi: 'Sokerivaahtera' },
	Tamarack: { pt: 'Lariço-americano', da: 'Amerikansk lærk', fi: 'Amerikanlehtikuusi' },
	'Paper birch': { pt: 'Bétula-de-papel', da: 'Papirbirk', fi: 'Paperikoivu' },
	'Yellow birch': { pt: 'Bétula-amarela', da: 'Gul birk', fi: 'Keltakoivu' },
	Pohutukawa: { pt: 'Pohutukawa', da: 'Pohutukawa', fi: 'Pohutukawa' },
	Mānuka: { pt: 'Mānuka', da: 'Mānuka', fi: 'Mānuka' },
	Kānuka: { pt: 'Kānuka', da: 'Kānuka', fi: 'Kānuka' },
	Rimu: { pt: 'Rimu', da: 'Rimu', fi: 'Rimu' },
	Tōtara: { pt: 'Tōtara', da: 'Tōtara', fi: 'Tōtara' },
	Lancewood: { pt: 'Lancewood', da: 'Lancewood', fi: 'Lancewood' },
	'Southern beech': { pt: 'Faia-do-sul', da: 'Sydbøg', fi: 'Etelänpyökki' },
	Kahikatea: { pt: 'Kahikatea', da: 'Kahikatea', fi: 'Kahikatea' },
	Kauri: { pt: 'Kauri', da: 'Kauri', fi: 'Kauri' },
	'Cork oak': { pt: 'Sobreiro', da: 'Korkeg', fi: 'Korkkitammi' },
	Olive: { pt: 'Oliveira', da: 'Oliven', fi: 'Oliivi' },
	'Strawberry tree': { pt: 'Medronheiro', da: 'Jordbærtræ', fi: 'Mansikkapuu' },
	'Portuguese oak': { pt: 'Carvalho-português', da: 'Portugisisk eg', fi: 'Portugalintammi' }
};

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const path = 'src/lib/constants/species-i18n.ts';
let source = readFileSync(path, 'utf8');
let applied = 0;

source = source.replace(
	/en: '((?:\\'|[^'])*)',\r?\n\t\tde: '((?:\\'|[^'])*)',\r?\n\t\tit: '((?:\\'|[^'])*)',\r?\n\t\tes: '((?:\\'|[^'])*)',\r?\n\t\tnl: '((?:\\'|[^'])*)',\r?\n\t\tsv: '((?:\\'|[^'])*)',\r?\n\t\tnb: '((?:\\'|[^'])*)',\r?\n\t\tpt: '((?:\\'|[^'])*)',\r?\n\t\tda: '((?:\\'|[^'])*)',\r?\n\t\tfi: '((?:\\'|[^'])*)'/g,
	(full, en, de, it, es, nl, sv, nb, pt, da, fi) => {
		const v = BY_EN[en];
		if (!v) return full;
		applied++;
		return `en: '${esc(en)}',
		de: '${esc(de)}',
		it: '${esc(it)}',
		es: '${esc(es)}',
		nl: '${esc(nl)}',
		sv: '${esc(sv)}',
		nb: '${esc(nb)}',
		pt: '${esc(v.pt)}',
		da: '${esc(v.da)}',
		fi: '${esc(v.fi)}'`;
	}
);

writeFileSync(path, source);
console.log(`Applied vernacular pt/da/fi to ${applied} species entries`);
