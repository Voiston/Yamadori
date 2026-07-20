/**
 * Generic permit / agency deep-links for US land tenure.
 * Not a full district directory — actionable starting points only.
 */

export type UsPermitLink = {
	id: string;
	label: string;
	url: string;
};

export function getUsPermitLinks(input: {
	zoneType: string;
	stateCode?: string;
}): UsPermitLink[] {
	const state = (input.stateCode || '').toUpperCase();
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
				id: 'blm_offices',
				label: state
					? `BLM state office directory (${state})`
					: 'BLM — find a field office',
				url: state
					? `https://www.blm.gov/office/search?state=${encodeURIComponent(state)}`
					: 'https://www.blm.gov/office'
			});
			break;
		case 'national_park':
		case 'wilderness':
			links.push({
				id: 'nps_regs',
				label: 'National Park Service — regulations',
				url: 'https://www.nps.gov/aboutus/lawsandpolicies.htm'
			});
			break;
		case 'state_park':
		case 'state_land':
			links.push({
				id: 'state_parks',
				label: 'State parks & public lands (search)',
				url: state
					? `https://www.google.com/search?q=${encodeURIComponent(`${state} state parks collecting permit`)}`
					: 'https://www.americasstateparks.org/'
			});
			break;
		case 'private':
			links.push({
				id: 'owner',
				label: 'Obtain written permission from the landowner',
				url: 'https://www.law.cornell.edu/wex/trespass'
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
