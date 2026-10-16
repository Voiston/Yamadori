import { describe, expect, it } from 'vitest';
import {
	cadastrePinClass,
	focusCenterMarkerCss,
	parkingMarkerCss,
	treeMarkerCss
} from './mapMarkerStyles';

describe('mapMarkerStyles', () => {
	it('returns distinct outdoor and default tree marker styles', () => {
		expect(treeMarkerCss(false)).toContain('#2d4a2d');
		expect(treeMarkerCss(true)).toContain('#000000');
	});

	it('returns parking and focus marker styles', () => {
		expect(parkingMarkerCss(false)).toContain('#ea580c');
		expect(focusCenterMarkerCss(false)).toContain('#2d4a2d');
	});

	it('marks cadastre pins for outdoor contrast', () => {
		expect(cadastrePinClass(false)).toBe('cadastre-pin');
		expect(cadastrePinClass(true)).toBe('cadastre-pin cadastre-pin--outdoor');
	});
});
