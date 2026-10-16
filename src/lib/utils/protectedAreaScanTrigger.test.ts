import { describe, expect, it } from 'vitest';
import { protectedAreaScanEffectKey } from './protectedAreaScanTrigger';

describe('protectedAreaScanEffectKey', () => {
	it('stays stable for GPS jitter inside the same cadastre cell', () => {
		expect(protectedAreaScanEffectKey(48.85664, 2.35221, true)).toBe(
			protectedAreaScanEffectKey(48.85661, 2.35224, true)
		);
	});

	it('changes when the cache cell changes', () => {
		expect(protectedAreaScanEffectKey(48.8566, 2.3522, true)).not.toBe(
			protectedAreaScanEffectKey(48.858, 2.3522, true)
		);
	});

	it('changes when the online flag changes', () => {
		expect(protectedAreaScanEffectKey(48.8566, 2.3522, true)).not.toBe(
			protectedAreaScanEffectKey(48.8566, 2.3522, false)
		);
	});
});
