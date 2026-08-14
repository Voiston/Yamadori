import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const memoryStore = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
	createStore: () => ({}),
	get: vi.fn(async (key: string) => memoryStore.get(String(key))),
	set: vi.fn(async (key: string, value: unknown) => {
		memoryStore.set(String(key), value);
	}),
	del: vi.fn(async (key: string) => {
		memoryStore.delete(String(key));
	}),
	keys: vi.fn(async () => [...memoryStore.keys()])
}));

import { apiSettingsState } from '$lib/stores/apiSettings.svelte';
import {
	clearMairieContactMemoryCache,
	lookupMairieContact,
	parseMairieRecord,
	resolveMairieInseeCandidates,
	sanitizeHttpUrl,
	toTelHref
} from './mairieContact';

const bordeauxRecord = {
	nom: 'Mairie - Bordeaux',
	telephone: '[{"valeur": "05 56 10 20 30", "description": ""}]',
	site_internet: '[{"valeur": "https://www.bordeaux.fr", "libelle": ""}]'
};

const parisRecord = {
	nom: 'Mairie - Paris - Hôtel-de-Ville',
	telephone: '[{"valeur": "01 42 76 40 40", "description": ""}]'
};

describe('toTelHref', () => {
	it('converts French national format to tel:+33', () => {
		expect(toTelHref('05 56 10 20 30')).toBe('tel:+33556102030');
	});

	it('returns null for empty input', () => {
		expect(toTelHref('')).toBeNull();
		expect(toTelHref('   ')).toBeNull();
	});
});

describe('resolveMairieInseeCandidates', () => {
	it('adds Paris parent code for arrondissements', () => {
		expect(resolveMairieInseeCandidates('75104')).toEqual(['75104', '75056']);
	});

	it('adds Lyon parent code', () => {
		expect(resolveMairieInseeCandidates('69382')).toEqual(['69382', '69123']);
	});

	it('adds Marseille parent code', () => {
		expect(resolveMairieInseeCandidates('13202')).toEqual(['13202', '13055']);
	});

	it('keeps regular communes unchanged', () => {
		expect(resolveMairieInseeCandidates('33063')).toEqual(['33063']);
	});
});

describe('parseMairieRecord', () => {
	it('parses name and phone from annuaire record', () => {
		const contact = parseMairieRecord(bordeauxRecord);
		expect(contact).toMatchObject({
			name: 'Mairie - Bordeaux',
			phoneDisplay: '05 56 10 20 30',
			phoneTel: 'tel:+33556102030',
			website: 'https://www.bordeaux.fr/'
		});
	});

	it('returns null when phone is missing', () => {
		expect(parseMairieRecord({ nom: 'Mairie - Test' })).toBeNull();
	});

	it('drops javascript and data website URLs', () => {
		expect(
			parseMairieRecord({
				...bordeauxRecord,
				site_internet: '[{"valeur":"javascript:alert(1)"}]'
			})?.website
		).toBeUndefined();
		expect(
			parseMairieRecord({
				...bordeauxRecord,
				site_internet: '[{"valeur":"data:text/html,hi"}]'
			})?.website
		).toBeUndefined();
	});
});

describe('sanitizeHttpUrl', () => {
	it('allows http and https only', () => {
		expect(sanitizeHttpUrl('https://example.com/path')).toBe('https://example.com/path');
		expect(sanitizeHttpUrl('http://example.com')).toBe('http://example.com/');
		expect(sanitizeHttpUrl('javascript:alert(1)')).toBeUndefined();
		expect(sanitizeHttpUrl('data:text/html,x')).toBeUndefined();
		expect(sanitizeHttpUrl('not a url')).toBeUndefined();
	});
});

describe('lookupMairieContact', () => {
	beforeEach(() => {
		memoryStore.clear();
		clearMairieContactMemoryCache();
		apiSettingsState.loaded = true;
		apiSettingsState.servicePublicAnnuaire = true;
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns null when API is disabled', async () => {
		apiSettingsState.servicePublicAnnuaire = false;
		await expect(lookupMairieContact('33063')).rejects.toThrow(/Service-public|Annuaire/i);
	});

	it('fetches mairie by INSEE code', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ total_count: 1, results: [bordeauxRecord] })
		} as Response);

		const contact = await lookupMairieContact('33063');
		expect(contact?.name).toBe('Mairie - Bordeaux');
		expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('33063');
	});

	it('falls back to Paris parent INSEE for arrondissements', async () => {
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes('75104')) {
				return { ok: true, json: async () => ({ total_count: 0, results: [] }) } as Response;
			}
			if (url.includes('75056')) {
				return { ok: true, json: async () => ({ total_count: 1, results: [parisRecord] }) } as Response;
			}
			return { ok: true, json: async () => ({ total_count: 0, results: [] }) } as Response;
		});

		const contact = await lookupMairieContact('75104');
		expect(contact?.name).toBe('Mairie - Paris - Hôtel-de-Ville');
		expect(vi.mocked(fetch).mock.calls.some((call) => String(call[0]).includes('75056'))).toBe(
			true
		);
	});
});
