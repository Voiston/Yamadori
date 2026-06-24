import { buildLegifranceSearchUrl } from './legifrance';

export type CadastreLegalReferenceId = 'civil_546' | 'forest_l163_11';

export type CadastreLegalReference = {
	id: CadastreLegalReferenceId;
	url: string;
};

export const CADASTRE_LEGAL_REFERENCES: CadastreLegalReference[] = [
	{
		id: 'civil_546',
		url: buildLegifranceSearchUrl('article 546 du code civil')
	},
	{
		id: 'forest_l163_11',
		url: buildLegifranceSearchUrl('article L163-11 du code forestier')
	}
];
