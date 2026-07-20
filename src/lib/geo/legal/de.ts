import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildFloraWebSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Gesetze-im-Internet.de (BMJ) — amtliche Fassungen.
 * - BGB § 911 (Überfall — Fallobst auf Nachbargrundstück gehört diesem Grundstück).
 * - BWaldG § 14 (Betreten des Waldes zu Erholungszwecken).
 * - BNatSchG § 39 (allgemeiner Artenschutz / „Handstraußregel“ für den Eigenbedarf).
 */
export const deLegalPack: LegalContentPack = {
	country: 'DE',
	sourceName: 'Gesetze-im-Internet',
	speciesSourceName: 'FloraWeb (BfN)',
	articles: [
		{
			id: 'de_bgb_911',
			group: 'property',
			url: 'https://www.gesetze-im-internet.de/bgb/__911.html',
			title: '§ 911 BGB — Überfall',
			summary: 'Früchte, die von einem Baum auf ein Nachbargrundstück fallen, gelten als Früchte dieses Grundstücks.'
		},
		{
			id: 'de_bwaldg_14',
			group: 'forest',
			url: 'https://www.gesetze-im-internet.de/bwaldg/__14.html',
			title: '§ 14 BWaldG — Betreten des Waldes',
			summary: 'Das Betreten des Waldes zu Erholungszwecken ist grundsätzlich gestattet, auf eigene Gefahr.'
		},
		{
			id: 'de_bnatschg_39',
			group: 'environment',
			url: 'https://www.gesetze-im-internet.de/bnatschg_2009/__39.html',
			title: '§ 39 BNatSchG — Handstraußregel',
			summary:
				'Geringe Mengen wild lebender Pflanzen und Früchte dürfen für den persönlichen Bedarf pfleglich entnommen werden — außer besonders/streng geschützte Arten und Schutzgebiete.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.floraWeb,
	buildSpeciesSearchUrl: buildFloraWebSpeciesSearchUrl
};
