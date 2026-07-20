import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildFloraOnSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Portugal legal content pack — Código Civil, florestas, conservação da natureza.
 * Articles are indicative Diário da República / institutional links.
 */
export const ptLegalPack: LegalContentPack = {
	country: 'PT',
	sourceName: 'Diário da República / ICNF',
	speciesSourceName: 'Flora-On / ICNF',
	articles: [
		{
			id: 'pt_codigo_civil',
			group: 'property',
			url: 'https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=775&tabela=leis',
			title: 'Código Civil — propriedade e acessão',
			summary:
				'O que é plantado ou edificado em terreno alheio pertence, em regra, ao proprietário do solo, salvo autorização ou acordo em contrário. É necessária autorização do proprietário para colher ou transplantar.'
		},
		{
			id: 'pt_florestas',
			group: 'forest',
			url: 'https://www.icnf.pt/',
			title: 'Regime florestal / ICNF',
			summary:
				'A gestão e o aproveitamento florestal em Portugal estão enquadrados por legislação nacional e planos regionais. Em espaços florestais públicos ou sujeitos a regime especial, o aproveitamento exige autorização da entidade competente (ICNF / autarquia).'
		},
		{
			id: 'pt_conservacao_natureza',
			group: 'environment',
			url: 'https://www.icnf.pt/conservacao',
			title: 'Conservação da natureza e Rede Natura 2000',
			summary:
				'Áreas protegidas e sítios da Rede Natura 2000 (Lei da Conservação da Natureza e da Biodiversidade) restringem a recolha de espécies e a alteração de habitats. Verificar sempre o estatuto do local e da espécie.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.floraOn,
	buildSpeciesSearchUrl: buildFloraOnSpeciesSearchUrl
};
