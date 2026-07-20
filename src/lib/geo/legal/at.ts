import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildBiodiversityAtlasAtSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * RIS (Rechtsinformationssystem des Bundes) — official Austrian law.
 * - ABGB § 422: neighbour / fruit rules (Überhang / wild fruits context).
 * - ForstG § 33: public access to forests for recreation.
 * - Species / nature protection is largely Land-level; federal RIS points to
 *   general nature conservation framework — we link ABGB + ForstG + a RIS
 *   nature search for protected plants.
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
				'Das Betreten des Waldes zu Erholungszwecken ist grundsätzlich gestattet; Einschränkungen sind möglich (Schutz, Forstbetrieb, Verbot).'
		},
		{
			id: 'at_nature_species',
			group: 'environment',
			url: 'https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=Naturschutz&VonSucheNachRechtDokument=True',
			title: 'Naturschutz — geschützte Arten (Bund / Länder)',
			summary:
				'Der Artenschutz ist in Österreich stark landesrechtlich geregelt. Entnahme wild lebender Pflanzen kann in Schutzgebieten und für geschützte Arten verboten sein — Landes-Naturschutzgesetze prüfen.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.biodiversityAtlasAt,
	buildSpeciesSearchUrl: buildBiodiversityAtlasAtSpeciesSearchUrl
};
