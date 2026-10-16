import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const messagesDir = resolve(process.cwd(), 'messages');

function loadMessages() {
	const files = readdirSync(messagesDir).filter((name) => name.endsWith('.json'));
	return files.map((name) => {
		const raw = readFileSync(resolve(messagesDir, name), 'utf8').replace(/^\uFEFF/, '');
		return { locale: name.replace(/\.json$/, ''), data: JSON.parse(raw) as Record<string, string> };
	});
}

const MARKET_BADGE =
	/\bcompliant(?:\s+with)?\s+(?:us|u\.s\.?|american)\b|conforme au droit (?:américain|americain)|rechtskonform(?:er)?(?:\s+US)?|conforme al derecho (?:estadounidense|americano)/i;

describe('legal aid disclaimer', () => {
	it('exists in every locale and is not a compliance badge', () => {
		const locales = loadMessages();
		expect(locales.length).toBeGreaterThanOrEqual(11);
		for (const { locale, data } of locales) {
			const text = data.legal_aid_disclaimer;
			expect(text, `${locale} missing legal_aid_disclaimer`).toBeTruthy();
			expect(text.toLowerCase()).not.toMatch(MARKET_BADGE);
		}
	});

	it('never claims country-law compliance except the French L221-28 withdrawal rule', () => {
		for (const { locale, data } of loadMessages()) {
			for (const [key, value] of Object.entries(data)) {
				if (typeof value !== 'string') continue;
				if (key === 'sale_withdrawal_body' && /L221-28/.test(value)) continue;
				expect(value, `${locale}.${key}`).not.toMatch(MARKET_BADGE);
			}
		}
	});
});
