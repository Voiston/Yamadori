/**
 * Generic permit / agency deep-links for Australian land tenure.
 * Not a full state directory — actionable starting points only.
 */

export type AuPermitLink = {
	id: string;
	label: string;
	url: string;
};

const PARKS_AUSTRALIA = 'https://parksaustralia.gov.au/';
const DCCEEW_EPBC = 'https://www.dcceew.gov.au/environment/epbc';
const CAPAD_INFO = 'https://www.dcceew.gov.au/environment/land/nrs/science/capad';
/** ALGA federation — state/territory local-government associations (council starting point). */
const ALGA_MEMBERS = 'https://alga.com.au/about/our-members/';

/** State / territory parks agency hubs (8 jurisdictions). */
const STATE_PARK_LINKS: Record<string, { label: string; url: string }> = {
	NSW: {
		label: 'NSW National Parks',
		url: 'https://www.nationalparks.nsw.gov.au/'
	},
	VIC: {
		label: 'Parks Victoria',
		url: 'https://www.parks.vic.gov.au/'
	},
	QLD: {
		label: 'Queensland Parks and forests',
		url: 'https://parks.qld.gov.au/'
	},
	SA: {
		label: 'Parks SA',
		url: 'https://www.parks.sa.gov.au/'
	},
	WA: {
		label: 'Explore Parks WA (DBCA)',
		url: 'https://exploreparks.dbca.wa.gov.au/'
	},
	TAS: {
		label: 'Parks Tasmania',
		url: 'https://parks.tas.gov.au/'
	},
	NT: {
		label: 'NT Parks and reserves',
		url: 'https://nt.gov.au/leisure/parks-reserves'
	},
	ACT: {
		label: 'Parks ACT',
		url: 'https://www.parks.act.gov.au/'
	}
};

const STATE_ALIASES: Record<string, string> = {
	'NEW SOUTH WALES': 'NSW',
	VICTORIA: 'VIC',
	QUEENSLAND: 'QLD',
	'SOUTH AUSTRALIA': 'SA',
	'WESTERN AUSTRALIA': 'WA',
	TASMANIA: 'TAS',
	'NORTHERN TERRITORY': 'NT',
	'AUSTRALIAN CAPITAL TERRITORY': 'ACT'
};

/** Normalize CAPAD / caller state codes to AUPS 2–3 letter form when known. */
export function resolveAuState(stateCode?: string | null): string | null {
	const raw = (stateCode || '').trim().toUpperCase();
	if (!raw) return null;
	if (STATE_PARK_LINKS[raw]) return raw;
	const aliased = STATE_ALIASES[raw];
	if (aliased) return aliased;
	if (raw.length >= 2 && raw.length <= 3) return raw;
	return null;
}

export function getAuPermitLinks(input: {
	zoneType: string;
	stateCode?: string;
}): AuPermitLink[] {
	const state = resolveAuState(input.stateCode);
	const stateHub = state ? STATE_PARK_LINKS[state] : undefined;
	const links: AuPermitLink[] = [];

	switch (input.zoneType) {
		case 'national_park':
		case 'wilderness':
		case 'national_wildlife_area':
		case 'other_federal':
			links.push({
				id: 'parks_australia',
				label: 'Parks Australia — Commonwealth parks',
				url: PARKS_AUSTRALIA
			});
			if (stateHub) {
				links.push({
					id: `state_parks_${state}`,
					label: stateHub.label,
					url: stateHub.url
				});
			}
			links.push({
				id: 'epbc',
				label: 'EPBC Act — DCCEEW',
				url: DCCEEW_EPBC
			});
			break;
		case 'state_park':
		case 'state_forest':
		case 'local_park':
			if (stateHub) {
				links.push({
					id: `state_parks_${state}`,
					label: stateHub.label,
					url: stateHub.url
				});
			} else {
				links.push({
					id: 'capad_info',
					label: 'CAPAD — verify state / territory agency',
					url: CAPAD_INFO
				});
			}
			links.push({
				id: 'epbc',
				label: 'EPBC Act — DCCEEW',
				url: DCCEEW_EPBC
			});
			break;
		case 'tribal':
		case 'ipca':
			links.push({
				id: 'capad_ipa',
				label: 'Indigenous Protected Areas — CAPAD / Traditional Owners',
				url: CAPAD_INFO
			});
			links.push({
				id: 'epbc',
				label: 'EPBC Act — DCCEEW',
				url: DCCEEW_EPBC
			});
			break;
		case 'private':
			links.push({
				id: 'alga_councils',
				label: 'ALGA — find your local council association',
				url: ALGA_MEMBERS
			});
			links.push({
				id: 'capad_info',
				label: 'CAPAD — check protected area status',
				url: CAPAD_INFO
			});
			links.push({
				id: 'epbc',
				label: 'EPBC Act — DCCEEW',
				url: DCCEEW_EPBC
			});
			break;
		case 'crown_unverified':
		default:
			links.push({
				id: 'capad_info',
				label: 'CAPAD — check protected area status',
				url: CAPAD_INFO
			});
			links.push({
				id: 'alga_councils',
				label: 'ALGA — find your local council (if private)',
				url: ALGA_MEMBERS
			});
			links.push({
				id: 'epbc',
				label: 'EPBC Act — DCCEEW',
				url: DCCEEW_EPBC
			});
			break;
	}

	return links;
}
