import { get, set } from 'idb-keyval';

const DEVICE_KEY = 'yamadori-sync-device-key';
const CREDS_KEY = 'yamadori-sync-credentials';

type StoredCredentials = {
	iv: string;
	ciphertext: string;
};

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function getDeviceKey(): Promise<CryptoKey> {
	let raw = await get<string>(DEVICE_KEY);
	if (!raw) {
		raw = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
		await set(DEVICE_KEY, raw);
	}
	return crypto.subtle.importKey('raw', base64ToBytes(raw), { name: 'AES-GCM' }, false, [
		'encrypt',
		'decrypt'
	]);
}

export async function saveStoredPassword(password: string): Promise<void> {
	const key = await getDeviceKey();
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(password)
	);
	await set(CREDS_KEY, {
		iv: bytesToBase64(iv),
		ciphertext: bytesToBase64(new Uint8Array(ciphertext))
	} satisfies StoredCredentials);
}

export async function loadStoredPassword(): Promise<string | null> {
	const stored = await get<StoredCredentials>(CREDS_KEY);
	if (!stored) return null;
	try {
		const key = await getDeviceKey();
		const decrypted = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: base64ToBytes(stored.iv) },
			key,
			base64ToBytes(stored.ciphertext)
		);
		return new TextDecoder().decode(decrypted);
	} catch {
		await clearStoredPassword();
		return null;
	}
}

export async function clearStoredPassword(): Promise<void> {
	await set(CREDS_KEY, null);
}
