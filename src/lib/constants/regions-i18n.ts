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
			nb: 'Brière og Gâvre-skogen'
		},
		biotope: {
			fr: 'Pins sylvestres et futaies mixtes humides',
			en: 'Scots pines and wet mixed forests',
			de: 'Kiefern und feuchte Mischwälder',
			it: 'Pini silvestri e foreste miste umide',
			es: 'Pinos silvestres y bosques mixtos húmedos',
			nl: 'Grove dennen en natte gemengde bossen',
			sv: 'Tallar och våta blandskogar',
			nb: 'Skotske furuer og våte blandingsskoger'
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
			nb: 'Atlanterhavskysten'
		},
		biotope: {
			fr: 'Dunes et friches littorales',
			en: 'Dunes and coastal wasteland',
			de: 'Dünen und Küstenbrachen',
			it: 'Dune e terreni incolti costieri',
			es: 'Dunas y terrenos baldíos costeros',
			nl: 'Duinen en kustwoestenij',
			sv: 'Sanddyner och kustnära ödemark',
			nb: 'Sanddyner og kystødemark'
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
			nb: 'Bocage i Anjou og Mayenne'
		},
		biotope: {
			fr: 'Bocage humide et haies',
			en: 'Wet bocage and hedgerows',
			de: 'Feuchtes Bocage und Hecken',
			it: 'Bocage umido e siepi',
			es: 'Bocage húmedo y setos',
			nl: 'Natte bocage en heggen',
			sv: 'Våt bocage och häckar',
			nb: 'Våte bocage-områder og hekker'
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
			nb: 'Lavlandsskog'
		},
		biotope: {
			fr: 'Hêtraie-chênaie de plaine (Sarthe, Bercé)',
			en: 'Lowland beech-oak forest (Sarthe, Bercé)',
			de: 'Flachland-Buchen-Eichenwald (Sarthe, Bercé)',
			it: 'Faggeta-querceto di pianura (Sarthe, Bercé)',
			es: 'Hayedo-robledal de llanura (Sarthe, Bercé)',
			nl: 'Laagland beuken-eikenbos (Sarthe, Bercé)',
			sv: 'Låglänta bok-ekskogar (Sarthe, Bercé)',
			nb: 'Lavlandsskog av bøk og eik (Sarthe, Bercé)'
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
			nb: 'Myrer og våtmarker'
		},
		biotope: {
			fr: 'Marais briéron et vallées humides',
			en: 'Brière marsh and wet valleys',
			de: 'Brière-Sumpf und feuchte Täler',
			it: 'Palude della Brière e valli umide',
			es: 'Marisma de Brière y valles húmedas',
			nl: 'Brière moeras en natte valleien',
			sv: 'Brière-marsch och våta dalar',
			nb: 'Brière-myr og våte daler'
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
			nb: 'Forez frynser'
		},
		biotope: {
			fr: 'Lisière montagneuse et landes',
			en: 'Mountain fringe and heathland',
			de: 'Gebirgsrand und Heidelandschaft',
			it: 'Margine montano e lande',
			es: 'Borde montañoso y landas',
			nl: 'Bergrand en heide',
			sv: 'Fjällkanter och hedmarker',
			nb: 'Fjellkant og lynglandskap'
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
			nb: 'Atlanterhavsfoten'
		},
		biotope: {
			fr: 'Collines du Pays Basque et Béarn',
			en: 'Basque Country and Béarn hills',
			de: 'Hügel des Baskenlands und Béarn',
			it: 'Colline del Paese Basco e del Béarn',
			es: 'Colinas del País Vasco y Bearne',
			nl: 'Baskenland en Béarn heuvels',
			sv: 'Kullarna i Baskien och Béarn',
			nb: 'Baskerland og Béarn-åsene'
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
			nb: 'Sentrale daler'
		},
		biotope: {
			fr: 'Forêts de montagne moyenne',
			en: 'Mid-mountain forests',
			de: 'Mittelgebirgswälder',
			it: 'Foreste di montagna media',
			es: 'Bosques de montaña media',
			nl: 'bergwoud;',
			sv: 'Skogar i mitten av bergen',
			nb: 'Midtfjellskoger'
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
			nb: 'Høye fjell'
		},
		biotope: {
			fr: 'Étages subalpin et alpin',
			en: 'Subalpine and alpine belts',
			de: 'Subalpin- und Alpinstufe',
			it: 'Fasce subalpine e alpine',
			es: 'Estratos subalpino y alpino',
			nl: 'Subalpiene en alpiene riemen',
			sv: 'Subalpina och alpina bälten',
			nb: 'Subalpine og alpine belter'
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
			nb: 'Østlige foten'
		},
		biotope: {
			fr: 'Garrigues et piémont méditerranéen',
			en: 'Mediterranean garrigue and foothills',
			de: 'Mediterrane Garigue und Vorland',
			it: 'Gariga mediterranea e piemonte',
			es: 'Garriga mediterránea y pie de monte',
			nl: 'Mediterrane garrigue en uitlopers',
			sv: 'Garrigue och foten av Medelhavet',
			nb: 'Middelhavsgarrigue og foten av åsene'
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
			nb: 'Couserans og Ariège'
		},
		biotope: {
			fr: 'Versants calcaires et forêts mixtes',
			en: 'Limestone slopes and mixed forests',
			de: 'Kalkhanglage und Mischwälder',
			it: 'Versanti calcarei e foreste miste',
			es: 'Laderas calcáreas y bosques mixtos',
			nl: 'Kalksteenhellingen en gemengde bossen',
			sv: 'Kalkstenssluttningar och blandskogar',
			nb: 'Kalksteinsskråninger og blandede skoger'
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
			nb: 'Sørvestlige ørkener og platåer'
		},
		biotope: {
			fr: 'Pinyon-juniper et haut désert',
			en: 'Pinyon-juniper and high desert',
			de: 'Pinyon-Juniper und Hochwüste',
			it: 'Pinyon-juniper e alto deserto',
			es: 'Pinyon-juniper y alto desierto',
			nl: 'Pinyon-juniper en hoge woestijn',
			sv: 'Pinyon-juniper och hög öken',
			nb: 'Pinyon-einer og høyørken'
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
			nb: 'Stillehavets nordvestlige del'
		},
		biotope: {
			fr: 'Forêts de conifères et chaînes côtières',
			en: 'Conifer forests and coastal ranges',
			de: 'Nadelwälder und Küstenketten',
			it: 'Foreste di conifere e catene costiere',
			es: 'Bosques de coníferas y sierras costeras',
			nl: 'Naaldbossen en kustgebieden',
			sv: 'Barrskogar och kustområden',
			nb: 'Barskoger og kystområder'
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
			nb: 'Rocky Mountains'
		},
		biotope: {
			fr: 'Conifères subalpins et montagnards',
			en: 'Subalpine and montane conifers',
			de: 'Subalpine und montane Nadelbäume',
			it: 'Conifere subalpine e montane',
			es: 'Coníferas subalpinas y de montaña',
			nl: 'Subalpiene en montane coniferen',
			sv: 'Subalpina och montane barrträd',
			nb: 'Subalpine og montane bartrær'
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
			nb: 'Appalachene'
		},
		biotope: {
			fr: 'Feuillus de l’Est et pruche',
			en: 'Eastern hardwoods and hemlock',
			de: 'Östliche Laubwälder und Hemlock',
			it: 'Latifoglie orientali e hemlock',
			es: 'Caducifolios orientales y tsuga',
			nl: 'Oosters hardhout en hemlock',
			sv: 'Östra lövträd och hemlock',
			nb: 'Østlige løvtre og hemlock'
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
			nb: 'California Chaparral og kysten'
		},
		biotope: {
			fr: 'Chêne live oak et genévrier californien',
			en: 'Coast live oak and California juniper',
			de: 'Coast Live Oak und Kalifornischer Wacholder',
			it: 'Quercia sempreverde e ginepro californiano',
			es: 'Encino costero y enebro de California',
			nl: 'Kust levende eik en Californische jeneverbes',
			sv: 'Kustlevande ek och kalifornisk enbär',
			nb: 'Kystlevende eik og kalifornisk einer'
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
			nb: 'BC-kysten'
		},
		biotope: {
			fr: 'Forêt tempérée côtière',
			en: 'Coastal temperate rainforest',
			de: 'Küstennahe gemäßigte Regenwälder',
			it: 'Foresta temperata costiera',
			es: 'Bosque templado costero',
			nl: 'Kust gematigd regenwoud',
			sv: 'Kusttempererad regnskog',
			nb: 'Kystnær temperert regnskog'
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
			nb: 'BC Interiør'
		},
		biotope: {
			fr: 'Forêts sèches de plateau',
			en: 'Dry interior forests and plateaus',
			de: 'Trockene Interiorwälder und Hochebenen',
			it: 'Foreste secche di altopiano',
			es: 'Bosques secos de meseta',
			nl: 'Droge binnenbossen en plateaus',
			sv: 'Torra inre skogar och platåer',
			nb: 'Tørre indre skoger og platåer'
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
			nb: 'De kanadiske Rocky Mountains'
		},
		biotope: {
			fr: 'Conifères subalpins',
			en: 'Subalpine conifers',
			de: 'Subalpine Nadelbäume',
			it: 'Conifere subalpine',
			es: 'Coníferas subalpinas',
			nl: 'Subalpiene coniferen',
			sv: 'Subalpina barrträd',
			nb: 'Subalpine bartrær'
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
			nb: 'Præriene'
		},
		biotope: {
			fr: 'Parkland et lisières forestières sèches',
			en: 'Parkland and dry forest edges',
			de: 'Parkland und trockene Waldränder',
			it: 'Parkland e margini forestali secchi',
			es: 'Parkland y bordes de bosque seco',
			nl: 'Parklandschap en droge bosranden',
			sv: 'Parkland och torra skogskanter',
			nb: 'Parklandskap og tørre skogsbryn'
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
			nb: 'Borealt skjold'
		},
		biotope: {
			fr: 'Conifères boréaux et bouleau',
			en: 'Boreal conifers and birch',
			de: 'Boreale Nadelbäume und Birke',
			it: 'Conifere boreali e betulla',
			es: 'Coníferas boreales y abedul',
			nl: 'Boreale coniferen en berken',
			sv: 'Boreala barrträd och björk',
			nb: 'Boreale bartrær og bjørk'
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
			nb: 'Québec / Appalachene'
		},
		biotope: {
			fr: 'Feuillus nordiques et thuya',
			en: 'Northern hardwoods and cedar',
			de: 'Nördliche Laubwälder und Lebensbaum',
			it: 'Latifoglie settentrionali e tuia',
			es: 'Caducifolios boreales y tuya',
			nl: 'Noordelijk hardhout en cederhout',
			sv: 'Norra lövträ och cederträ',
			nb: 'Nordlige løvtre og sedertre'
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
			nb: 'Maritimes'
		},
		biotope: {
			fr: 'Forêt acadienne',
			en: 'Acadian forest',
			de: 'Akadischer Wald',
			it: 'Foresta acadiana',
			es: 'Bosque acadio',
			nl: 'Acadisch bos',
			sv: 'Akadisk skog',
			nb: 'Akadisk skog'
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
			nb: 'Northland / Auckland'
		},
		biotope: {
			fr: 'Côtier subtropical et kauri–feuillus',
			en: 'Coastal subtropical and kauri–broadleaf',
			de: 'Küstensubtropisch und Kauri–Laubwald',
			it: 'Costiero subtropicale e kauri–latifoglie',
			es: 'Costero subtropical y kauri–frondosas',
			nl: 'Subtropisch kustgebied en kauri–loofbos',
			sv: 'Kustsubtropiskt och kauri–lövskog',
			nb: 'Kystsubtropisk og kauri–løvskog'
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
			nb: 'Sentral Nordøya'
		},
		biotope: {
			fr: 'Plateau volcanique et podocarpes mixtes',
			en: 'Volcanic plateau and mixed podocarp',
			de: 'Vulkanisches Plateau und gemischte Podocarpus',
			it: 'Altopiano vulcanico e podocarpi misti',
			es: 'Meseta volcánica y podocarpos mixtos',
			nl: 'Vulkanisch plateau en gemengd podocarpusbos',
			sv: 'Vulkaniskt platåland och blandad podocarp',
			nb: 'Vulkanisk platå og blandet podocarp'
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
			nb: 'Wellington / østkyst'
		},
		biotope: {
			fr: 'Broussailles côtières et forêt en régénération',
			en: 'Coastal scrub and regenerating forest',
			de: 'Küstengestrüpp und Regenerationswald',
			it: 'Macchia costiera e foresta in rigenerazione',
			es: 'Matorral costero y bosque en regeneración',
			nl: 'Kuststruweel en regenererend bos',
			sv: 'Kustbuskage och regenererande skog',
			nb: 'Kystkratt og regenererende skog'
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
			nb: 'Nelson / Marlborough'
		},
		biotope: {
			fr: 'Collines sèches et lisières de hêtre',
			en: 'Dry hills and beech margins',
			de: 'Trockene Hügel und Buchenränder',
			it: 'Colline asciutte e margini di faggio',
			es: 'Colinas secas y márgenes de haya',
			nl: 'Droge heuvels en beukenranden',
			sv: 'Torra kullar och bokbryn',
			nb: 'Tørre åser og bøkerender'
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
			nb: 'Vestkysten'
		},
		biotope: {
			fr: 'Forêt tempérée humide et podocarpes',
			en: 'Temperate rainforest and podocarp',
			de: 'Gemäßigter Regenwald und Podocarpus',
			it: 'Foresta temperata umida e podocarpi',
			es: 'Bosque templado húmedo y podocarpos',
			nl: 'Gematigd regenwoud en podocarpus',
			sv: 'Tempererad regnskog och podocarp',
			nb: 'Temperert regnskog og podocarp'
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
			nb: 'Canterbury'
		},
		biotope: {
			fr: 'Terres sèches de l’Est et forêts de piémont',
			en: 'Eastern drylands and foothill forest',
			de: 'Östliche Trockengebiete und Vorbergwälder',
			it: 'Terre secche orientali e foreste di pedemonte',
			es: 'Tierras secas orientales y bosques de piedemonte',
			nl: 'Oostelijke droge gebieden en heuvelvoetbos',
			sv: 'Östra torrland och förbergsskog',
			nb: 'Østlige tørrland og fotåsskog'
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
			nb: 'Otago / Southland / Fiordland'
		},
		biotope: {
			fr: 'Hêtre austral et marges alpines',
			en: 'Southern beech and alpine margins',
			de: 'Südbuche und alpine Ränder',
			it: 'Faggio australe e margini alpini',
			es: 'Haya austral y márgenes alpinos',
			nl: 'Zuidelijke beuk en alpiene randen',
			sv: 'Sydbok och alpina bryn',
			nb: 'Sørbøk og alpine rander'
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
			nb: 'Norte / Minho–Douro'
		},
		biotope: {
			fr: 'Chênaie atlantique et pin',
			en: 'Atlantic oak and pine',
			de: 'Atlantische Eichen und Kiefern',
			it: 'Querce atlantiche e pini',
			es: 'Robledal atlántico y pino',
			nl: 'Atlantische eik en den',
			sv: 'Atlantisk ek och tall',
			nb: 'Atlantisk eik og furu'
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
			nb: 'Centro'
		},
		biotope: {
			fr: 'Mosaïque pin et chêne-liège',
			en: 'Pine and cork oak mosaic',
			de: 'Kiefern- und Korkeichenmosaik',
			it: 'Mosaico di pini e sughera',
			es: 'Mosaico de pino y alcornoque',
			nl: 'Mozaïek van dennen en kurkeik',
			sv: 'Mosaik av tall och korkek',
			nb: 'Mosaikk av furu og korkeik'
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
			nb: 'Lisboa / Oeste'
		},
		biotope: {
			fr: 'Garrigue littorale et olivier',
			en: 'Coastal scrub and olive',
			de: 'Küstengestrüpp und Olive',
			it: 'Macchia costiera e olivo',
			es: 'Matorral costero y olivo',
			nl: 'Kuststruweel en olijf',
			sv: 'Kustbuskage och oliv',
			nb: 'Kystkratt og oliven'
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
			nb: 'Alentejo'
		},
		biotope: {
			fr: 'Montado — chêne-liège et chêne vert',
			en: 'Montado — cork and holm oak',
			de: 'Montado — Kork- und Steineiche',
			it: 'Montado — sughera e leccio',
			es: 'Dehesa / montado — alcornoque y encina',
			nl: 'Montado — kurk- en steeneik',
			sv: 'Montado — kork- och stenek',
			nb: 'Montado — kork- og steineik'
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
			nb: 'Algarve'
		},
		biotope: {
			fr: 'Garrigue méditerranéenne et caroubier',
			en: 'Mediterranean scrub and carob',
			de: 'Mediterranes Gestrüpp und Johannisbrot',
			it: 'Macchia mediterranea e carrubo',
			es: 'Matorral mediterráneo y algarrobo',
			nl: 'Mediterraan struweel en Johannesbroodboom',
			sv: 'Medelhavsbuskage och johannesbröd',
			nb: 'Middelhavskratt og johannesbrød'
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
			nb: 'Madeira'
		},
		biotope: {
			fr: 'Laurisylve et garrigue côtière',
			en: 'Laurisilva and coastal scrub',
			de: 'Lorbeerwald und Küstengestrüpp',
			it: 'Laurisilva e macchia costiera',
			es: 'Laurisilva y matorral costero',
			nl: 'Laurisilva en kuststruweel',
			sv: 'Laurisilva och kustbuskage',
			nb: 'Laurisilva og kystkratt'
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
			nb: 'Azorene'
		},
		biotope: {
			fr: 'Îles atlantiques — brousse humide',
			en: 'Atlantic islands — humid scrub',
			de: 'Atlantische Inseln — feuchtes Gestrüpp',
			it: 'Isole atlantiche — macchia umida',
			es: 'Islas atlánticas — matorral húmedo',
			nl: 'Atlantische eilanden — vochtig struweel',
			sv: 'Atlantöar — fuktig buskvegetation',
			nb: 'Atlanterhavsøyer — fuktig kratt'
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
