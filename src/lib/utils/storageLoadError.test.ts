import { describe, expect, it } from 'vitest';
import { LOCAL_ENCRYPTION_KEY_MISSING_ERROR } from '$lib/utils/secure-idb';
import { resolveParkingLoadError, resolveTreesLoadError } from './storageLoadError';

describe('resolveTreesLoadError', () => {
	it('returns encryption-specific copy when key is missing', () => {
		const result = resolveTreesLoadError(new Error(LOCAL_ENCRYPTION_KEY_MISSING_ERROR));
		expect(result.suggestImport).toBe(true);
		expect(result.what).toContain('inaccessibles');
		expect(result.action.kind).toBe('link');
	});

	it('returns corrupt copy for other errors', () => {
		const result = resolveTreesLoadError(new Error('parse failed'));
		expect(result.suggestImport).toBe(true);
		expect(result.what).toContain('illisibles');
	});
});

describe('resolveParkingLoadError', () => {
	it('returns encryption-specific copy when key is missing', () => {
		const result = resolveParkingLoadError(new Error(LOCAL_ENCRYPTION_KEY_MISSING_ERROR));
		expect(result.suggestImport).toBe(true);
		expect(result.action.kind).toBe('link');
	});

	it('returns generic parking copy for other errors', () => {
		const result = resolveParkingLoadError(new Error('parse failed'));
		expect(result.suggestImport).toBe(false);
		expect(result.what).toContain('départ');
	});
});
