/**
 * Generic permit / agency deep-links for US land tenure.
 * Not a full district directory — actionable starting points only.
 */

export type UsPermitLink = {
	id: string;
	label: string;
	url: string;
};

/** Yamadori-priority state parks / forestry / public-lands hubs (15 states). */
const STATE_PUBLIC_LAND_LINKS: Record<string, { label: string; url: string }> = {
	CA: {
		label: 'California State Parks',
		url: 'https://www.parks.ca.gov/'
	},
	OR: {
		label: 'Oregon Department of Forestry',
		url: 'https://www.oregon.gov/odf/'
	},
	WA: {
		label: 'Washington DNR',
		url: 'https://www.dnr.wa.gov/'
	},
	CO: {
		label: 'Colorado Parks & Wildlife',
		url: 'https://cpw.state.co.us/'
	},
	UT: {
		label: 'Utah State Parks',
		url: 'https://stateparks.utah.gov/'
	},
	AZ: {
		label: 'Arizona State Parks',
		url: 'https://azstateparks.com/'
	},
	NM: {
		label: 'New Mexico EMNRD',
		url: 'https://www.emnrd.nm.gov/'
	},
	MT: {
		label: 'Montana Fish, Wildlife & Parks',
		url: 'https://fwp.mt.gov/'
	},
	ID: {
		label: 'Idaho Parks & Recreation',
		url: 'https://parksandrecreation.idaho.gov/'
	},
	NV: {
		label: 'Nevada State Parks',
		url: 'https://parks.nv.gov/'
	},
	AK: {
		label: 'Alaska DNR',
		url: 'https://dnr.alaska.gov/'
	},
	NY: {
		label: 'New York State Parks',
		url: 'https://parks.ny.gov/'
	},
	NC: {
		label: 'North Carolina State Parks',
		url: 'https://www.ncparks.gov/'
	},
	TN: {
		label: 'Tennessee State Parks',
		url: 'https://tnstateparks.com/'
	},
	VA: {
		label: 'Virginia DCR',
		url: 'https://www.dcr.virginia.gov/'
	}
};

/** Normalize PAD-US / caller state codes to USPS 2-letter form. */
export function resolveUsState(stateCode?: string | null): string | null {
	const raw = (stateCode || '').trim().toUpperCase();
	if (!raw) return null;
	if (raw.length === 2 && STATE_PUBLIC_LAND_LINKS[raw]) return raw;
	if (raw.length === 2) return raw;
	return null;
}

export function getUsPermitLinks(input: {
	zoneType: string;
	stateCode?: string;
}): UsPermitLink[] {
	const state = resolveUsState(input.stateCode);
	const links: UsPermitLink[] = [];

	switch (input.zoneType) {
		case 'national_forest':
			links.push({
				id: 'usfs_sfp',
				label: 'USFS — Special Forest Products / permits',
				url: 'https://www.fs.usda.gov/managing-land/forest-management/products'
			});
			links.push({
				id: 'usfs_find',
				label: 'Find your National Forest / Ranger District',
				url: 'https://www.fs.usda.gov/visit/forests-grasslands'
			});
			break;
		case 'blm':
			links.push({
				id: 'blm_permits',
				label: 'BLM — forest product permits',
				url: 'https://www.blm.gov/programs/natural-resources/forests-and-woodlands/forest-product-permits'
			});
			links.push({
				id: 'blm_online',
				label: 'BLM — Forest Products online',
				url: 'https://forestproducts.blm.gov/'
			});
			links.push({
				id: 'blm_offices',
				label: 'BLM — national office directory',
				url: 'https://www.blm.gov/office/national-office'
			});
			break;
		case 'national_park':
		case 'wilderness':
			links.push({
				id: 'nps_regs',
				label: '36 CFR 2.1 — plant removal prohibited',
				url: 'https://www.ecfr.gov/current/title-36/chapter-I/part-2/section-2.1'
			});
			break;
		case 'state_park':
		case 'state_land': {
			if (state) {
				const stateHub = STATE_PUBLIC_LAND_LINKS[state];
				if (stateHub) {
					links.push({
						id: `state_${state.toLowerCase()}`,
						label: stateHub.label,
						url: stateHub.url
					});
				}
			}
			links.push({
				id: 'state_parks',
				label: 'State parks & public lands (directory)',
				url: 'https://www.americasstateparks.org/'
			});
			break;
		}
		case 'private':
			links.push({
				id: 'owner',
				label: 'County assessor / property records — identify the owner',
				url: 'https://explorer.naco.org/'
			});
			break;
		default:
			links.push({
				id: 'padus',
				label: 'USGS PAD-US — verify land manager',
				url: 'https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-data-overview'
			});
	}

	return links;
}
