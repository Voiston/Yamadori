function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', copyBytes(data));
	return bytesToHex(new Uint8Array(digest));
}

function copyBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
	return new Uint8Array(data);
}

export async function sha256HexFromText(text: string): Promise<string> {
	return sha256Hex(new TextEncoder().encode(text));
}
