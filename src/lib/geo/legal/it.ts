import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildActaPlantarumSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Normattiva.it — testi normativi ufficiali.
 * - Codice Civile: artt. 820-821 (frutti naturali, acquisiti con la separazione).
 * - D.Lgs. 34/2018, Testo unico in materia di foreste e filiere forestali (TUFF).
 * - D.P.R. 357/1997, attuazione direttiva Habitat 92/43/CEE (base giuridica di Natura 2000).
 */
export const itLegalPack: LegalContentPack = {
	country: 'IT',
	sourceName: 'Normattiva',
	speciesSourceName: 'Acta Plantarum / FlorItaly',
	articles: [
		{
			id: 'it_cc_820_821',
			group: 'property',
			url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1942-03-16;262',
			title: 'Codice Civile — artt. 820-821',
			summary:
				'I frutti naturali (compresa la legna) si acquisiscono con la separazione dalla cosa madre e appartengono al proprietario del fondo.'
		},
		{
			id: 'it_tuff_dlgs_34_2018',
			group: 'forest',
			url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2018-04-03;34',
			title: 'D.Lgs. 34/2018 — Testo unico foreste e filiere forestali',
			summary: 'Quadro nazionale di tutela, gestione e valorizzazione del patrimonio forestale italiano.'
		},
		{
			id: 'it_dpr_357_1997',
			group: 'environment',
			url: 'https://www.normattiva.it/atto/caricaDettaglioAtto?atto.codiceRedazionale=097G0390&atto.dataPubblicazioneGazzetta=1997-10-23&qId=&tipoDettaglio=multivigenza',
			title: 'D.P.R. 357/1997 — attuazione direttiva Habitat',
			summary: 'Base giuridica della rete Natura 2000 in Italia (SIC/ZSC e ZPS).'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.floritaly,
	buildSpeciesSearchUrl: buildActaPlantarumSpeciesSearchUrl
};
