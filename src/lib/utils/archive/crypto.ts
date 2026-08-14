import { ArchiveError } from './types';
import * as m from '$lib/paraglide/messages.js';

const APP_ARCHIVE_KEY_MATERIAL = 'yamadori-archive-v2';
const IV_BYTES = 12;
const ENVELOPE_MAGIC = new TextEncoder().encode('YAMADORI');
/** Legacy envelope: PBKDF2 100_000 iterations. */
export const ENVELOPE_VERSION_LEGACY = 1;
/** Current envelope: PBKDF2 600_000 iterations (OWASP 2023+). */
export const ENVELOPE_VERSION = 2;
const SALT_BYTES = 16;
export const PBKDF2_ITERATIONS_LEGACY = 100_000;
export const PBKDF2_ITERATIONS = 600_000;
const ENVELOPE_HEADER_BYTES = ENVELOPE_MAGIC.length + 1 + SALT_BYTES + IV_BYTES;

let cachedKey: CryptoKey | null = null;

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function copyBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
	return new Uint8Array(data);
}

export function base64ToBytes(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

export function generateIv(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(IV_BYTES));
}

export function ivToBase64(iv: Uint8Array): string {
	return bytesToBase64(iv);
}

function hasEnvelopeMagic(bytes: Uint8Array): boolean {
	if (bytes.length < ENVELOPE_MAGIC.length) return false;
	for (let i = 0; i < ENVELOPE_MAGIC.length; i += 1) {
		if (bytes[i] !== ENVELOPE_MAGIC[i]) return false;
	}
	return true;
}

function iterationsForEnvelopeVersion(version: number): number | null {
	if (version === ENVELOPE_VERSION_LEGACY) return PBKDF2_ITERATIONS_LEGACY;
	if (version === ENVELOPE_VERSION) return PBKDF2_ITERATIONS;
	return null;
}

export function isPasswordProtectedArchive(bytes: Uint8Array): boolean {
	if (!hasEnvelopeMagic(bytes)) return false;
	if (bytes.length < ENVELOPE_HEADER_BYTES) return false;
	return iterationsForEnvelopeVersion(bytes[ENVELOPE_MAGIC.length]!) !== null;
}

async function deriveKeyFromPassword(
	password: string,
	salt: Uint8Array,
	iterations: number
): Promise<CryptoKey> {
	const baseKey = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: copyBytes(salt),
			iterations,
			hash: 'SHA-256'
		},
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

async function deriveVerificationHash(
	password: string,
	salt: Uint8Array,
	iterations: number
): Promise<Uint8Array> {
	const baseKey = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);

	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: copyBytes(salt),
			iterations,
			hash: 'SHA-256'
		},
		baseKey,
		256
	);

	return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i += 1) {
		diff |= a[i]! ^ b[i]!;
	}
	return diff === 0;
}

export async function hashPasswordForVerification(
	password: string,
	saltInput?: Uint8Array,
	iterations: number = PBKDF2_ITERATIONS
): Promise<{ salt: string; hash: string; iterations: number }> {
	const salt = saltInput ?? crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const hash = await deriveVerificationHash(password, salt, iterations);
	return {
		salt: ivToBase64(salt),
		hash: bytesToBase64(hash),
		iterations
	};
}

export async function verifyPassword(
	password: string,
	saltBase64: string,
	hashBase64: string,
	iterations: number = PBKDF2_ITERATIONS
): Promise<boolean> {
	const salt = base64ToBytes(saltBase64);
	const expected = base64ToBytes(hashBase64);
	const actual = await deriveVerificationHash(password, salt, iterations);
	return constantTimeEqual(actual, expected);
}

/**
 * Verifies against the stored iteration count, then legacy 100k if needed
 * (configs written before iterations were persisted).
 */
export async function verifyPasswordCompatible(
	password: string,
	saltBase64: string,
	hashBase64: string,
	iterations?: number
): Promise<boolean> {
	const primary = iterations ?? PBKDF2_ITERATIONS_LEGACY;
	if (await verifyPassword(password, saltBase64, hashBase64, primary)) {
		return true;
	}
	if (primary !== PBKDF2_ITERATIONS && (await verifyPassword(password, saltBase64, hashBase64, PBKDF2_ITERATIONS))) {
		return true;
	}
	if (
		primary !== PBKDF2_ITERATIONS_LEGACY &&
		(await verifyPassword(password, saltBase64, hashBase64, PBKDF2_ITERATIONS_LEGACY))
	) {
		return true;
	}
	return false;
}

