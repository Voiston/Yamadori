/**
 * Fill remaining EN-identical region nl/sv/nb strings with curated translations.
 * Place-name-only entries may stay English by design.
 * Run: node scripts/apply-regions-vernacular.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

/** @type {Record<string, { nl: string; sv: string; nb: string }>} */
const BY_EN = {
	'Anjou and Mayenne bocage': {
		nl: 'Bocage van Anjou en Mayenne',
		sv: 'Bocage i Anjou och Mayenne',
		nb: 'Bocage i Anjou og Mayenne'
	},
	'Wet bocage and hedgerows': {
		nl: 'Nat bocage en heggen',
		sv: 'Vått bocage och häckar',
		nb: 'Vått bocage og hekker'
	},
	'Pacific Northwest': {
		nl: 'Pacific Northwest',
		sv: 'Nordvästra Stillahavskusten',
		nb: 'Stillehavets nordvest'
	},
	'Rocky Mountains': {
		nl: 'Rocky Mountains',
		sv: 'Klippiga bergen',
		nb: 'Rocky Mountains'
	},
	'BC Coast': {
		nl: 'Kust van British Columbia',
		sv: 'BC-kusten',
		nb: 'BC-kysten'
	},
	'Canadian Rockies': {
		nl: 'Canadese Rocky Mountains',
		sv: 'Kanadensiska Klippiga bergen',
		nb: 'Kanadiske Rocky Mountains'
	},
	Maritimes: { nl: 'Maritimes', sv: 'Maritimes', nb: 'Maritimes' },
	'Northland / Auckland': {
		nl: 'Northland / Auckland',
		sv: 'Northland / Auckland',
		nb: 'Northland / Auckland'
	},
	'Coastal subtropical and kauri–broadleaf': {
		nl: 'Subtropisch kustgebied en kauri–loofbos',
		sv: 'Kustsubtropiskt och kauri–lövskog',
		nb: 'Kystsubtropisk og kauri–løvskog'
	},
	'Central North Island': {
		nl: 'Centraal Noordereiland',
		sv: 'Centrala Nordön',
		nb: 'Sentral Nordøya'
	},
	'Volcanic plateau and mixed podocarp': {
		nl: 'Vulkanisch plateau en gemengd podocarpusbos',
		sv: 'Vulkaniskt platåland och blandad podocarp',
		nb: 'Vulkanisk platå og blandet podocarp'
	},
	'Wellington / East Coast': {
		nl: 'Wellington / oostkust',
		sv: 'Wellington / östkust',
		nb: 'Wellington / østkyst'
	},
	'Coastal scrub and regenerating forest': {
		nl: 'Kuststruweel en regenererend bos',
		sv: 'Kustbuskage och regenererande skog',
		nb: 'Kystkratt og regenererende skog'
	},
	'Nelson / Marlborough': {
		nl: 'Nelson / Marlborough',
		sv: 'Nelson / Marlborough',
		nb: 'Nelson / Marlborough'
	},
	'Dry hills and beech margins': {
		nl: 'Droge heuvels en beukenranden',
		sv: 'Torra kullar och bokbryn',
		nb: 'Tørre åser og bøkerender'
	},
	'West Coast': { nl: 'Westkust', sv: 'Västkusten', nb: 'Vestkysten' },
	'Temperate rainforest and podocarp': {
		nl: 'Gematigd regenwoud en podocarpus',
		sv: 'Tempererad regnskog och podocarp',
		nb: 'Temperert regnskog og podocarp'
	},
	Canterbury: { nl: 'Canterbury', sv: 'Canterbury', nb: 'Canterbury' },
	'Eastern drylands and foothill forest': {
		nl: 'Oostelijke droge gebieden en heuvelvoetbos',
		sv: 'Östra torrland och förbergsskog',
		nb: 'Østlige tørrland og fotåsskog'
	},
	'Otago / Southland / Fiordland': {
		nl: 'Otago / Southland / Fiordland',
		sv: 'Otago / Southland / Fiordland',
		nb: 'Otago / Southland / Fiordland'
	},
	'Southern beech and alpine margins': {
		nl: 'Zuidelijke beuk en alpiene randen',
		sv: 'Sydbok och alpina bryn',
		nb: 'Sørbøk og alpine rander'
	},
	'Lowland beech-oak forest (Sarthe, Bercé)': {
		nl: 'Laagland beuken-eikenbos (Sarthe, Bercé)',
		sv: 'Låglands bok-ekskog (Sarthe, Bercé)',
		nb: 'Lavlands bøk-eikeskog (Sarthe, Bercé)'
	},
	'Dunes and coastal wasteland': {
		nl: 'Duinen en kustruigten',
		sv: 'Dyner och kusthed',
		nb: 'Dyner og kystmark'
	},
	'Atlantic coast': {
		nl: 'Atlantische kust',
		sv: 'Atlantkusten',
		nb: 'Atlanterhavskysten'
	},
	'Atlantic oak and pine': {
		nl: 'Atlantische eik en den',
		sv: 'Atlantisk ek och tall',
		nb: 'Atlantisk eik og furu'
	},
	'Pine and cork oak mosaic': {
		nl: 'Mozaïek van dennen en kurkeik',
		sv: 'Mosaik av tall och korkek',
		nb: 'Mosaikk av furu og korkeik'
	},
	'Coastal scrub and olive': {
		nl: 'Kuststruweel en olijf',
		sv: 'Kustbuskage och oliv',
		nb: 'Kystkratt og oliven'
	},
	'Montado — cork and holm oak': {
		nl: 'Montado — kurk- en steeneik',
		sv: 'Montado — kork- och stenek',
		nb: 'Montado — kork- og steineik'
	},
	'Mediterranean scrub and carob': {
		nl: 'Mediterraan struweel en Johannesbroodboom',
		sv: 'Medelhavsbuskage och johannesbröd',
		nb: 'Middelhavskratt og johannesbrød'
	},
	'Laurisilva and coastal scrub': {
		nl: 'Laurisilva en kuststruweel',
		sv: 'Laurisilva och kustbuskage',
		nb: 'Laurisilva og kystkratt'
	},
	'Atlantic islands — humid scrub': {
		nl: 'Atlantische eilanden — vochtig struweel',
		sv: 'Atlantöar — fuktig buskvegetation',
		nb: 'Atlanterhavsøyer — fuktig kratt'
	},
	'Norte / Minho–Douro': {
		nl: 'Norte / Minho–Douro',
		sv: 'Norte / Minho–Douro',
		nb: 'Norte / Minho–Douro'
	},
	Centro: { nl: 'Centro', sv: 'Centro', nb: 'Centro' },
	'Lisboa / Oeste': { nl: 'Lisboa / Oeste', sv: 'Lisboa / Oeste', nb: 'Lisboa / Oeste' },
	Alentejo: { nl: 'Alentejo', sv: 'Alentejo', nb: 'Alentejo' },
	Algarve: { nl: 'Algarve', sv: 'Algarve', nb: 'Algarve' },
	Madeira: { nl: 'Madeira', sv: 'Madeira', nb: 'Madeira' },
	Azores: { nl: 'Azoren', sv: 'Azorerna', nb: 'Azorene' }
};

