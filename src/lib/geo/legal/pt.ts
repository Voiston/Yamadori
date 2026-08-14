import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildFloraOnSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Portugal legal content pack — Código Civil, DL 169/2001 (sobreiro/azinheira),
 * DL 142/2008 (conservação da natureza). Links Diário da República / PGDLisboa.
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
			url: 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2001-167292655',
			title: 'DL n.º 169/2001 — proteção do sobreiro e da azinheira',
			summary:
				'O corte ou arranque de sobreiros e azinheiras (em povoamento ou isolados) carece de autorização, salvo desbastes previstos em plano de gestão florestal aprovado. Aplica-se em Portugal continental.'
		},
		{
			id: 'pt_conservacao_natureza',
			group: 'environment',
			url: 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2008-34502775',
			title: 'DL n.º 142/2008 — conservação da natureza e biodiversidade',
			summary:
				'Regime jurídico do SNAC / Rede Natura 2000 e restrições em áreas classificadas. A recolha de espécies e a alteração de habitats podem ser proibidas — verificar o estatuto do local e da espécie (Madeira/Açores têm diplomas regionais próprios).'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.floraOn,
	buildSpeciesSearchUrl: buildFloraOnSpeciesSearchUrl
};
