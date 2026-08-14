/**
 * Geographic harvest-calendar prior for YRS phenology scoring.
 * Uses country harvest calendars (US/CA/AU/NZ) when species + macro-region match.
 */

import { BIOTOPE_REGIONS, type MacroRegion } from '$lib/constants/regions';
import { findAuHarvestWindows } from '$lib/geo/auHarvestCalendar';
import { findCaHarvestWindows } from '$lib/geo/caHarvestCalendar';
import { findEuHarvestWindows, resolveEuHarvestZone } from '$lib/geo/euHarvestCalendar';
import { findJpHarvestWindows, resolveJpHarvestZone } from '$lib/geo/jpHarvestCalendar';
import { findNzHarvestWindows } from '$lib/geo/nzHarvestCalendar';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { findUsHarvestWindows } from '$lib/geo/usHarvestCalendar';
import { isInBoundingBox } from '$lib/utils/species-suggestions';

export type HarvestCalendarPrior = {
	/** True when at least one calendar window applies for species + region. */
	applicable: boolean;
	/** True when the reference month falls in any matching window (or prior not applicable). */
	inWindow: boolean;
	/** Circular month distance to nearest window edge; 0 when in-window or not applicable. */
	monthsFromWindow: number;
};

/** Inclusive month window; supports wrap-around (e.g. Nov–Mar). */
export function isMonthInInclusiveWindow(
	month: number,
	startMonth: number,
	endMonth: number
): boolean {
	if (startMonth <= endMonth) {
		return month >= startMonth && month <= endMonth;
	}
	return month >= startMonth || month <= endMonth;
}

/** Circular distance (1–6) from month to nearest month inside the inclusive window. */
export function monthsOutsideInclusiveWindow(
	month: number,
	startMonth: number,
	endMonth: number
): number {
	if (isMonthInInclusiveWindow(month, startMonth, endMonth)) return 0;
	let minDist = 6;
	for (let m = 1; m <= 12; m++) {
		if (!isMonthInInclusiveWindow(m, startMonth, endMonth)) continue;
		const raw = Math.abs(month - m);
		const dist = Math.min(raw, 12 - raw);
		minDist = Math.min(minDist, dist);
	}
	return minDist;
}

export function resolveMacroRegionAt(
	latitude: number,
	longitude: number,
	prefix: string
): MacroRegion | null {
	const match = BIOTOPE_REGIONS.find(
		(region) =>
			region.macroRegion.startsWith(prefix) &&
			isInBoundingBox(latitude, longitude, region.bbox)
	);
	return (match?.macroRegion as MacroRegion | undefined) ?? null;
}

type WindowLike = { startMonth: number; endMonth: number };

function findWindowsForLocation(
	species: string,
	latitude: number,
	longitude: number
): WindowLike[] {
	const country = resolveCountry(latitude, longitude);
	if (!country || !species.trim()) return [];

	if (country === 'US') {
		const macro = resolveMacroRegionAt(latitude, longitude, 'us_');
		if (!macro) return [];
		return findUsHarvestWindows(species, macro);
	}
	if (country === 'CA') {
		const macro = resolveMacroRegionAt(latitude, longitude, 'ca_');
		if (!macro) return [];
		return findCaHarvestWindows(species, macro);
	}
	if (country === 'AU') {
		const macro = resolveMacroRegionAt(latitude, longitude, 'au_');
		if (!macro) return [];
		return findAuHarvestWindows(species, macro);
	}
	if (country === 'NZ') {
		const macro = resolveMacroRegionAt(latitude, longitude, 'nz_');
		if (!macro) return [];
		return findNzHarvestWindows(species, macro);
	}
	if (country === 'JP') {
		const zone = resolveJpHarvestZone(latitude, longitude);
		if (!zone) return [];
		return findJpHarvestWindows(species, zone);
	}

	const euCountries = new Set([
		'FR',
		'DE',
		'ES',
		'PT',
		'IT',
		'BE',
		'NL',
		'CH',
		'AT',
		'DK',
		'SE',
		'NO',
		'FI',
		'IE',
		'GB'
	]);
	if (euCountries.has(country)) {
		const zone = resolveEuHarvestZone(latitude, longitude);
		if (!zone) return [];
		return findEuHarvestWindows(species, zone);
	}
	return [];
}

/**
 * Resolve whether the current month is inside a known harvest window for this species/location.
 * When no calendar entry matches, returns applicable:false (no YRS malus).
 */
export function resolveHarvestCalendarPrior(
	species: string,
	latitude: number,
	longitude: number,
	referenceDate = new Date()
): HarvestCalendarPrior {
	const windows = findWindowsForLocation(species, latitude, longitude);
	if (windows.length === 0) {
		return { applicable: false, inWindow: true, monthsFromWindow: 0 };
	}

	const month = referenceDate.getMonth() + 1;
	let monthsFromWindow = 6;
	for (const window of windows) {
		monthsFromWindow = Math.min(
			monthsFromWindow,
			monthsOutsideInclusiveWindow(month, window.startMonth, window.endMonth)
		);
	}
	const inWindow = monthsFromWindow === 0;
	return { applicable: true, inWindow, monthsFromWindow };
}
