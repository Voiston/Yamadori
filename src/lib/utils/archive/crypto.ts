import { ArchiveError } from './types';

const APP_ARCHIVE_KEY_MATERIAL = 'yamadori-archive-v2';
const IV_BYTES = 12;
const ENVELOPE_MAGIC = new TextEncoder().encode('YAMADORI');
const ENVELOPE_VERSION = 1;
const SALT_BYTES = 16;
const PBKDF2_ITERATIONS = 100_000;
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

export function isPasswordProtectedArchive(bytes: Uint8Array): boolean {
	if (!hasEnvelopeMagic(bytes)) return false;
	return bytes.length >= ENVELOPE_HEADER_BYTES && bytes[ENVELOPE_MAGIC.length] === ENVELOPE_VERSION;
}

async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256'
		},
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

async function deriveVerificationHash(password: string, salt: Uint8Array): Promise<Uint8Array> {
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
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256'
		},
		baseKey,
		256
	);

	return new Uint8Array(bits);
}

export async function hashPasswordForVerification(
	password: string,
	saltInput?: Uint8Array
): Promise<{ salt: string; hash: string }> {
	const salt = saltInput ?? crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const hash = await deriveVerificationHash(password, salt);
	return {
		salt: ivToBase64(salt),
		hash: bytesToBase64(hash)
	};
}

export async function verifyPassword(
	password: string,
	saltBase64: string,
	hashBase64: string
): Promise<boolean> {
	const salt = base64ToBytes(saltBase64);
	const expected = base64ToBytes(hashBase64);
	const actual = await deriveVerificationHash(password, salt);

	if (actual.length !== expected.length) return false;

	let diff = 0;
	for (let i = 0; i < actual.length; i += 1) {
		diff |= actual[i]! ^ expected[i]!;
	}
	return diff === 0;
}

export async function encryptEnvelope(
	plaintext: Uint8Array,
	password: string
): Promise<Uint8Array> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const iv = generateIv();
	const key = await deriveKeyFromPassword(password, salt);
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

	const salt = bytes.slice(ENVELOPE_MAGIC.length + 1, ENVELOPE_MAGIC.length + 1 + SALT_BYTES);
	const iv = bytes.slice(
		ENVELOPE_MAGIC.length + 1 + SALT_BYTES,
		ENVELOPE_HEADER_BYTES
	);
	const ciphertext = bytes.slice(ENVELOPE_HEADER_BYTES);

	try {
		const key = await deriveKeyFromPassword(password, salt);
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

async function getAppArchiveKey(): Promise<CryptoKey> {
	if (cachedKey) return cachedKey;

	const raw = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(APP_ARCHIVE_KEY_MATERIAL)
	);
	cachedKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
	return cachedKey;
}

export async function encryptPayload(
	plaintext: string
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
	const iv = generateIv();
	const key = await getAppArchiveKey();
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

export async function decryptPayload(ciphertext: Uint8Array, iv: Uint8Array): Promise<string> {
	try {
		const key = await getAppArchiveKey();
		const decrypted = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: copyBytes(iv) },
			key,
			copyBytes(ciphertext)
		);
		return new TextDecoder().decode(decrypted);
	} catch {
		throw new ArchiveError(
			'ARCHIVE_INVALID_PAYLOAD',
			'Sauvegarde corrompue ou données chiffrées invalides.'
		);
	}
}
