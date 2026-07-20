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
		label: 'Alberta — public lands',
		url: 'https://www.alberta.ca/public-lands'
	},
	SK: {
		label: 'Saskatchewan — Crown resource land',
		url: 'https://www.saskatchewan.ca/business/agriculture-natural-resources-and-industry/crown-lands-and-leases'
	},
	MB: {
		label: 'Manitoba — Crown lands',
		url: 'https://www.gov.mb.ca/agriculture/land-management/crown-lands.html'
	},
	ON: {
		label: 'Ontario — Crown land',
		url: 'https://www.ontario.ca/page/crown-land'
	},
	QC: {
		label: 'Québec — terres du domaine de l’État',
		url: 'https://www.quebec.ca/agriculture-environnement-et-ressources-naturelles/forets/gestion-forets-publiques'
	},
	NB: {
		label: 'New Brunswick — Crown lands',
		url: 'https://www2.gnb.ca/content/gnb/en/departments/erd/natural_resources.html'
	},
	NS: {
		label: 'Nova Scotia — Crown land',
		url: 'https://novascotia.ca/natr/land/'
	},
	PE: {
		label: 'PEI — public lands',
		url: 'https://www.princeedwardisland.ca/en/topic/land'
	},
	NL: {
		label: 'Newfoundland and Labrador — Crown lands',
		url: 'https://www.gov.nl.ca/ffa/leases-and-licenses/crown-lands/'
	},
	YT: {
		label: 'Yukon — Crown / public land',
		url: 'https://yukon.ca/en/housing-and-property/land-applications'
	},
	NT: {
		label: 'Northwest Territories — public land',
		url: 'https://www.iti.gov.nt.ca/en/services/public-land'
	},
	NU: {
		label: 'Nunavut — public land',
		url: 'https://gov.nu.ca/'
	}
};

export function getCaPermitLinks(input: {
	zoneType: string;
	provinceCode?: string;
}): CaPermitLink[] {
	const province = (input.provinceCode || '').toUpperCase();
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
		case 'state_park':
			links.push({
				id: 'provincial_parks',
				label: province
					? `${province} provincial parks`
					: 'Provincial parks (search)',
				url: province
					? `https://www.google.com/search?q=${encodeURIComponent(`${province} provincial parks collecting regulations`)}`
					: 'https://www.google.com/search?q=Canada+provincial+parks+regulations'
			});
			break;
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
		case 'crown_unverified':
		case 'private':
		default: {
			const crown = province ? PROVINCE_CROWN_LINKS[province] : undefined;
			if (crown) {
				links.push({ id: `crown_${province}`, label: crown.label, url: crown.url });
			} else {
				links.push({
					id: 'crown_generic',
					label: 'Verify Crown / private tenure with the province',
					url: 'https://www.nrcan.gc.ca/our-natural-resources/forests'
				});
			}
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
