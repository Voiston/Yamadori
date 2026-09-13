import { describe, expect, it } from 'vitest';
import pkg from '../../../package.json';
import { APP_VERSION, HTTP_USER_AGENT } from './app';

describe('HTTP_USER_AGENT', () => {
	it('embeds package.json version', () => {
		expect(APP_VERSION).toBe(pkg.version);
		expect(HTTP_USER_AGENT).toBe(`Yamadori/${pkg.version} (bonsai field app)`);
	});
});
