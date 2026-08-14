import { BIOTOPE_REGIONS } from '$lib/constants/regions';
import type { AppLocale } from '$lib/stores/appearanceSettings.svelte';
import { getActiveLocale } from '$lib/utils/i18n/locale';

type LocaleNames = Record<AppLocale, string>;

type RegionDisplayEntry = {
	name: LocaleNames;
	biotope: LocaleNames;
};

/** Region id → localized name and biotope description. */
export const REGION_DISPLAY: Record<string, RegionDisplayEntry> = {
	'pdl-briere-gavre': {
		name: {
			fr: 'Brière et Forêt du Gâvre',
			en: 'Brière and Gâvre Forest',
			de: 'Brière und Gâvre-Wald',
			it: 'Brière e Foresta del Gâvre',
			es: 'Brière y Bosque del Gâvre',
			nl: 'Brière en Gâvre Forest',
			sv: 'Brière och Gâvre Forest',
			nb: 'Brière og Gâvre-skogen',
			pt: 'Floresta de Brière e Gâvre',
			da: 'Brière- og Gâvre-skoven',
			fi: 'Brière ja Gâvre Forest'
		},
		biotope: {
			fr: 'Pins sylvestres et futaies mixtes humides',
			en: 'Scots pines and wet mixed forests',
			de: 'Kiefern und feuchte Mischwälder',
			it: 'Pini silvestri e foreste miste umide',
			es: 'Pinos silvestres y bosques mixtos húmedos',
			nl: 'Grove dennen en natte gemengde bossen',
			sv: 'Tallar och våta blandskogar',
			nb: 'Skotske furuer og våte blandingsskoger',
			pt: 'Pinheiros escoceses e florestas mistas úmidas',
			da: 'Skotske fyrretræer og våde blandingsskove',
			fi: 'Männyt ja märät sekametsät'
		}
	},
	'pdl-littoral-atlantique': {
		name: {
			fr: 'Littoral atlantique',
			en: 'Atlantic coast',
			de: 'Atlantikküste',
			it: 'Litorale atlantico',
			es: 'Litoral atlántico',
			nl: 'Langs de Atlantische Oceaan',
			sv: 'Atlantkusten',
			nb: 'Atlanterhavskysten',
			pt: 'Costa atlântica',
			da: 'Atlanterhavskysten',
			fi: 'Atlantin rannikko'
		},
		biotope: {
			fr: 'Dunes et friches littorales',
			en: 'Dunes and coastal wasteland',
			de: 'Dünen und Küstenbrachen',
			it: 'Dune e terreni incolti costieri',
			es: 'Dunas y terrenos baldíos costeros',
			nl: 'Duinen en kustwoestenij',
			sv: 'Sanddyner och kustnära ödemark',
			nb: 'Sanddyner og kystødemark',
			pt: 'Dunas e terrenos baldios costeiros',
			da: 'Klitter og kystnære ødemarker',
			fi: 'Dyynit ja rannikon joutomaa'
		}
	},
	'pdl-bocage': {
		name: {
			fr: 'Bocage angevin et mayennais',
			en: 'Anjou and Mayenne bocage',
			de: 'Bocage von Anjou und Mayenne',
			it: "Bocage dell'Anjou e della Mayenne",
			es: 'Bocage de Anjou y Mayenne',
			nl: 'Bocage van Anjou en Mayenne',
			sv: 'Bocage i Anjou och Mayenne',
			nb: 'Bocage i Anjou og Mayenne',
			pt: 'Anjou and Mayenne bocage',
			da: 'Anjou and Mayenne bocage',
			fi: 'Anjou and Mayenne bocage'
		},
		biotope: {
			fr: 'Bocage humide et haies',
			en: 'Wet bocage and hedgerows',
			de: 'Feuchtes Bocage und Hecken',
			it: 'Bocage umido e siepi',
			es: 'Bocage húmedo y setos',
			nl: 'Natte bocage en heggen',
			sv: 'Våt bocage och häckar',
			nb: 'Våte bocage-områder og hekker',
			pt: 'Bocage molhado e sebes',
			da: 'Våd bocage og hække',
			fi: 'Märkä bocage ja pensasaidat'
		}
	},
	'pdl-foret-plaine': {
		name: {
			fr: 'Forêt de plaine',
			en: 'Lowland forest',
			de: 'Flachlandwald',
			it: 'Foresta di pianura',
			es: 'Bosque de llanura',
			nl: 'Laaglandbos',
			sv: 'Låglandsskog',
			nb: 'Lavlandsskog',
			pt: 'Floresta de planície',
			da: 'Lavlandsskov',
			fi: 'Alangon metsä'
		},
		biotope: {
			fr: 'Hêtraie-chênaie de plaine (Sarthe, Bercé)',
			en: 'Lowland beech-oak forest (Sarthe, Bercé)',
			de: 'Flachland-Buchen-Eichenwald (Sarthe, Bercé)',
			it: 'Faggeta-querceto di pianura (Sarthe, Bercé)',
			es: 'Hayedo-robledal de llanura (Sarthe, Bercé)',
			nl: 'Laagland beuken-eikenbos (Sarthe, Bercé)',
			sv: 'Låglänta bok-ekskogar (Sarthe, Bercé)',
			nb: 'Lavlandsskog av bøk og eik (Sarthe, Bercé)',
			pt: 'Floresta de carvalhos de faia das terras baixas (Sarthe, Bercé)',
			da: 'Bøgeskov i lavlandet (Sarthe, Bercé)',
			fi: 'Alava pyökkitammimetsä (Sarthe, Bercé)'
		}
	},
	'pdl-marais-humide': {
		name: {
			fr: 'Marais et zones humides',
			en: 'Marshes and wetlands',
			de: 'Sümpfe und Feuchtgebiete',
			it: 'Paludi e zone umide',
			es: 'Marismas y zonas húmedas',
			nl: 'Moerassen en wetlands',
			sv: 'Träskmarker och våtmarker',
			nb: 'Myrer og våtmarker',
			pt: 'Pântanos e zonas húmidas',
			da: 'Marskområder og vådområder',
			fi: 'Suot ja kosteikot'
		},
		biotope: {
			fr: 'Marais briéron et vallées humides',
			en: 'Brière marsh and wet valleys',
			de: 'Brière-Sumpf und feuchte Täler',
			it: 'Palude della Brière e valli umide',
			es: 'Marisma de Brière y valles húmedas',
			nl: 'Brière moeras en natte valleien',
			sv: 'Brière-marsch och våta dalar',
			nb: 'Brière-myr og våte daler',
			pt: 'Pântano de Brière e vales úmidos',
			da: 'Brière-mose og våde dale',
			fi: 'Brièren suo ja märät laaksot'
		}
	},
	'pdl-frange-forez': {
		name: {
			fr: 'Frange du Forez',
			en: 'Forez fringe',
			de: 'Forez-Rand',
			it: 'Frangia del Forez',
			es: 'Frontera del Forez',
			nl: 'Forez franje',
			sv: 'Forez-frynser',
			nb: 'Forez frynser',
			pt: 'Forez Fringe',
			da: 'Forez frynser',
			fi: 'Forez fringe'
		},
		biotope: {
			fr: 'Lisière montagneuse et landes',
			en: 'Mountain fringe and heathland',
			de: 'Gebirgsrand und Heidelandschaft',
			it: 'Margine montano e lande',
			es: 'Borde montañoso y landas',
			nl: 'Bergrand en heide',
			sv: 'Fjällkanter och hedmarker',
			nb: 'Fjellkant og lynglandskap',
			pt: 'Margem montanhosa e charneca',
			da: 'Bjergrand og hedelandskab',
			fi: 'Vuorten reunamaat ja nummet'
		}
	},
	'pyr-piemont-atlantique': {
		name: {
			fr: 'Piémont atlantique',
			en: 'Atlantic foothills',
			de: 'Atlantisches Vorland',
			it: 'Piemonte atlantico',
			es: 'Pie de monte atlántico',
			nl: 'Atlantische uitlopers',
			sv: 'Atlantiska foten',
			nb: 'Atlanterhavsfoten',
			pt: 'Contrafortes atlânticos',
			da: 'Atlanterhavsfoden',
			fi: 'Atlantin juurella'
		},
		biotope: {
			fr: 'Collines du Pays Basque et Béarn',
			en: 'Basque Country and Béarn hills',
			de: 'Hügel des Baskenlands und Béarn',
			it: 'Colline del Paese Basco e del Béarn',
			es: 'Colinas del País Vasco y Bearne',
			nl: 'Baskenland en Béarn heuvels',
			sv: 'Kullarna i Baskien och Béarn',
			nb: 'Baskerland og Béarn-åsene',
			pt: 'País Basco e colinas de Béarn',
			da: 'Baskien og Béarn-bakkerne',
			fi: 'Baskimaa ja Béarnin kukkulat'
		}
	},
	'pyr-vallees-centrales': {
		name: {
			fr: 'Vallées centrales',
			en: 'Central valleys',
			de: 'Zentrale Täler',
			it: 'Valli centrali',
			es: 'Valles centrales',
			nl: 'Centrale valleien',
			sv: 'Centrala dalar',
			nb: 'Sentrale daler',
			pt: 'Vales centrais',
			da: 'Centrale dale',
			fi: 'Keskilaaksot'
		},
		biotope: {
			fr: 'Forêts de montagne moyenne',
			en: 'Mid-mountain forests',
			de: 'Mittelgebirgswälder',
			it: 'Foreste di montagna media',
			es: 'Bosques de montaña media',
			nl: 'bergwoud;',
			sv: 'Skogar i mitten av bergen',
			nb: 'Midtfjellskoger',
			pt: 'Florestas no meio da montanha',
			da: 'Midtbjergskove',
			fi: 'Vuoriston keskikohdan metsät'
		}
	},
	'pyr-haute-montagne': {
		name: {
			fr: 'Haute montagne',
			en: 'High mountains',
			de: 'Hochgebirge',
			it: 'Alta montagna',
			es: 'Alta montaña',
			nl: 'Hoge bergen',
			sv: 'Höga berg',
			nb: 'Høye fjell',
			pt: 'Montanhas altas',
			da: 'Høje bjerge',
			fi: 'Korkeat vuoret'
		},
		biotope: {
			fr: 'Étages subalpin et alpin',
			en: 'Subalpine and alpine belts',
			de: 'Subalpin- und Alpinstufe',
			it: 'Fasce subalpine e alpine',
			es: 'Estratos subalpino y alpino',
			nl: 'Subalpiene en alpiene riemen',
			sv: 'Subalpina och alpina bälten',
			nb: 'Subalpine og alpine belter',
			pt: 'Correias subalpinas e alpinas',
			da: 'Subalpine og alpine bælter',
			fi: 'Alppien ala- ja alppihihihnat'
		}
	},
	'pyr-piemont-oriental': {
		name: {
			fr: 'Piémont oriental',
			en: 'Eastern foothills',
			de: 'Östliches Vorland',
			it: 'Piemonte orientale',
			es: 'Pie de monte oriental',
			nl: 'Oostelijke uitlopers',
			sv: 'Östra foten',
			nb: 'Østlige foten',
			pt: 'Sopé oriental',
			da: 'Eastern foothills',
			fi: 'Itäiset juurekset'
		},
		biotope: {
			fr: 'Garrigues et piémont méditerranéen',
			en: 'Mediterranean garrigue and foothills',
			de: 'Mediterrane Garigue und Vorland',
			it: 'Gariga mediterranea e piemonte',
			es: 'Garriga mediterránea y pie de monte',
			nl: 'Mediterrane garrigue en uitlopers',
			sv: 'Garrigue och foten av Medelhavet',
			nb: 'Middelhavsgarrigue og foten av åsene',
			pt: 'Garrigue mediterrânea e contrafortes',
			da: 'Middelhavsgarrigue og foden',
			fi: 'Välimeren garrigue ja juurella'
		}
	},
	'pyr-couserans-ariege': {
		name: {
			fr: 'Couserans et Ariège',
			en: 'Couserans and Ariège',
			de: 'Couserans und Ariège',
			it: 'Couserans e Ariège',
			es: 'Couserans y Ariège',
			nl: 'Couserans en Ariège',
			sv: 'Couserans och Ariège',
			nb: 'Couserans og Ariège',
			pt: 'Couserans e Ariège',
			da: 'Couserans og Ariège',
			fi: 'Couseranit ja Ariège'
		},
		biotope: {
			fr: 'Versants calcaires et forêts mixtes',
			en: 'Limestone slopes and mixed forests',
			de: 'Kalkhanglage und Mischwälder',
			it: 'Versanti calcarei e foreste miste',
			es: 'Laderas calcáreas y bosques mixtos',
			nl: 'Kalksteenhellingen en gemengde bossen',
			sv: 'Kalkstenssluttningar och blandskogar',
			nb: 'Kalksteinsskråninger og blandede skoger',
			pt: 'Taludes calcários e florestas mistas',
			da: 'Kalkstensskråninger og blandede skove',
			fi: 'Kalkkikivirinteet ja sekametsät'
		}
	},
	'us-southwest-deserts': {
		name: {
			fr: 'Déserts et plateaux du Sud-Ouest',
			en: 'Southwest deserts & plateaus',
			de: 'Südwest-Wüsten und Hochebenen',
			it: 'Deserti e altipiani del Sud-Ovest',
			es: 'Desiertos y mesetas del Suroeste',
			nl: 'Zuidwestelijke woestijnen en plateaus',
			sv: 'Sydvästra öknar och platåer',
			nb: 'Sørvestlige ørkener og platåer',
			pt: 'Desertos e planaltos do sudoeste',
			da: 'Sydvestlige ørkener og plateauer',
			fi: 'Lounaiset aavikot ja tasangot'
		},
		biotope: {
			fr: 'Pinyon-juniper et haut désert',
			en: 'Pinyon-juniper and high desert',
			de: 'Pinyon-Juniper und Hochwüste',
			it: 'Pinyon-juniper e alto deserto',
			es: 'Pinyon-juniper y alto desierto',
			nl: 'Pinyon-juniper en hoge woestijn',
			sv: 'Pinyon-juniper och hög öken',
			nb: 'Pinyon-einer og høyørken',
			pt: 'Pinyon-juniper e deserto alto',
			da: 'Pinyon-juniper og høj ørken',
			fi: 'Pinyon-juniper ja korkea aavikko'
		}
	},
	'us-pacific-northwest': {
		name: {
			fr: 'Nord-Ouest Pacifique',
			en: 'Pacific Northwest',
			de: 'Pazifischer Nordwesten',
			it: 'Pacific Northwest',
			es: 'Noroeste del Pacífico',
			nl: 'Het noordwesten van de VS aan de Stille Oceaan',
			sv: 'Nordvästra Stillahavskusten',
			nb: 'Stillehavets nordvestlige del',
			pt: 'Noroeste Pacífico',
			da: 'Pacific Northwest',
			fi: 'Tyyni valtameri, luoteisalueet'
		},
		biotope: {
			fr: 'Forêts de conifères et chaînes côtières',
			en: 'Conifer forests and coastal ranges',
			de: 'Nadelwälder und Küstenketten',
			it: 'Foreste di conifere e catene costiere',
			es: 'Bosques de coníferas y sierras costeras',
			nl: 'Naaldbossen en kustgebieden',
			sv: 'Barrskogar och kustområden',
			nb: 'Barskoger og kystområder',
			pt: 'Florestas de coníferas e cordilheiras cos',
			da: 'Nåletræsskove og kystområder',
			fi: 'Havumetsät ja rannikkoalueet'
		}
	},
	'us-rockies': {
		name: {
			fr: 'Montagnes Rocheuses',
			en: 'Rocky Mountains',
			de: 'Rocky Mountains',
			it: 'Montagne Rocciose',
			es: 'Montañas Rocosas',
			nl: 'Rocky Mountains',
			sv: 'Klippiga bergen',
			nb: 'Rocky Mountains',
			pt: 'Montanhas Rochosas',
			da: 'Rocky Mountains',
			fi: 'Kalliovuoret'
		},
		biotope: {
			fr: 'Conifères subalpins et montagnards',
			en: 'Subalpine and montane conifers',
			de: 'Subalpine und montane Nadelbäume',
			it: 'Conifere subalpine e montane',
			es: 'Coníferas subalpinas y de montaña',
			nl: 'Subalpiene en montane coniferen',
			sv: 'Subalpina och montane barrträd',
			nb: 'Subalpine og montane bartrær',
			pt: 'Coníferas subalpinas e montanas',
			da: 'Subalpine og montane nåletræer',
			fi: 'Subalpiini ja montane havupuut'
		}
	},
	'us-appalachians': {
		name: {
			fr: 'Appalaches',
			en: 'Appalachians',
			de: 'Appalachen',
			it: 'Appalachiani',
			es: 'Apalaches',
			nl: 'Appalachen',
			sv: 'Appalacherna',
			nb: 'Appalachene',
			pt: 'Apalaches',
			da: 'Appalacherne',
			fi: 'Appalakit'
		},
		biotope: {
			fr: 'Feuillus de l’Est et pruche',
			en: 'Eastern hardwoods and hemlock',
			de: 'Östliche Laubwälder und Hemlock',
			it: 'Latifoglie orientali e hemlock',
			es: 'Caducifolios orientales y tsuga',
			nl: 'Oosters hardhout en hemlock',
			sv: 'Östra lövträd och hemlock',
			nb: 'Østlige løvtre og hemlock',
			pt: 'Madeiras de folhosas orientais e cicuta',
			da: 'Østlige hårdttræer og hemlocks',
			fi: 'Itäiset lehtipuut ja hemlokki'
		}
	},
	'us-california': {
		name: {
			fr: 'Californie — chaparral et côte',
			en: 'California chaparral & coast',
			de: 'Kalifornien — Chaparral und Küste',
			it: 'California — chaparral e costa',
			es: 'California — chaparral y costa',
			nl: 'California Chaparral & Coast',
			sv: 'Kaliforniens chaparral och kust',
			nb: 'California Chaparral og kysten',
			pt: 'Chaparral e costa da Califórnia',
			da: 'Californiens chaparral og kyst',
			fi: 'Kalifornian kappeli ja rannikko'
		},
		biotope: {
			fr: 'Chêne live oak et genévrier californien',
			en: 'Coast live oak and California juniper',
			de: 'Coast Live Oak und Kalifornischer Wacholder',
			it: 'Quercia sempreverde e ginepro californiano',
			es: 'Encino costero y enebro de California',
			nl: 'Kust levende eik en Californische jeneverbes',
			sv: 'Kustlevande ek och kalifornisk enbär',
			nb: 'Kystlevende eik og kalifornisk einer',
			pt: 'Carvalho ao vivo na costa e zimbro da Califórnia',
			da: 'Kystlevende eg og californisk enebær',
			fi: 'Rannikon elävä tammi ja Kalifornian kataja'
		}
	},
	'ca-bc-coast': {
		name: {
			fr: 'Côte de la Colombie-Britannique',
			en: 'BC Coast',
			de: 'Küste von British Columbia',
			it: 'Costa della Columbia Britannica',
			es: 'Costa de Columbia Británica',
			nl: 'Kust van British Columbia',
			sv: 'BC-kusten',
			nb: 'BC-kysten',
			pt: 'BC Coast',
			da: 'BC Coast',
			fi: 'BC Coast'
		},
		biotope: {
			fr: 'Forêt tempérée côtière',
			en: 'Coastal temperate rainforest',
			de: 'Küstennahe gemäßigte Regenwälder',
			it: 'Foresta temperata costiera',
			es: 'Bosque templado costero',
			nl: 'Kust gematigd regenwoud',
			sv: 'Kusttempererad regnskog',
			nb: 'Kystnær temperert regnskog',
			pt: 'Floresta tropical temperada costeira',
			da: 'Kysttempereret regnskov',
			fi: 'Rannikon lauhkea sademetsä'
		}
	},
	'ca-bc-interior': {
		name: {
			fr: 'Intérieur de la Colombie-Britannique',
			en: 'BC Interior',
			de: 'Interior von British Columbia',
			it: 'Interno della Columbia Britannica',
			es: 'Interior de Columbia Británica',
			nl: 'BC Interieur',
			sv: 'BC Interiör',
			nb: 'BC Interiør',
			pt: 'BC Interior',
			da: 'BC Interiør',
			fi: 'BC-sisätilat'
		},
		biotope: {
			fr: 'Forêts sèches de plateau',
			en: 'Dry interior forests and plateaus',
			de: 'Trockene Interiorwälder und Hochebenen',
			it: 'Foreste secche di altopiano',
			es: 'Bosques secos de meseta',
			nl: 'Droge binnenbossen en plateaus',
			sv: 'Torra inre skogar och platåer',
			nb: 'Tørre indre skoger og platåer',
			pt: 'Florestas e planaltos interiores secos',
			da: 'Tørre indre skove og plateauer',
			fi: 'Kuivat sisämetsät ja -tasangot'
		}
	},
	'ca-rockies': {
		name: {
			fr: 'Rocheuses canadiennes',
			en: 'Canadian Rockies',
			de: 'Kanadische Rocky Mountains',
			it: 'Rocciose canadesi',
			es: 'Rocosas canadienses',
			nl: 'Canadese Rocky Mountains',
			sv: 'Kanadensiska Klippiga bergen',
			nb: 'De kanadiske Rocky Mountains',
			pt: 'Montanhas Rochosas Canadianas',
			da: 'Canadian Rockies',
			fi: 'Kanadan Kalliovuoret'
		},
		biotope: {
			fr: 'Conifères subalpins',
			en: 'Subalpine conifers',
			de: 'Subalpine Nadelbäume',
			it: 'Conifere subalpine',
			es: 'Coníferas subalpinas',
			nl: 'Subalpiene coniferen',
			sv: 'Subalpina barrträd',
			nb: 'Subalpine bartrær',
			pt: 'Coníferas subalpinas',
			da: 'Subalpine nåletræer',
			fi: 'Alppialueen havupuut'
		}
	},
	'ca-prairies': {
		name: {
			fr: 'Prairies',
			en: 'Prairies',
			de: 'Prärien',
			it: 'Praterie',
			es: 'Praderas',
			nl: 'Prairie',
			sv: 'Prärier',
			nb: 'Præriene',
			pt: 'Pradaria',
			da: 'Prærier',
			fi: 'Preeriat'
		},
		biotope: {
			fr: 'Parkland et lisières forestières sèches',
			en: 'Parkland and dry forest edges',
			de: 'Parkland und trockene Waldränder',
			it: 'Parkland e margini forestali secchi',
			es: 'Parkland y bordes de bosque seco',
			nl: 'Parklandschap en droge bosranden',
			sv: 'Parkland och torra skogskanter',
			nb: 'Parklandskap og tørre skogsbryn',
			pt: 'Bordas de parques e florestas secas',
			da: 'Parkland og tørre skovkanter',
			fi: 'Puistoalue ja kuivat metsän reunat'
		}
	},
	'ca-boreal': {
		name: {
			fr: 'Bouclier boréal',
			en: 'Boreal Shield',
			de: 'Borealer Schild',
			it: 'Scudo boreale',
			es: 'Escudo boreal',
			nl: 'Boreaal schild',
			sv: 'Boreal sköld',
			nb: 'Borealt skjold',
			pt: 'Escudo Boreal',
			da: 'Borealskjold',
			fi: 'Boreaalinen kilpi'
		},
		biotope: {
			fr: 'Conifères boréaux et bouleau',
			en: 'Boreal conifers and birch',
			de: 'Boreale Nadelbäume und Birke',
			it: 'Conifere boreali e betulla',
			es: 'Coníferas boreales y abedul',
			nl: 'Boreale coniferen en berken',
			sv: 'Boreala barrträd och björk',
			nb: 'Boreale bartrær og bjørk',
			pt: 'Coníferas boreais e bétula',
			da: 'Boreale nåletræer og birk',
			fi: 'Boreaaliset havupuut ja koivu'
		}
	},
	'ca-quebec': {
		name: {
			fr: 'Québec / Appalaches',
			en: 'Québec / Appalachians',
			de: 'Québec / Appalachen',
			it: 'Québec / Appalachiani',
			es: 'Quebec / Apalaches',
			nl: 'Québec / Appalachen',
			sv: 'Québec / Appalacherna',
			nb: 'Québec / Appalachene',
			pt: 'Québec / Apalaches',
			da: 'Québec/Appalacherne',
			fi: 'Québec / Appalachians'
		},
		biotope: {
			fr: 'Feuillus nordiques et thuya',
			en: 'Northern hardwoods and cedar',
			de: 'Nördliche Laubwälder und Lebensbaum',
			it: 'Latifoglie settentrionali e tuia',
			es: 'Caducifolios boreales y tuya',
			nl: 'Noordelijk hardhout en cederhout',
			sv: 'Norra lövträ och cederträ',
			nb: 'Nordlige løvtre og sedertre',
			pt: 'Madeira de lei e cedro do norte',
			da: 'Nordligt hårdttræ og cedertræ',
			fi: 'Pohjoinen kovapuu ja setri'
		}
	},
	'ca-maritimes': {
		name: {
			fr: 'Maritimes',
			en: 'Maritimes',
			de: 'Maritimes',
			it: 'Maritimes',
			es: 'Marítimas',
			nl: 'Maritimes',
			sv: 'Maritimes',
			nb: 'Maritimes',
			pt: 'Maritimes',
			da: 'Maritimes',
			fi: 'Maritimes'
		},
		biotope: {
			fr: 'Forêt acadienne',
			en: 'Acadian forest',
			de: 'Akadischer Wald',
			it: 'Foresta acadiana',
			es: 'Bosque acadio',
			nl: 'Acadisch bos',
			sv: 'Akadisk skog',
			nb: 'Akadisk skog',
			pt: 'Floresta Acadiana',
			da: 'Akadisk skov',
			fi: 'Acadian forest'
		}
	},
	'nz-northland': {
		name: {
			fr: 'Northland / Auckland',
			en: 'Northland / Auckland',
			de: 'Northland / Auckland',
			it: 'Northland / Auckland',
			es: 'Northland / Auckland',
			nl: 'Northland / Auckland',
			sv: 'Northland / Auckland',
			nb: 'Northland / Auckland',
			pt: 'Northland / Auckland',
			da: 'Northland/A Auckland',
			fi: 'Northland / Auckland'
		},
		biotope: {
			fr: 'Côtier subtropical et kauri–feuillus',
			en: 'Coastal subtropical and kauri–broadleaf',
			de: 'Küstensubtropisch und Kauri–Laubwald',
			it: 'Costiero subtropicale e kauri–latifoglie',
			es: 'Costero subtropical y kauri–frondosas',
			nl: 'Subtropisch kustgebied en kauri–loofbos',
			sv: 'Kustsubtropiskt och kauri–lövskog',
			nb: 'Kystsubtropisk og kauri–løvskog',
			pt: 'Subtropical costeira e kauri–broadleaf',
			da: 'Kystnære subtropiske og kauri-bredblad',
			fi: 'Subtrooppinen rannikko ja kauri–broadleaf'
		}
	},
	'nz-central-ni': {
		name: {
			fr: 'Centre de l’île du Nord',
			en: 'Central North Island',
			de: 'Zentrale Nordinsel',
			it: 'Isola del Nord centrale',
			es: 'Isla Norte central',
			nl: 'Centraal Noordereiland',
			sv: 'Centrala Nordön',
			nb: 'Sentral Nordøya',
			pt: 'Ilha Norte Central',
			da: 'Central North Island',
			fi: 'Keski-Pohjanmaan saari'
		},
		biotope: {
			fr: 'Plateau volcanique et podocarpes mixtes',
			en: 'Volcanic plateau and mixed podocarp',
			de: 'Vulkanisches Plateau und gemischte Podocarpus',
			it: 'Altopiano vulcanico e podocarpi misti',
			es: 'Meseta volcánica y podocarpos mixtos',
			nl: 'Vulkanisch plateau en gemengd podocarpusbos',
			sv: 'Vulkaniskt platåland och blandad podocarp',
			nb: 'Vulkanisk platå og blandet podocarp',
			pt: 'Planalto vulcânico e podocarpo misto',
			da: 'Vulkansk plateau og blandet podocarp',
			fi: 'Vulkaaninen tasanko ja sekoitettu podokarppi'
		}
	},
	'nz-wellington': {
		name: {
			fr: 'Wellington / Côte Est',
			en: 'Wellington / East Coast',
			de: 'Wellington / Ostküste',
			it: 'Wellington / Costa Est',
			es: 'Wellington / Costa Este',
			nl: 'Wellington / oostkust',
			sv: 'Wellington / östkust',
			nb: 'Wellington / østkyst',
			pt: 'Wellington /Costa Leste',
			da: 'Wellington/østkysten',
			fi: 'Wellington / itärannikko'
		},
		biotope: {
			fr: 'Broussailles côtières et forêt en régénération',
			en: 'Coastal scrub and regenerating forest',
			de: 'Küstengestrüpp und Regenerationswald',
			it: 'Macchia costiera e foresta in rigenerazione',
			es: 'Matorral costero y bosque en regeneración',
			nl: 'Kuststruweel en regenererend bos',
			sv: 'Kustbuskage och regenererande skog',
			nb: 'Kystkratt og regenererende skog',
			pt: 'Arbustos costeiros e florestas em regeneração',
			da: 'Kystskrubbe og regenererende skov',
			fi: 'Rannikon pensaikko JA uudistuva metsä'
		}
	},
	'nz-nelson': {
		name: {
			fr: 'Nelson / Marlborough',
			en: 'Nelson / Marlborough',
			de: 'Nelson / Marlborough',
			it: 'Nelson / Marlborough',
			es: 'Nelson / Marlborough',
			nl: 'Nelson / Marlborough',
			sv: 'Nelson / Marlborough',
			nb: 'Nelson / Marlborough',
			pt: 'Nelson / Marlborough',
			da: 'Nelson/Marlborough',
			fi: 'Nelson / Marlborough'
		},
		biotope: {
			fr: 'Collines sèches et lisières de hêtre',
			en: 'Dry hills and beech margins',
			de: 'Trockene Hügel und Buchenränder',
			it: 'Colline asciutte e margini di faggio',
			es: 'Colinas secas y márgenes de haya',
			nl: 'Droge heuvels en beukenranden',
			sv: 'Torra kullar och bokbryn',
			nb: 'Tørre åser og bøkerender',
			pt: 'Colinas secas e margens de faia',
			da: 'Tørre bakker og bøgemargener',
			fi: 'Kuivat kukkulat ja pyökin reunat'
		}
	},
	'nz-west-coast': {
		name: {
			fr: 'Côte Ouest',
			en: 'West Coast',
			de: 'Westküste',
			it: 'Costa Ovest',
			es: 'Costa Oeste',
			nl: 'Westkust',
			sv: 'Västkusten',
			nb: 'Vestkysten',
			pt: 'Costa Oeste',
			da: 'Vestkysten',
			fi: 'Länsirannikko'
		},
		biotope: {
			fr: 'Forêt tempérée humide et podocarpes',
			en: 'Temperate rainforest and podocarp',
			de: 'Gemäßigter Regenwald und Podocarpus',
			it: 'Foresta temperata umida e podocarpi',
			es: 'Bosque templado húmedo y podocarpos',
			nl: 'Gematigd regenwoud en podocarpus',
			sv: 'Tempererad regnskog och podocarp',
			nb: 'Temperert regnskog og podocarp',
			pt: 'Floresta tropical temperada e podocarpo',
			da: 'Tempereret regnskov og podocarp',
			fi: 'Lauhkeat sademetsät ja podokarpit'
		}
	},
	'nz-canterbury': {
		name: {
			fr: 'Canterbury',
			en: 'Canterbury',
			de: 'Canterbury',
			it: 'Canterbury',
			es: 'Canterbury',
			nl: 'Canterbury',
			sv: 'Canterbury',
			nb: 'Canterbury',
			pt: 'Canterbury',
			da: 'Canterbury',
			fi: 'Canberranew- zealand. kgm'
		},
		biotope: {
			fr: 'Terres sèches de l’Est et forêts de piémont',
			en: 'Eastern drylands and foothill forest',
			de: 'Östliche Trockengebiete und Vorbergwälder',
			it: 'Terre secche orientali e foreste di pedemonte',
			es: 'Tierras secas orientales y bosques de piedemonte',
			nl: 'Oostelijke droge gebieden en heuvelvoetbos',
			sv: 'Östra torrland och förbergsskog',
			nb: 'Østlige tørrland og fotåsskog',
			pt: 'Terras secas orientais e floresta no sopé do morro',
			da: 'Østlige tørområder og foden af skoven',
			fi: 'Itäiset kuivat alueet ja juurella sijaitseva metsä'
		}
	},
	'nz-otago': {
		name: {
			fr: 'Otago / Southland / Fiordland',
			en: 'Otago / Southland / Fiordland',
			de: 'Otago / Southland / Fiordland',
			it: 'Otago / Southland / Fiordland',
			es: 'Otago / Southland / Fiordland',
			nl: 'Otago / Southland / Fiordland',
			sv: 'Otago / Southland / Fiordland',
			nb: 'Otago / Southland / Fiordland',
			pt: 'Otago / Southland / Fiordland',
			da: 'Otago/Southland/Fjordland',
			fi: 'Otago / Southland / Fiordland'
		},
		biotope: {
			fr: 'Hêtre austral et marges alpines',
			en: 'Southern beech and alpine margins',
			de: 'Südbuche und alpine Ränder',
			it: 'Faggio australe e margini alpini',
			es: 'Haya austral y márgenes alpinos',
			nl: 'Zuidelijke beuk en alpiene randen',
			sv: 'Sydbok och alpina bryn',
			nb: 'Sørbøk og alpine rander',
			pt: 'Faia do sul e margens alpinas',
			da: 'Sydlig bøg og alpine margener',
			fi: 'Etelän pyökki- ja alppimarginaalit'
		}
	},
	'pt-norte': {
		name: {
			fr: 'Norte / Minho–Douro',
			en: 'Norte / Minho–Douro',
			de: 'Norte / Minho–Douro',
			it: 'Norte / Minho–Douro',
			es: 'Norte / Miño–Duero',
			nl: 'Norte / Minho–Douro',
			sv: 'Norte / Minho–Douro',
			nb: 'Norte / Minho–Douro',
			pt: 'Norte / Minho–Douro',
			da: 'Norte/Minho-Douro',
			fi: 'Norte / Minho–Douro'
		},
		biotope: {
			fr: 'Chênaie atlantique et pin',
			en: 'Atlantic oak and pine',
			de: 'Atlantische Eichen und Kiefern',
			it: 'Querce atlantiche e pini',
			es: 'Robledal atlántico y pino',
			nl: 'Atlantische eik en den',
			sv: 'Atlantisk ek och tall',
			nb: 'Atlantisk eik og furu',
			pt: 'Carvalho e pinheiro do Atlântico',
			da: 'Atlanterhavseg og fyrretræ',
			fi: 'Atlanttitammi ja -mänty'
		}
	},
	'pt-centro': {
		name: {
			fr: 'Centro',
			en: 'Centro',
			de: 'Centro',
			it: 'Centro',
			es: 'Centro',
			nl: 'Centro',
			sv: 'Centro',
			nb: 'Centro',
			pt: 'Centro',
			da: 'Centro',
			fi: 'Trentonusa. kgm'
		},
		biotope: {
			fr: 'Mosaïque pin et chêne-liège',
			en: 'Pine and cork oak mosaic',
			de: 'Kiefern- und Korkeichenmosaik',
			it: 'Mosaico di pini e sughera',
			es: 'Mosaico de pino y alcornoque',
			nl: 'Mozaïek van dennen en kurkeik',
			sv: 'Mosaik av tall och korkek',
			nb: 'Mosaikk av furu og korkeik',
			pt: 'Mosaico de pinheiro e sobreiro',
			da: 'Mosaik af fyrretræ og korkeg',
			fi: 'Mänty- ja korkkitammimosaiikki'
		}
	},
	'pt-lisboa': {
		name: {
			fr: 'Lisboa / Oeste',
			en: 'Lisboa / Oeste',
			de: 'Lissabon / Oeste',
			it: 'Lisbona / Oeste',
			es: 'Lisboa / Oeste',
			nl: 'Lisboa / Oeste',
			sv: 'Lisboa / Oeste',
			nb: 'Lisboa / Oeste',
			pt: 'Lisboa / Oeste',
			da: 'Lisboa/Oeste',
			fi: 'Lissabon / Oeste'
		},
		biotope: {
			fr: 'Garrigue littorale et olivier',
			en: 'Coastal scrub and olive',
			de: 'Küstengestrüpp und Olive',
			it: 'Macchia costiera e olivo',
			es: 'Matorral costero y olivo',
			nl: 'Kuststruweel en olijf',
			sv: 'Kustbuskage och oliv',
			nb: 'Kystkratt og oliven',
			pt: 'Esfoliação costeira e azeitona',
			da: 'Kystskrubbe og oliven',
			fi: 'Rannikon kuorinta-aine ja oliivi'
		}
	},
	'pt-alentejo': {
		name: {
			fr: 'Alentejo',
			en: 'Alentejo',
			de: 'Alentejo',
			it: 'Alentejo',
			es: 'Alentejo',
			nl: 'Alentejo',
			sv: 'Alentejo',
			nb: 'Alentejo',
			pt: 'Alentejo',
			da: 'Alentejo',
			fi: 'Alentejo'
		},
		biotope: {
			fr: 'Montado — chêne-liège et chêne vert',
			en: 'Montado — cork and holm oak',
			de: 'Montado — Kork- und Steineiche',
			it: 'Montado — sughera e leccio',
			es: 'Dehesa / montado — alcornoque y encina',
			nl: 'Montado — kurk- en steeneik',
			sv: 'Montado — kork- och stenek',
			nb: 'Montado — kork- og steineik',
			pt: 'Montado — sobreiro',
			da: 'Montado — kork og holme eg',
			fi: 'Montado — korkki ja holm-tammi'
		}
	},
	'pt-algarve': {
		name: {
			fr: 'Algarve',
			en: 'Algarve',
			de: 'Algarve',
			it: 'Algarve',
			es: 'Algarve',
			nl: 'Algarve',
			sv: 'Algarve',
			nb: 'Algarve',
			pt: 'Algarve',
			da: 'Algarve',
			fi: 'Algarve'
		},
		biotope: {
			fr: 'Garrigue méditerranéenne et caroubier',
			en: 'Mediterranean scrub and carob',
			de: 'Mediterranes Gestrüpp und Johannisbrot',
			it: 'Macchia mediterranea e carrubo',
			es: 'Matorral mediterráneo y algarrobo',
			nl: 'Mediterraan struweel en Johannesbroodboom',
			sv: 'Medelhavsbuskage och johannesbröd',
			nb: 'Middelhavskratt og johannesbrød',
			pt: 'Esfoliação mediterrânea e alfarroba',
			da: 'Middelhavsskrubbe og johannesbrød',
			fi: 'Välimeren kuorinta-aine ja johanneksenleipäpu'
		}
	},
	'pt-madeira': {
		name: {
			fr: 'Madère',
			en: 'Madeira',
			de: 'Madeira',
			it: 'Madera',
			es: 'Madeira',
			nl: 'Madeira',
			sv: 'Madeira',
			nb: 'Madeira',
			pt: 'Madeira',
			da: 'Madeira',
			fi: 'Madeira'
		},
		biotope: {
			fr: 'Laurisylve et garrigue côtière',
			en: 'Laurisilva and coastal scrub',
			de: 'Lorbeerwald und Küstengestrüpp',
			it: 'Laurisilva e macchia costiera',
			es: 'Laurisilva y matorral costero',
			nl: 'Laurisilva en kuststruweel',
			sv: 'Laurisilva och kustbuskage',
			nb: 'Laurisilva og kystkratt',
			pt: 'Laurissilva e matagal costeiro',
			da: 'Laurisilva og kystskrubbe',
			fi: 'Laurisilva ja rannikkokuorinta'
		}
	},
	'pt-azores': {
		name: {
			fr: 'Açores',
			en: 'Azores',
			de: 'Azoren',
			it: 'Azzorre',
			es: 'Azores',
			nl: 'Azoren',
			sv: 'Azorerna',
			nb: 'Azorene',
			pt: 'Açores',
			da: 'Azorerne',
			fi: 'Azorit'
		},
		biotope: {
			fr: 'Îles atlantiques — brousse humide',
			en: 'Atlantic islands — humid scrub',
			de: 'Atlantische Inseln — feuchtes Gestrüpp',
			it: 'Isole atlantiche — macchia umida',
			es: 'Islas atlánticas — matorral húmedo',
			nl: 'Atlantische eilanden — vochtig struweel',
			sv: 'Atlantöar — fuktig buskvegetation',
			nb: 'Atlanterhavsøyer — fuktig kratt',
			pt: 'Ilhas atlânticas — matagal húmido',
			da: 'Atlanterhavsøer — fugtig krat',
			fi: 'Atlantin saaret — kostea pensaikko'
		}
	},
	'au-nsw': {
		name: {
			fr: 'Nouvelle-Galles du Sud',
			en: 'New South Wales',
			de: 'New South Wales',
			it: 'Nuovo Galles del Sud',
			es: 'Nueva Gales del Sur',
			nl: 'New South Wales',
			sv: 'New South Wales',
			nb: 'New South Wales',
			pt: 'Nova Gales do Sul',
			da: 'New South Wales',
			fi: 'New South Wales'
		},
		biotope: {
			fr: 'Sclérophylle côtier et landes de grès',
			en: 'Coastal sclerophyll and sandstone heath',
			de: 'Küstensklerophyll und Sandsteinheide',
			it: 'Sclerofillo costiero e brughiera su arenaria',
			es: 'Esclerófilo costero y brezal de arenisca',
			nl: 'Kustsclerofyl en zandsteenheide',
			sv: 'Kustsklerofyll och sandstenshed',
			nb: 'Kystsklerofyll og sandsteinhei',
			pt: 'Esclerófilo costeiro e charneca de arenito',
			da: 'Kystsklerofyl og sandstenshede',
			fi: 'Rannikon sklerofylli ja hiekkakivikanerva'
		}
	},
	'au-vic': {
		name: {
			fr: 'Victoria',
			en: 'Victoria',
			de: 'Victoria',
			it: 'Victoria',
			es: 'Victoria',
			nl: 'Victoria',
			sv: 'Victoria',
			nb: 'Victoria',
			pt: 'Victoria',
			da: 'Victoria',
			fi: 'Victoria'
		},
		biotope: {
			fr: 'Eucalyptus tempéré et brousse côtière',
			en: 'Temperate eucalypt and coastal scrub',
			de: 'Gemäßigter Eukalyptus und Küstengestrüpp',
			it: 'Eucalipto temperato e macchia costiera',
			es: 'Eucalipto templado y matorral costero',
			nl: 'Gematigde eucalyptus en kuststruweel',
			sv: 'Tempererad eukalyptus och kustbuskage',
			nb: 'Temperert eukalyptus og kystkratt',
			pt: 'Eucalipto temperado e matagal costeiro',
			da: 'Tempereret eukalyptus og kystkrat',
			fi: 'Lauhkea eukalyptus ja rannikkopensasikko'
		}
	},
	'au-qld': {
		name: {
			fr: 'Queensland',
			en: 'Queensland',
			de: 'Queensland',
			it: 'Queensland',
			es: 'Queensland',
			nl: 'Queensland',
			sv: 'Queensland',
			nb: 'Queensland',
			pt: 'Queensland',
			da: 'Queensland',
			fi: 'Queensland'
		},
		biotope: {
			fr: 'Lisières de forêt subtropicale et brousse côtière',
			en: 'Subtropical rainforest margins and coastal scrub',
			de: 'Subtropische Regenwaldränder und Küstengestrüpp',
			it: 'Margini di foresta pluviale subtropicale e macchia costiera',
			es: 'Márgenes de selva subtropical y matorral costero',
			nl: 'Subtropische regenwoudranden en kuststruweel',
			sv: 'Subtropiska regnskogsbryn och kustbuskage',
			nb: 'Subtropiske regnskogkanter og kystkratt',
			pt: 'Margens de floresta subtropical e matagal costeiro',
			da: 'Subtropiske regnskovskanter og kystkrat',
			fi: 'Subtrooppisen sademetsän reunat ja rannikkopensasikko'
		}
	},
	'au-sa': {
		name: {
			fr: 'Australie-Méridionale',
			en: 'South Australia',
			de: 'Südaustralien',
			it: 'Australia Meridionale',
			es: 'Australia Meridional',
			nl: 'Zuid-Australië',
			sv: 'Sydaustralien',
			nb: 'Sør-Australia',
			pt: 'Austrália do Sul',
			da: 'Sydaustralien',
			fi: 'Etelä-Australia'
		},
		biotope: {
			fr: 'Mallee et sclérophylle sec',
			en: 'Mallee and dry sclerophyll',
			de: 'Mallee und trockenes Sklerophyll',
			it: 'Mallee e sclerofillo arido',
			es: 'Mallee y esclerófilo seco',
			nl: 'Mallee en droog sclerofyl',
			sv: 'Mallee och torr sklerofyll',
			nb: 'Mallee og tørr sklerofyll',
			pt: 'Mallee e esclerófilo seco',
			da: 'Mallee og tør sklerofyl',
			fi: 'Mallee ja kuiva sklerofylli'
		}
	},
	'au-wa': {
		name: {
			fr: 'Australie-Occidentale',
			en: 'Western Australia',
			de: 'Westaustralien',
			it: 'Australia Occidentale',
			es: 'Australia Occidental',
			nl: 'West-Australië',
			sv: 'Västaustralien',
			nb: 'Vest-Australia',
			pt: 'Austrália Ocidental',
			da: 'Vestaustralien',
			fi: 'Länsi-Australia'
		},
		biotope: {
			fr: 'Landes kwongan et forêt de jarrah',
			en: 'Kwongan heath and jarrah forest',
			de: 'Kwongan-Heide und Jarrah-Wald',
			it: 'Brughiera kwongan e foresta di jarrah',
			es: 'Brezal kwongan y bosque de jarrah',
			nl: 'Kwongan-heide en jarrahbos',
			sv: 'Kwonganhed och jarrahskog',
			nb: 'Kwonganhei og jarrahskog',
			pt: 'Charneca kwongan e floresta de jarrah',
			da: 'Kwonganhede og jarrahskov',
			fi: 'Kwongan-kanerva ja jarrahmetsä'
		}
	},
	'au-tas': {
		name: {
			fr: 'Tasmanie',
			en: 'Tasmania',
			de: 'Tasmanien',
			it: 'Tasmania',
			es: 'Tasmania',
			nl: 'Tasmanië',
			sv: 'Tasmanien',
			nb: 'Tasmania',
			pt: 'Tasmânia',
			da: 'Tasmanien',
			fi: 'Tasmania'
		},
		biotope: {
			fr: 'Forêt tempérée froide et alpin',
			en: 'Cool temperate rainforest and alpine',
			de: 'Kühlgemäßigter Regenwald und Alpin',
			it: 'Foresta pluviale temperata fresca e alpina',
			es: 'Selva templada fría y alpina',
			nl: 'Koel-gematigd regenwoud en alpien',
			sv: 'Svalt tempererad regnskog och alpint',
			nb: 'Kjølig temperert regnskog og alpint',
			pt: 'Floresta temperada fria e alpina',
			da: 'Køligt tempereret regnskov og alpint',
			fi: 'Viileä lauhkea sademetsä ja alpiininen'
		}
	},
	'au-nt': {
		name: {
			fr: 'Territoire du Nord',
			en: 'Northern Territory',
			de: 'Northern Territory',
			it: 'Territorio del Nord',
			es: 'Territorio del Norte',
			nl: 'Noordelijk Territorium',
			sv: 'Northern Territory',
			nb: 'Northern Territory',
			pt: 'Território do Norte',
			da: 'Northern Territory',
			fi: 'Pohjoisterritorio'
		},
		biotope: {
			fr: 'Savane tropicale et forêt de mousson',
			en: 'Tropical savanna and monsoon forest',
			de: 'Tropische Savanne und Monsunwald',
			it: 'Savana tropicale e foresta monsonica',
			es: 'Sabana tropical y bosque monzónico',
			nl: 'Tropische savanne en moessonbos',
			sv: 'Tropisk savann och monsunskog',
			nb: 'Tropisk savanne og monsunskog',
			pt: 'Savana tropical e floresta de monção',
			da: 'Tropisk savanne og monsunskov',
			fi: 'Trooppinen savanni ja monsuunimetsä'
		}
	}
};

function fallbackRegion(regionId: string) {
	return BIOTOPE_REGIONS.find((region) => region.id === regionId);
}

export function regionDisplayName(regionId: string, locale?: AppLocale): string {
	const activeLocale = locale ?? getActiveLocale();
	const entry = REGION_DISPLAY[regionId];
	if (entry) return entry.name[activeLocale];
	return fallbackRegion(regionId)?.name ?? regionId;
}

export function regionBiotopeDisplay(regionId: string, locale?: AppLocale): string {
	const activeLocale = locale ?? getActiveLocale();
	const entry = REGION_DISPLAY[regionId];
	if (entry) return entry.biotope[activeLocale];
	return fallbackRegion(regionId)?.biotope ?? '';
}
