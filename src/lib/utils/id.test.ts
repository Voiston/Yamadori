import { describe, expect, it } from 'vitest';
import { generateId, isValidTreeId, sanitizeTreeId } from './id';

describe('tree id validation', () => {
	it('accepts UUID v4 ids', () => {
		const id = generateId();
		expect(isValidTreeId(id)).toBe(true);
		expect(sanitizeTreeId(id)).toBe(id);
	});

	it('rejects ids with HTML injection characters', () => {
		const malicious = 'x" onclick="alert(1)"';
		expect(isValidTreeId(malicious)).toBe(false);
		const sanitized = sanitizeTreeId(malicious);
		expect(isValidTreeId(sanitized)).toBe(true);
		expect(sanitized).not.toBe(malicious);
	});

	it('rejects legacy short ids', () => {
		expect(isValidTreeId('tree-1')).toBe(false);
		const sanitized = sanitizeTreeId('tree-1');
		expect(isValidTreeId(sanitized)).toBe(true);
	});
});
