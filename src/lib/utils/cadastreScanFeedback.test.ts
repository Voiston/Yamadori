import { describe, expect, it } from 'vitest';
import type { CadastreInfo } from '$lib/types/cadastre';
import { cadastreScanHapticKind } from './cadastreScanFeedback';

function info(partial: Partial<CadastreInfo> & Pick<CadastreInfo, 'zoneType'>): CadastreInfo {
	return {
		commune: 'Test',
		section: 'A',
		parcelNumber: '1',
		codeInsee: '00000',
		fetchedAt: '2026-01-01',
		...partial
	};
}

describe('cadastreScanHapticKind', () => {
	it('warns on a miss (offline or failed lookup)', () => {
		expect(cadastreScanHapticKind(null)).toBe('warning');
	});

	it('selects on private / owner-permission cache hits', () => {
		expect(
			cadastreScanHapticKind(info({ zoneType: 'private', collectStatus: 'owner_permission' }))
		).toBe('selection');
	});

	it('warns on sensitive tenure', () => {
		expect(cadastreScanHapticKind(info({ zoneType: 'national_park' }))).toBe('warning');
		expect(cadastreScanHapticKind(info({ zoneType: 'state_forest' }))).toBe('warning');
		expect(cadastreScanHapticKind(info({ zoneType: 'communal_forest' }))).toBe('warning');
	});
});
