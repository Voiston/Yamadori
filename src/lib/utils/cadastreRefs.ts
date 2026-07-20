import type { CadastreInfo, CollectStatus } from '$lib/types/cadastre';
import type { CountryCode } from '$lib/geo/countries';
import { collectStatusForZone } from '$lib/geo/legal/usCollectStatus';
import * as m from '$lib/paraglide/messages.js';

/** Prefer explicit tenure status; fall back to zone-type mapping (FR/EU parcels). */
export function effectiveCollectStatus(info: CadastreInfo): CollectStatus {
	return info.collectStatus ?? collectStatusForZone(info.zoneType);
}

export function formatCadastreParcelRef(info: CadastreInfo): string {
	const section = info.section?.trim();
	const number = info.parcelNumber?.trim();
	if (section && number) {
		return m.cadastre_parcel_short({ section, number });
	}
	if (info.codeInsee?.trim()) return info.codeInsee.trim();
	if (info.unitName?.trim()) return info.unitName.trim();
	return m.cadastre_unavailable();
}

/**
 * Closing share line: who to contact for authorization (never claims legality).
 * US/CA/NZ → agency / land manager; FR/BE → town hall; else owner / local authority.
 */
export function shareCadastreAuthHint(commune: string, country: CountryCode | null): string {
	if (country === 'US' || country === 'CA' || country === 'NZ') {
		return m.share_cadastre_hint_agency({ commune });
	}
	if (country === 'FR' || country === 'BE') {
		return m.share_cadastre_hint_mairie({ commune });
	}
	return m.share_cadastre_hint_owner({ commune });
}

/** Plain-text block for clipboard / share — no owner identity. */
export function buildCadastreRefsText(
	info: CadastreInfo,
	latitude: number,
	longitude: number,
	country: CountryCode | null = null
): string {
	const parcel = formatCadastreParcelRef(info);
	const lines: string[] = [
		m.share_cadastre_title(),
		m.share_cadastre_parcel({ parcel }),
		m.share_cadastre_commune({ commune: info.commune }),
		m.share_cadastre_gps({
			lat: latitude.toFixed(5),
			lng: longitude.toFixed(5)
		})
	];

	if (info.codeInsee?.trim() && info.codeInsee.trim() !== info.parcelNumber) {
		lines.push(m.share_cadastre_admin_code({ code: info.codeInsee.trim() }));
	}
	if (info.managerName?.trim()) {
		lines.push(m.share_cadastre_manager({ manager: info.managerName.trim() }));
	}
	if (info.unitName?.trim() && info.unitName.trim() !== info.commune) {
		lines.push(m.share_cadastre_unit({ unit: info.unitName.trim() }));
	}

	lines.push(m.share_cadastre_no_owner());
	lines.push(shareCadastreAuthHint(info.commune, country));
	return lines.join('\n');
}
