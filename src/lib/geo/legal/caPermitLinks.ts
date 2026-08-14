/**
 * Generic permit / agency deep-links for Canadian land tenure.
 * Not a full district directory — actionable starting points only.
 */

export type CaPermitLink = {
	id: string;
	label: string;
	url: string;
};

const PROVINCE_CROWN_LINKS: Record<string, { label: string; url: string }> = {
	BC: {
		label: 'BC — Crown land / natural resource permits',
		url: 'https://www2.gov.bc.ca/gov/content/industry/crown-land-water/crown-land'
	},
	AB: {
		label: 'Alberta — public land use',
		url: 'https://www.alberta.ca/public-land-recreation'
	},
	SK: {
		label: 'Saskatchewan — Crown resource land leases',
		url: 'https://www.saskatchewan.ca/government/doing-business-with-government/leasing-crown-resource-lands'
	},
	MB: {
		label: 'Manitoba — agricultural Crown land',
		url: 'https://www.gov.mb.ca/agriculture/land-management/crown-land/'
	},
	ON: {
		label: 'Ontario — Crown land',
		url: 'https://www.ontario.ca/page/crown-land'
	},
	QC: {
		label: 'Québec — gestion du territoire public',
		url: 'https://www.quebec.ca/agriculture-environnement-et-ressources-naturelles/occupation-du-territoire-public/gestion-territoire-public'
	},
	NB: {
		label: 'New Brunswick — Crown lands',
		url: 'https://www2.gnb.ca/content/gnb/en/departments/erd/natural_resources/content/CrownLands.html'
	},
	NS: {
		label: 'Nova Scotia — Crown land',
		url: 'https://novascotia.ca/natr/land/'
	},
	PE: {
		label: 'PEI — Crown / public land',
		url: 'https://www.princeedwardisland.ca/en/information/agriculture-and-land/crown-land'
	},
	NL: {
		label: 'Newfoundland and Labrador — Forestry, Agriculture and Lands',
		url: 'https://www.gov.nl.ca/fal/'
	},
	YT: {
		label: 'Yukon — Crown / public land applications',
		url: 'https://yukon.ca/en/housing-and-property/land-applications'
	},
	NT: {
		label: 'Northwest Territories — land management',
		url: 'https://www.iti.gov.nt.ca/en/services/public-land'
	},
	NU: {
		label: 'Nunavut — lands',
		url: 'https://www.gov.nu.ca/environment/information/lands'
	}
};

/** Provincial / territorial parks agency hubs (13 jurisdictions). */
const PROVINCE_PARK_LINKS: Record<string, { label: string; url: string }> = {
	BC: {
		label: 'BC Parks',
		url: 'https://bcparks.ca/'
	},
	AB: {
		label: 'Alberta Parks',
		url: 'https://www.albertaparks.ca/'
	},
	SK: {
		label: 'Saskatchewan Parks',
		url: 'https://saskparks.com/'
	},
	MB: {
		label: 'Manitoba Parks',
		url: 'https://www.manitoba.ca/sd/parks/index.html'
	},
	ON: {
		label: 'Ontario Parks',
		url: 'https://www.ontarioparks.ca/'
	},
	QC: {
		label: 'Sépaq — parcs nationaux du Québec',
		url: 'https://www.sepaq.com/'
	},
	NB: {
		label: 'New Brunswick Parks',
		url: 'https://www.parcsnbparks.ca/'
	},
	NS: {
		label: 'Nova Scotia Parks',
		url: 'https://parks.novascotia.ca/'
	},
	PE: {
		label: 'PEI Parks',
		url: 'https://www.tourismpei.com/pei-provincial-parks'
	},
	NL: {
		label: 'Newfoundland and Labrador Parks',
		url: 'https://www.parksnl.ca/'
	},
	YT: {
		label: 'Yukon Parks',
		url: 'https://yukon.ca/en/outdoor-recreation-and-wildlife/parks-and-places'
	},
	NT: {
		label: 'Northwest Territories Parks',
		url: 'https://www.nwtparks.ca/'
	},
	NU: {
		label: 'Nunavut Parks',
		url: 'https://www.nunavutparks.com/'
	}
};

const NRCAN_FORESTS =
	'https://natural-resources.canada.ca/forests-forestry/sustainable-forest-management/canada-s-forest-laws';

/** Normalize CPCAD / caller province codes to 2-letter form when known. */
export function resolveCaProvince(provinceCode?: string | null): string | null {
	const raw = (provinceCode || '').trim().toUpperCase();
	if (!raw) return null;
	if (raw.length === 2 && (PROVINCE_CROWN_LINKS[raw] || PROVINCE_PARK_LINKS[raw])) return raw;
	if (raw.length === 2) return raw;
	return null;
}

export function getCaPermitLinks(input: {
	zoneType: string;
	provinceCode?: string;
}): CaPermitLink[] {
	const province = resolveCaProvince(input.provinceCode) || '';
	const links: CaPermitLink[] = [];

	switch (input.zoneType) {
		case 'national_park':
			links.push({
				id: 'parks_canada',
				label: 'Parks Canada — regulations',
				url: 'https://www.pc.gc.ca/en/agence-agency/loi-law'
			});
			break;
		case 'provincial_park':
		case 'state_park': {
			const park = province ? PROVINCE_PARK_LINKS[province] : undefined;
			if (park) {
				links.push({
					id: `provincial_parks_${province}`,
					label: park.label,
					url: park.url
				});
			} else {
				links.push({
					id: 'provincial_parks_generic',
					label: 'Provincial / territorial parks (verify locally)',
					url: 'https://www.canada.ca/en/environment-climate-change/services/national-wildlife-areas/protected-conserved-areas-database.html'
				});
			}
			break;
		}
		case 'national_wildlife_area':
		case 'other_federal':
			links.push({
				id: 'eccc_nwa',
				label: 'ECCC — National Wildlife Areas',
				url: 'https://www.canada.ca/en/environment-climate-change/services/national-wildlife-areas.html'
			});
			break;
		case 'ipca':
		case 'tribal':
			links.push({
				id: 'ipca',
				label: 'Indigenous Protected and Conserved Areas',
				url: 'https://www.canada.ca/en/environment-climate-change/services/nature-legacy/indigenous-leadership-funding.html'
			});
			break;
		case 'private':
			links.push({
				id: 'fcm_municipalities',
				label: 'FCM — find your municipality',
				url: 'https://fcm.ca/en/about-fcm/membership/our-members'
			});
			links.push({
				id: 'cpcad',
				label: 'CPCAD — protected areas map',
				url: 'https://www.canada.ca/en/environment-climate-change/services/national-wildlife-areas/protected-conserved-areas-database.html'
			});
			break;
		case 'crown_unverified':
		default: {
			const crown = province ? PROVINCE_CROWN_LINKS[province] : undefined;
			if (crown) {
				links.push({ id: `crown_${province}`, label: crown.label, url: crown.url });
			} else {
				links.push({
					id: 'crown_generic',
					label: 'Verify Crown / private tenure with the province',
					url: NRCAN_FORESTS
				});
			}
			links.push({
				id: 'fcm_municipalities',
				label: 'FCM — find your municipality (if private)',
				url: 'https://fcm.ca/en/about-fcm/membership/our-members'
			});
			links.push({
				id: 'cpcad',
				label: 'CPCAD — protected areas map',
				url: 'https://www.canada.ca/en/environment-climate-change/services/national-wildlife-areas/protected-conserved-areas-database.html'
			});
			break;
		}
	}

	return links;
}
