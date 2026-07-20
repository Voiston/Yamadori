import type { LegalContentPack } from '$lib/geo/legal/types';

const ANTHOS_SEARCH_BASE = 'https://www.anthos.es/';

function buildAnthosSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return ANTHOS_SEARCH_BASE;
	// Anthos has no stable public query URL; GBIF ES-scoped search as practical lookup.
	return `https://www.gbif.org/species/search?${new URLSearchParams({ q: query, country: 'ES' })}`;
}

/**
 * BOE (Boletín Oficial del Estado) — textos consolidados oficiales.
 * - Código Civil: arts. 353/358 (accesión — lo plantado pertenece al dueño del terreno).
 * - Ley 43/2003, de Montes.
 * - Ley 42/2007, del Patrimonio Natural y de la Biodiversidad (incl. Red Natura 2000).
 */
export const esLegalPack: LegalContentPack = {
	country: 'ES',
	sourceName: 'BOE',
	speciesSourceName: 'Anthos / GBIF ES',
	articles: [
		{
			id: 'es_cc_353_358',
			group: 'property',
			url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763',
			title: 'Código Civil — arts. 353 y 358',
			summary:
				'Por accesión, lo plantado o edificado en un terreno pertenece a su propietario, salvo pacto o autorización en contrario.'
		},
		{
			id: 'es_ley_montes_43_2003',
			group: 'forest',
			url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-21339',
			title: 'Ley 43/2003, de Montes',
			summary:
				'Régimen básico de conservación y aprovechamiento de los montes españoles, públicos y privados.'
		},
		{
			id: 'es_ley_patrimonio_natural_42_2007',
			group: 'environment',
			url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-21490',
			title: 'Ley 42/2007, del Patrimonio Natural y de la Biodiversidad',
			summary:
				'Régimen jurídico de la conservación de especies y espacios protegidos, incluida la Red Natura 2000 en España.'
		}
	],
	speciesSearchBase: ANTHOS_SEARCH_BASE,
	buildSpeciesSearchUrl: buildAnthosSpeciesSearchUrl
};
