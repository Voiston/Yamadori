/**
 * Generic permit / agency deep-links for New Zealand land tenure.
 * Not a full district directory — actionable starting points only.
 */

export type NzPermitLink = {
	id: string;
	label: string;
	url: string;
};

const DOC_COLLECTION =
	'https://www.doc.govt.nz/get-involved/apply-for-permits/research-and-collection/';
const DOC_MAPS = 'https://www.doc.govt.nz/map/index.html';
const DOC_SECTION4 =
	'https://www.doc.govt.nz/about-us/statutory-and-advisory-bodies/nz-conservation-authority/policies/section-4-of-the-conservation-act/';
const LGNZ_COUNCILS =
	'https://www.lgnz.co.nz/local-government-in-nz/council-websites-and-maps/';

export function getNzPermitLinks(input: { zoneType: string }): NzPermitLink[] {
	const links: NzPermitLink[] = [];

	switch (input.zoneType) {
		case 'national_park':
		case 'wilderness':
		case 'national_wildlife_area':
		case 'other_federal':
		case 'local_park':
			links.push({
				id: 'doc_collection',
				label: 'DOC — research & collection permits (Form 10)',
				url: DOC_COLLECTION
			});
			links.push({
				id: 'doc_maps',
				label: 'DOC maps — public conservation land',
				url: DOC_MAPS
			});
			break;
		case 'tribal':
		case 'ipca':
			links.push({
				id: 'whenua_rahui',
				label: 'Whenua Rahui / Treaty partners — seek governing consent',
				url: DOC_SECTION4
			});
			links.push({
				id: 'doc_collection',
				label: 'DOC — research & collection permits',
				url: DOC_COLLECTION
			});
			break;
		case 'crown_unverified':
		case 'private':
		default:
			links.push({
				id: 'lgnz_councils',
				label: 'LGNZ — district & regional council websites',
				url: LGNZ_COUNCILS
			});
			links.push({
				id: 'doc_maps',
				label: 'DOC maps — check if public conservation land',
				url: DOC_MAPS
			});
			break;
	}

	return links;
}
