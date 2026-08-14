import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REGIONAL_API_COORD_DECIMALS, regionalApiCoordinates } from '$lib/utils/geo';

const utilsDir = dirname(fileURLToPath(import.meta.url));

/** Modules that must truncate coords before Open-Meteo / Nominatim network calls. */
const REGIONAL_API_CALLERS = [
	'agri.ts',
	'openMeteoArchive.ts',
	'climate.ts',
	'geocoding.ts'
] as const;

describe('regional API coordinate truncation', () => {
	it('truncates to ~1 km precision', () => {
		expect(REGIONAL_API_COORD_DECIMALS).toBe(2);
		expect(regionalApiCoordinates(47.45999, -1.52999)).toEqual({
			latitude: 47.45,
			longitude: -1.52
		});
	});

	it('is used by every Open-Meteo / Nominatim caller', () => {
		for (const file of REGIONAL_API_CALLERS) {
			const source = readFileSync(join(utilsDir, file), 'utf8');
			expect(source, `${file} should import regionalApiCoordinates`).toMatch(
				/regionalApiCoordinates/
			);
			expect(source, `${file} should apply truncation before API params`).toMatch(
				/regionalApiCoordinates\(/
			);
		}
	});

	it('does not truncate cadastre lookup modules (full precision required)', () => {
		const cadastre = readFileSync(join(utilsDir, 'cadastre.ts'), 'utf8');
		expect(cadastre).not.toMatch(/regionalApiCoordinates/);
	});
});