export async function encryptEnvelope(
	plaintext: Uint8Array,
	password: string
): Promise<Uint8Array> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const iv = generateIv();
	const key = await deriveKeyFromPassword(password, salt, PBKDF2_ITERATIONS);
	const encrypted = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: copyBytes(iv) },
		key,
		copyBytes(plaintext)
	);

	const envelope = new Uint8Array(ENVELOPE_HEADER_BYTES + encrypted.byteLength);
	envelope.set(ENVELOPE_MAGIC, 0);
	envelope[ENVELOPE_MAGIC.length] = ENVELOPE_VERSION;
	envelope.set(salt, ENVELOPE_MAGIC.length + 1);
	envelope.set(iv, ENVELOPE_MAGIC.length + 1 + SALT_BYTES);
	envelope.set(new Uint8Array(encrypted), ENVELOPE_HEADER_BYTES);
	return envelope;
}

export async function decryptEnvelope(
	bytes: Uint8Array,
	password: string
): Promise<Uint8Array> {
	if (!isPasswordProtectedArchive(bytes)) {
		throw new ArchiveError('ARCHIVE_INVALID_ZIP', 'Not a password-protected archive.');
	}

	const version = bytes[ENVELOPE_MAGIC.length]!;
	const iterations = iterationsForEnvelopeVersion(version);
	if (iterations === null) {
		throw new ArchiveError('ARCHIVE_INVALID_ZIP', 'Unsupported envelope version.');
	}

	const salt = bytes.slice(ENVELOPE_MAGIC.length + 1, ENVELOPE_MAGIC.length + 1 + SALT_BYTES);
	const iv = bytes.slice(
		ENVELOPE_MAGIC.length + 1 + SALT_BYTES,
		ENVELOPE_HEADER_BYTES
	);
	const ciphertext = bytes.slice(ENVELOPE_HEADER_BYTES);

	try {
		const key = await deriveKeyFromPassword(password, salt, iterations);
		const decrypted = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: copyBytes(iv) },
			key,
			copyBytes(ciphertext)
		);
		return new Uint8Array(decrypted);
	} catch {
		throw new ArchiveError('ARCHIVE_WRONG_PASSWORD', 'Wrong password.');
	}
}

async function importArchiveKey(keyMaterial: Uint8Array): Promise<CryptoKey> {
	if (keyMaterial.length !== 32) {
		throw new ArchiveError('ARCHIVE_INVALID_PAYLOAD', 'Invalid archive encryption key.');
	}
	return crypto.subtle.importKey('raw', copyBytes(keyMaterial), 'AES-GCM', false, [
		'encrypt',
		'decrypt'
	]);
}

async function getLegacyAppArchiveKey(): Promise<CryptoKey> {
	if (cachedKey) return cachedKey;

	const raw = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(APP_ARCHIVE_KEY_MATERIAL)
	);
	cachedKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
	return cachedKey;
}

export function generateArchiveKeyMaterial(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(32));
}

async function resolveArchiveKey(keyMaterial?: Uint8Array): Promise<CryptoKey> {
	if (keyMaterial) {
		return importArchiveKey(keyMaterial);
	}
	return getLegacyAppArchiveKey();
}

export async function encryptPayload(
	plaintext: string,
	keyMaterial?: Uint8Array
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
	const iv = generateIv();
	const key = await resolveArchiveKey(keyMaterial);
	const encrypted = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: copyBytes(iv) },
		key,
		new TextEncoder().encode(plaintext)
	);

	return {
		ciphertext: new Uint8Array(encrypted),
		iv
	};
}

export async function decryptPayload(
	ciphertext: Uint8Array,
	iv: Uint8Array,
	keyMaterial?: Uint8Array
): Promise<string> {
	try {
		const key = await resolveArchiveKey(keyMaterial);
		const decrypted = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: copyBytes(iv) },
			key,
			copyBytes(ciphertext)
		);
		return new TextDecoder().decode(decrypted);
	} catch {
		throw new ArchiveError('ARCHIVE_INVALID_PAYLOAD', m.archive_decrypt_failed());
	}
}
