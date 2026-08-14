import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildBiodiversityAtlasAtSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * RIS (Rechtsinformationssystem des Bundes) — official Austrian law.
 * - ABGB § 422: neighbour / fruit rules (Überhang / wild fruits context).
 * - ForstG § 33: public access to forests for recreation (≠ collection right).
 * - ForstG § 85: felling subject to authority approval (Kahlhieb / equivalent).
 * - Species / nature protection is Land-level; Wiener Naturschutzgesetz is an
 *   exemplar — each Bundesland has its own NSchG / Artenschutzverordnung.
 */
export const atLegalPack: LegalContentPack = {
	country: 'AT',
	sourceName: 'RIS',
	speciesSourceName: 'Biodiversitäts-Atlas Österreich',
	articles: [
		{
			id: 'at_abgb_422',
			group: 'property',
			url: 'https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001622&Artikel=&Paragraf=422',
			title: 'ABGB § 422 — Früchte und Nachbarrecht',
			summary:
				'Früchte, die auf ein Nachbargrundstück fallen, gehören dem Eigentümer dieses Grundstücks; das Betreten fremder Gründe bleibt an Eigentum und Bewilligung gebunden.'
		},
		{
			id: 'at_forstg_33',
			group: 'forest',
			url: 'https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10010371&Artikel=&Paragraf=33',
			title: 'ForstG § 33 — Betreten des Waldes',
			summary:
				'Das Betreten des Waldes zu Erholungszwecken ist grundsätzlich gestattet; Einschränkungen sind möglich (Schutz, Forstbetrieb, Verbot). Entnahme von Pflanzen bleibt an Eigentum und Naturschutz gebunden.'
		},
		{
			id: 'at_forstg_85',
			group: 'forest',
			url: 'https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10010371&Artikel=&Paragraf=85',
			title: 'ForstG § 85 — Bewilligungspflichtige Fällungen',
			summary:
				'Kahlhiebe und diesen gleichzuhaltende Einzelstammentnahmen bedürfen unter den gesetzlichen Voraussetzungen einer behördlichen Bewilligung. Yamadori / Ausgraben ist kein freies Betretungsrecht.'
		},
		{
			id: 'at_wiener_nschg',
			group: 'environment',
			url: 'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=LrW&Gesetzesnummer=20000454',
			title: 'Wiener Naturschutzgesetz (Exemplar Land)',
			summary:
				'Artenschutz ist in Österreich landesrechtlich geregelt. Das Wiener Naturschutzgesetz illustriert Verbote zu Pflücken/Ausgraben geschützter Arten; die anderen acht Länder haben eigene Naturschutzgesetze und Artenschutzverordnungen — immer das zuständige Land prüfen.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.biodiversityAtlasAt,
	buildSpeciesSearchUrl: buildBiodiversityAtlasAtSpeciesSearchUrl
};
