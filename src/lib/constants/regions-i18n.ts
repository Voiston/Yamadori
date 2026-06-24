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
			es: 'Brière y Bosque del Gâvre'
		},
		biotope: {
			fr: 'Pins sylvestres et futaies mixtes humides',
			en: 'Scots pines and wet mixed forests',
			de: 'Kiefern und feuchte Mischwälder',
			it: 'Pini silvestri e foreste miste umide',
			es: 'Pinos silvestres y bosques mixtos húmedos'
		}
	},
	'pdl-littoral-atlantique': {
		name: {
			fr: 'Littoral atlantique',
			en: 'Atlantic coast',
			de: 'Atlantikküste',
			it: 'Litorale atlantico',
			es: 'Litoral atlántico'
		},
		biotope: {
			fr: 'Dunes et friches littorales',
			en: 'Dunes and coastal wasteland',
			de: 'Dünen und Küstenbrachen',
			it: 'Dune e terreni incolti costieri',
			es: 'Dunas y terrenos baldíos costeros'
		}
	},
	'pdl-bocage': {
		name: {
			fr: 'Bocage angevin et mayennais',
			en: 'Anjou and Mayenne bocage',
			de: 'Bocage von Anjou und Mayenne',
			it: "Bocage dell'Anjou e della Mayenne",
			es: 'Bocage de Anjou y Mayenne'
		},
		biotope: {
			fr: 'Bocage humide et haies',
			en: 'Wet bocage and hedgerows',
			de: 'Feuchtes Bocage und Hecken',
			it: 'Bocage umido e siepi',
			es: 'Bocage húmedo y setos'
		}
	},
	'pdl-foret-plaine': {
		name: {
			fr: 'Forêt de plaine',
			en: 'Lowland forest',
			de: 'Flachlandwald',
			it: 'Foresta di pianura',
			es: 'Bosque de llanura'
		},
		biotope: {
			fr: 'Hêtraie-chênaie de plaine (Sarthe, Bercé)',
			en: 'Lowland beech-oak forest (Sarthe, Bercé)',
			de: 'Flachland-Buchen-Eichenwald (Sarthe, Bercé)',
			it: 'Faggeta-querceto di pianura (Sarthe, Bercé)',
			es: 'Hayedo-robledal de llanura (Sarthe, Bercé)'
		}
	},
	'pdl-marais-humide': {
		name: {
			fr: 'Marais et zones humides',
			en: 'Marshes and wetlands',
			de: 'Sümpfe und Feuchtgebiete',
			it: 'Paludi e zone umide',
			es: 'Marismas y zonas húmedas'
		},
		biotope: {
			fr: 'Marais briéron et vallées humides',
			en: 'Brière marsh and wet valleys',
			de: 'Brière-Sumpf und feuchte Täler',
			it: 'Palude della Brière e valli umide',
			es: 'Marisma de Brière y valles húmedas'
		}
	},
	'pdl-frange-forez': {
		name: {
			fr: 'Frange du Forez',
			en: 'Forez fringe',
			de: 'Forez-Rand',
			it: 'Frangia del Forez',
			es: 'Frontera del Forez'
		},
		biotope: {
			fr: 'Lisière montagneuse et landes',
			en: 'Mountain fringe and heathland',
			de: 'Gebirgsrand und Heidelandschaft',
			it: 'Margine montano e lande',
			es: 'Borde montañoso y landas'
		}
	},
	'pyr-piemont-atlantique': {
		name: {
			fr: 'Piémont atlantique',
			en: 'Atlantic foothills',
			de: 'Atlantisches Vorland',
			it: 'Piemonte atlantico',
			es: 'Pie de monte atlántico'
		},
		biotope: {
			fr: 'Collines du Pays Basque et Béarn',
			en: 'Basque Country and Béarn hills',
			de: 'Hügel des Baskenlands und Béarn',
			it: 'Colline del Paese Basco e del Béarn',
			es: 'Colinas del País Vasco y Bearne'
		}
	},
	'pyr-vallees-centrales': {
		name: {
			fr: 'Vallées centrales',
			en: 'Central valleys',
			de: 'Zentrale Täler',
			it: 'Valli centrali',
			es: 'Valles centrales'
		},
		biotope: {
			fr: 'Forêts de montagne moyenne',
			en: 'Mid-mountain forests',
			de: 'Mittelgebirgswälder',
			it: 'Foreste di montagna media',
			es: 'Bosques de montaña media'
		}
	},
	'pyr-haute-montagne': {
		name: {
			fr: 'Haute montagne',
			en: 'High mountains',
			de: 'Hochgebirge',
			it: 'Alta montagna',
			es: 'Alta montaña'
		},
		biotope: {
			fr: 'Étages subalpin et alpin',
			en: 'Subalpine and alpine belts',
			de: 'Subalpin- und Alpinstufe',
			it: 'Fasce subalpine e alpine',
			es: 'Estratos subalpino y alpino'
		}
	},
	'pyr-piemont-oriental': {
		name: {
			fr: 'Piémont oriental',
			en: 'Eastern foothills',
			de: 'Östliches Vorland',
			it: 'Piemonte orientale',
			es: 'Pie de monte oriental'
		},
		biotope: {
			fr: 'Garrigues et piémont méditerranéen',
			en: 'Mediterranean garrigue and foothills',
			de: 'Mediterrane Garigue und Vorland',
			it: 'Gariga mediterranea e piemonte',
			es: 'Garriga mediterránea y pie de monte'
		}
	},
	'pyr-couserans-ariege': {
		name: {
			fr: 'Couserans et Ariège',
			en: 'Couserans and Ariège',
			de: 'Couserans und Ariège',
			it: 'Couserans e Ariège',
			es: 'Couserans y Ariège'
		},
		biotope: {
			fr: 'Versants calcaires et forêts mixtes',
			en: 'Limestone slopes and mixed forests',
			de: 'Kalkhanglage und Mischwälder',
			it: 'Versanti calcarei e foreste miste',
			es: 'Laderas calcáreas y bosques mixtos'
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
