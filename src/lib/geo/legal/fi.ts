import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildLajiFiSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Finnish access / nature / forest law for yamadori:
 * - Jokaisenoikeudet: public access ≠ right to uproot or fell living trees.
 * - Metsähallitus luvat: permits on state land beyond everyman’s rights.
 * - Luonnonsuojelulaki (9/2023) + asetus (1066/2023): protected areas & rauhoitetut kasvit.
 */
export const fiLegalPack: LegalContentPack = {
	country: 'FI',
	sourceName: 'Metsähallitus / YM / Finlex',
	speciesSourceName: 'Laji.fi / FinBIF',
	articles: [
		{
			id: 'fi_jokamiehenoikeudet',
			group: 'property',
			url: 'https://ym.fi/jokaisenoikeudet',
			title: 'Jokaisenoikeudet — what applies?',
			summary:
				'Jokaisenoikeudet (everyman’s rights) allow roaming and picking berries, mushrooms and unprotected plants, but not damaging property, felling or digging up living trees. Yamadori / bonsai collection always needs the landowner’s explicit permission.'
		},
		{
			id: 'fi_metsahallitus',
			group: 'forest',
			url: 'https://www.metsa.fi/luvat/',
			title: 'Metsähallitus — luvat on state land',
			summary:
				'On Metsähallitus-managed state land, activities beyond jokaisenoikeudet — including sampling or transplanting vegetation — normally need a Metsähallitus permit. Private forest follows agreement with the owner.'
		},
		{
			id: 'fi_luonnonsuojelu',
			group: 'environment',
			url: 'https://www.finlex.fi/fi/laki/ajantasa/2023/20230009',
			title: 'Luonnonsuojelulaki (9/2023)',
			summary:
				'National parks, wilderness areas, Natura 2000 and protected species further restrict collection and habitat change. Always check site and species status before any intervention.'
		},
		{
			id: 'fi_rauhoitus_asetus',
			group: 'environment',
			url: 'https://www.finlex.fi/fi/laki/ajantasa/2023/20231066',
			title: 'Luonnonsuojeluasetus (1066/2023) — rauhoitetut kasvit',
			summary:
				'Lists nationally protected (rauhoitetut) plants. Picking, uprooting or destroying listed species is prohibited without an exception permit — check Laji.fi / Finlex before any collection.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.lajiFi,
	buildSpeciesSearchUrl: buildLajiFiSpeciesSearchUrl
};
