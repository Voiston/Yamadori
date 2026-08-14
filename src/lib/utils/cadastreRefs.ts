import type { CadastreInfo, CollectStatus } from '$lib/types/cadastre';
import type { CountryCode } from '$lib/geo/countries';
import { collectStatusForZone } from '$lib/geo/legal/usCollectStatus';
import * as m from '$lib/paraglide/messages.js';
import { getLocale, type Locale } from '$lib/paraglide/runtime.js';
import { localeForCountry, type AppLocale } from '$lib/utils/i18n/locale';

type MsgLocale = { locale?: Locale };

/** Prefer explicit tenure status; fall back to zone-type mapping (FR/EU parcels). */
export function effectiveCollectStatus(info: CadastreInfo): CollectStatus {
	return info.collectStatus ?? collectStatusForZone(info.zoneType);
}

export function formatCadastreParcelRef(info: CadastreInfo, locale?: AppLocale): string {
	const opts: MsgLocale = locale ? { locale } : {};
	const section = info.section?.trim();
	const number = info.parcelNumber?.trim();
	if (section && number) {
		return m.cadastre_parcel_short({ section, number }, opts);
	}
	if (info.codeInsee?.trim()) return info.codeInsee.trim();
	if (info.unitName?.trim()) return info.unitName.trim();
	return m.cadastre_unavailable({}, opts);
}

const MUNICIPAL_HINT_COUNTRIES: ReadonlySet<CountryCode> = new Set([
	'FR',
	'BE',
	'ES',
	'IT',
	'DE',
	'AT',
	'CH',
	'NL',
	'SE',
	'NO',
	'DK',
	'FI',
	'PT',
	'IE',
	'JP'
]);

const AGENCY_HINT_COUNTRIES: ReadonlySet<CountryCode> = new Set(['US', 'CA', 'NZ', 'AU']);

/**
 * Closing share line: who to contact for authorization (never claims legality).
 * US/CA/NZ/AU → agency / land manager; most other supported countries → municipality;
 * unknown / null → owner / local authority.
 */
export function shareCadastreAuthHint(
	commune: string,
	country: CountryCode | null,
	locale?: AppLocale
): string {
	const opts: MsgLocale = locale ? { locale } : {};
	if (country && AGENCY_HINT_COUNTRIES.has(country)) {
		return m.share_cadastre_hint_agency({ commune }, opts);
	}
	if (country && MUNICIPAL_HINT_COUNTRIES.has(country)) {
		return m.share_cadastre_hint_mairie({ commune }, opts);
	}
	return m.share_cadastre_hint_owner({ commune }, opts);
}

/** Country-aware admin / registry code line for share text. */
export function shareCadastreAdminCodeLine(
	code: string,
	country: CountryCode | null,
	locale?: AppLocale
): string {
	const opts: MsgLocale = locale ? { locale } : {};
	const inputs = { code };
	switch (country) {
		case 'FR':
			return m.share_cadastre_code_insee(inputs, opts);
		case 'ES':
			return m.share_cadastre_code_cadastral(inputs, opts);
		case 'IT':
			return m.share_cadastre_code_municipality(inputs, opts);
		case 'CH':
			return m.share_cadastre_code_egrid(inputs, opts);
		case 'DE':
			return m.share_cadastre_code_parcel(inputs, opts);
		case 'NL':
			return m.share_cadastre_code_cadastral_municipality(inputs, opts);
		case 'GB':
			return m.share_cadastre_code_title(inputs, opts);
		case 'NO':
			return m.share_cadastre_code_municipality_number(inputs, opts);
		case 'AT':
		case 'SE':
		case 'DK':
		case 'FI':
		case 'IE':
		case 'JP':
			return m.share_cadastre_code_admin(inputs, opts);
		case 'US':
		case 'CA':
		case 'NZ':
		case 'AU':
			return m.share_cadastre_code_agency(inputs, opts);
		default:
			return m.share_cadastre_admin_code(inputs, opts);
	}
}

function shareParcelLine(info: CadastreInfo, locale: AppLocale): string {
	const opts: MsgLocale = { locale };
	const section = info.section?.trim();
	const number = info.parcelNumber?.trim();
	if (section && number) {
		return m.share_cadastre_parcel_ref({ section, number }, opts);
	}
	if (info.codeInsee?.trim()) {
		return m.share_cadastre_parcel({ parcel: info.codeInsee.trim() }, opts);
	}
	if (info.unitName?.trim()) {
		return m.share_cadastre_parcel({ parcel: info.unitName.trim() }, opts);
	}
	return m.share_cadastre_parcel({ parcel: m.cadastre_unavailable({}, opts) }, opts);
}

/** Plain-text block for one locale — no owner identity. */
export function buildCadastreRefsTextForLocale(
	info: CadastreInfo,
	latitude: number,
	longitude: number,
	country: CountryCode | null,
	locale: AppLocale
): string {
	const opts: MsgLocale = { locale };
	const lines: string[] = [
		m.share_cadastre_title({}, opts),
		shareParcelLine(info, locale),
		m.share_cadastre_commune({ commune: info.commune }, opts),
		m.share_cadastre_gps(
			{
				lat: latitude.toFixed(5),
				lng: longitude.toFixed(5)
			},
			opts
		)
	];

	const adminCode = info.codeInsee?.trim();
	if (adminCode && adminCode !== info.parcelNumber?.trim()) {
		lines.push(shareCadastreAdminCodeLine(adminCode, country, locale));
	}
	if (info.managerName?.trim()) {
		lines.push(m.share_cadastre_manager({ manager: info.managerName.trim() }, opts));
	}
	if (info.unitName?.trim() && info.unitName.trim() !== info.commune) {
		lines.push(m.share_cadastre_unit({ unit: info.unitName.trim() }, opts));
	}

	lines.push(m.share_cadastre_owner_omitted({}, opts));
	lines.push(shareCadastreAuthHint(info.commune, country, locale));
	return lines.join('\n');
}

/**
 * Plain-text block for clipboard / share — UI locale, plus country locale when different.
 * Concepts (code label, auth hint) follow GPS country; wording follows each block locale.
 */
export function buildCadastreRefsText(
	info: CadastreInfo,
	latitude: number,
	longitude: number,
	country: CountryCode | null = null
): string {
	const uiLocale = getLocale() as AppLocale;
	const uiBlock = buildCadastreRefsTextForLocale(info, latitude, longitude, country, uiLocale);
	const countryLocale = localeForCountry(country);
	if (!countryLocale || countryLocale === uiLocale) {
		return uiBlock;
	}
	const countryBlock = buildCadastreRefsTextForLocale(
		info,
		latitude,
		longitude,
		country,
		countryLocale
	);
	return `${uiBlock}\n\n${countryBlock}`;
}
