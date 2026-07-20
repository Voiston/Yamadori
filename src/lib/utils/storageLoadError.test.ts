import { describe, expect, it } from 'vitest';
import { LOCAL_ENCRYPTION_KEY_MISSING_ERROR } from '$lib/utils/secure-idb';
import { resolveParkingLoadError, resolveTreesLoadError } from '$lib/utils/storageLoadError';

describe('resolveTreesLoadError', () => {
	it('returns encryption-specific message when key is missing', () => {
		const result = resolveTreesLoadError(new Error(LOCAL_ENCRYPTION_KEY_MISSING_ERROR));
		expect(result.suggestImport).toBe(true);
		expect(result.message).toContain('Chiffrement');
	});

	it('returns corrupt message for other errors', () => {
		const result = resolveTreesLoadError(new Error('parse failed'));
		expect(result.suggestImport).toBe(true);
		expect(result.message).toContain('illisibles');
	});
});

describe('resolveParkingLoadError', () => {
	it('returns encryption-specific message when key is missing', () => {
		const result = resolveParkingLoadError(new Error(LOCAL_ENCRYPTION_KEY_MISSING_ERROR));
		expect(result.suggestImport).toBe(true);
		expect(result.message).toContain('chiffr');
	});

	it('returns generic parking message for other errors', () => {
		const result = resolveParkingLoadError(new Error('parse failed'));
		expect(result.suggestImport).toBe(false);
		expect(result.message).toContain('départ');
	});
});