const path = 'src/lib/constants/regions-i18n.ts';
let source = readFileSync(path, 'utf8');
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
let updated = 0;

source = source.replace(
	/en: '((?:\\'|[^'])*)',\r?\n(\t+)de: '((?:\\'|[^'])*)',\r?\n\2it: '((?:\\'|[^'])*)',\r?\n\2es: '((?:\\'|[^'])*)',\r?\n\2nl: '((?:\\'|[^'])*)',\r?\n\2sv: '((?:\\'|[^'])*)',\r?\n\2nb: '((?:\\'|[^'])*)'/g,
	(full, en, indent, de, it, es, nl, sv, nb) => {
		const v = BY_EN[en];
		if (!v) return full;
		const nextNl = nl === en ? v.nl : nl;
		const nextSv = sv === en ? v.sv : sv;
		const nextNb = nb === en ? v.nb : nb;
		if (nextNl === nl && nextSv === sv && nextNb === nb) return full;
		updated++;
		return `en: '${esc(en)}',
${indent}de: '${esc(de)}',
${indent}it: '${esc(it)}',
${indent}es: '${esc(es)}',
${indent}nl: '${esc(nextNl)}',
${indent}sv: '${esc(nextSv)}',
${indent}nb: '${esc(nextNb)}'`;
	}
);

writeFileSync(path, source);
console.log(`Patched ${updated} region locale blocks`);
