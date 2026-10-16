import { describe, expect, it } from 'vitest';
import {
	isLegacyProProductId,
	isSupportProductId,
	LEGACY_PRO_PRODUCT_IDS,
	SUPPORT_PRODUCT_IDS
} from './support';

describe('support product ids', () => {
	it('keeps tip SKUs distinct from the former Pro unlocks', () => {
		expect(SUPPORT_PRODUCT_IDS).toEqual([
			'yamadori_support_2',
			'yamadori_support_5',
			'yamadori_support_10'
		]);
		for (const id of SUPPORT_PRODUCT_IDS) {
			expect(isSupportProductId(id)).toBe(true);
			expect(isLegacyProProductId(id)).toBe(false);
		}
		for (const id of LEGACY_PRO_PRODUCT_IDS) {
			expect(isLegacyProProductId(id)).toBe(true);
			expect(isSupportProductId(id)).toBe(false);
		}
	});
});
