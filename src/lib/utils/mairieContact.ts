import type { MairieContact } from '$lib/types/mairie-contact';
import { getApiDisabledError, isApiEnabled } from '$lib/utils/apiPolicy';
import {
	getCachedMairieContact,
	saveCachedMairieContact
} from '$lib/utils/mairieContactCache';

const ANNUAIRE_URL =
	'https://api-lannuaire.service-public.gouv.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records';

const FETCH_TIMEOUT_MS = 8_000;
const MIN_REQUEST_INTERVAL_MS = 500;

type PhoneEntry = { valeur?: string };
type WebsiteEntry = { valeur?: string };

type AnnuaireRecord = {
	nom?: string;
	telephone?: string;
	site_internet?: string;
};

type AnnuaireResponse = {
	total_count?: number;
	results?: AnnuaireRecord[];
};

let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

const memoryCache = new Map<string, MairieContact | null>();

function throttleRequest<T>(fn: () => Promise<T>): Promise<T> {
	const run = async (): Promise<T> => {
		const now = Date.now();
		const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastRequestAt));
		if (waitMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, waitMs));
		}
		lastRequestAt = Date.now();
		return fn();
	};

	const result = queue.then(run, run);
	queue = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}

function parseJsonArray<T>(raw: unknown): T[] {
	if (!raw) return [];
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw) as unknown;
			return Array.isArray(parsed) ? (parsed as T[]) : [];
		} catch {
			return [];
		}
	}
	return Array.isArray(raw) ? (raw as T[]) : [];
}

export function toTelHref(display: string): string | null {
	const trimmed = display.trim();
	if (!trimmed) return null;

	const digits = trimmed.replace(/\D/g, '');
	if (!digits) return null;

	if (digits.length === 10 && digits.startsWith('0')) {
		return `tel:+33${digits.slice(1)}`;
	}

	if (digits.startsWith('33') && digits.length >= 11) {
		return `tel:+${digits}`;
	}

	return `tel:${trimmed.replace(/\s/g, '')}`;
}

export function resolveMairieInseeCandidates(codeInsee: string): string[] {
	const code = codeInsee.trim();
	if (!code) return [];

	const candidates = [code];

	if (/^751\d{2}$/.test(code) && code !== '75056') {
		candidates.push('75056');
	}

	if (/^6938[1-9]$/.test(code)) {
		candidates.push('69123');
	}

	if (/^132(0[1-9]|1[0-6])$/.test(code)) {
		candidates.push('13055');
	}

	return [...new Set(candidates)];
}

export function parseMairieRecord(record: AnnuaireRecord): MairieContact | null {
	const name = record.nom?.trim();
	if (!name) return null;

	const phones = parseJsonArray<PhoneEntry>(record.telephone);
	const phoneDisplay = phones[0]?.valeur?.trim() ?? '';
	const phoneTel = phoneDisplay ? toTelHref(phoneDisplay) : null;
	if (!phoneTel) return null;

	const websites = parseJsonArray<WebsiteEntry>(record.site_internet);
	const website = websites[0]?.valeur?.trim() || undefined;

	return {
		name,
		phoneDisplay,
		phoneTel,
		website,
		fetchedAt: new Date().toISOString()
	};
}

async function fetchMairieByInsee(codeInsee: string): Promise<MairieContact | null> {
	const where = encodeURIComponent(
		`code_insee_commune LIKE "${codeInsee}" and pivot LIKE "mairie"`
	);
	const url = `${ANNUAIRE_URL}?where=${where}&limit=1`;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) return null;

		const data = (await response.json()) as AnnuaireResponse;
		const record = data.results?.[0];
		if (!record) return null;

		return parseMairieRecord(record);
	} catch {
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}

async function lookupUncached(codeInsee: string): Promise<MairieContact | null> {
	const candidates = resolveMairieInseeCandidates(codeInsee);

	for (const candidate of candidates) {
		const contact = await fetchMairieByInsee(candidate);
		if (contact) return contact;
	}

	return null;
}

/**
 * Interroge l'annuaire Service-public pour obtenir le nom et le téléphone de la mairie.
 * Seul le code INSEE communal est transmis — aucune coordonnée GPS.
 */
export async function lookupMairieContact(codeInsee: string): Promise<MairieContact | null> {
	const key = codeInsee.trim();
	if (!key) return null;

	const memoryHit = memoryCache.get(key);
	if (memoryHit !== undefined) {
		return memoryHit;
	}

	const cached = await getCachedMairieContact(key);
	if (cached) {
		memoryCache.set(key, cached);
		return cached;
	}

	if (!isApiEnabled('servicePublicAnnuaire')) {
		throw new Error(getApiDisabledError('servicePublicAnnuaire'));
	}

	return throttleRequest(async () => {
		const again = memoryCache.get(key);
		if (again !== undefined) return again;

		const persisted = await getCachedMairieContact(key);
		if (persisted) {
			memoryCache.set(key, persisted);
			return persisted;
		}

		const result = await lookupUncached(key);
		memoryCache.set(key, result);
		if (result) {
			await saveCachedMairieContact(key, result);
		}
		return result;
	});
}

/** Vide le cache mémoire (session). */
export function clearMairieContactMemoryCache(): void {
	memoryCache.clear();
}
