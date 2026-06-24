import { describe, expect, it } from 'vitest';
import { hashPasswordForVerification, verifyPassword } from './crypto';

describe('password verification hash', () => {
	it('hashes and verifies a password', async () => {
		const { salt, hash } = await hashPasswordForVerification('my-secret-password');
		expect(await verifyPassword('my-secret-password', salt, hash)).toBe(true);
		expect(await verifyPassword('wrong-password', salt, hash)).toBe(false);
	});

	it('produces different hashes for different salts', async () => {
		const first = await hashPasswordForVerification('same-password');
		const second = await hashPasswordForVerification('same-password');
		expect(first.hash).not.toBe(second.hash);
	});
});
