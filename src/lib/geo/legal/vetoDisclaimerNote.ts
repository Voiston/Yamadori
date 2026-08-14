import type { CountryCode } from '$lib/geo/countries';
import * as m from '$lib/paraglide/messages';

type NoteFn = () => string;

/**
 * Short jurisdiction-level disclaimer notes (never imply permission).
 * Falls back to the generic ISO-framed note when no country-specific copy exists.
 */
const COUNTRY_NOTES: Partial<Record<CountryCode, NoteFn>> = {
	FR: () => m.veto_disclaimer_note_fr(),
	DE: () => m.veto_disclaimer_note_de(),
	ES: () => m.veto_disclaimer_note_es(),
	IT: () => m.veto_disclaimer_note_it(),
	CH: () => m.veto_disclaimer_note_ch(),
	BE: () => m.veto_disclaimer_note_be(),
	NL: () => m.veto_disclaimer_note_nl(),
	AT: () => m.veto_disclaimer_note_at(),
	PT: () => m.veto_disclaimer_note_pt(),
	IE: () => m.veto_disclaimer_note_ie(),
	GB: () => m.veto_disclaimer_note_gb(),
	SE: () => m.veto_disclaimer_note_se(),
	NO: () => m.veto_disclaimer_note_no(),
	US: () => m.veto_disclaimer_note_us(),
	CA: () => m.veto_disclaimer_note_ca(),
	NZ: () => m.veto_disclaimer_note_nz(),
	AU: () => m.veto_disclaimer_note_au(),
	DK: () => m.veto_disclaimer_note_dk(),
	FI: () => m.veto_disclaimer_note_fi(),
	JP: () => m.veto_disclaimer_note_jp()
};

export function vetoDisclaimerCountryNote(country: CountryCode | null): string {
	if (country) {
		const note = COUNTRY_NOTES[country];
		if (note) return note();
	}
	return m.veto_disclaimer_country_note({ country: country ?? '—' });
}
