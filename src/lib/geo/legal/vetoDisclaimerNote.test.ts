import { describe, expect, it } from 'vitest';
import { vetoDisclaimerCountryNote } from '$lib/geo/legal/vetoDisclaimerNote';

describe('vetoDisclaimerCountryNote', () => {
	it('returns country-specific notes that never imply permission', () => {
		const fr = vetoDisclaimerCountryNote('FR');
		const de = vetoDisclaimerCountryNote('DE');
		const us = vetoDisclaimerCountryNote('US');
		expect(fr.length).toBeGreaterThan(20);
		expect(de.length).toBeGreaterThan(20);
		expect(us.length).toBeGreaterThan(20);
		expect(fr).not.toBe(de);
		expect(fr.toLowerCase()).not.toMatch(/\bautoris[ée]\b|\ballowed\b|\bpermitted\b/);
		expect(de.toLowerCase()).not.toMatch(/\berlaubt\b|\bbewilligt\b/);
	});

	it('falls back to generic ISO note for null', () => {
		const note = vetoDisclaimerCountryNote(null);
		expect(note).toMatch(/—|Context|Cadre|Kontext/i);
		expect(note).not.toBe(vetoDisclaimerCountryNote('FR'));
	});

	it('covers GB / BE jurisdiction wording distinctly from FR', () => {
		const gb = vetoDisclaimerCountryNote('GB');
		const be = vetoDisclaimerCountryNote('BE');
		expect(gb).not.toBe(vetoDisclaimerCountryNote('FR'));
		expect(be).not.toBe(vetoDisclaimerCountryNote('FR'));
		expect(gb.toLowerCase() + be.toLowerCase()).toMatch(/nation|région|region|land/i);
	});
});
