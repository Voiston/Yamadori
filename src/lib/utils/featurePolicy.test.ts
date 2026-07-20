import { beforeEach, describe, expect, it } from 'vitest';
import { devProOverrideState } from '$lib/stores/devProOverride.svelte';
import { proEntitlementState } from '$lib/stores/proEntitlement.svelte';
import { proPromoState } from '$lib/stores/proPromo.svelte';
import { PRO_PROMO_DURATION_MS } from '$lib/constants/pro';
import type { Tree } from '$lib/types/tree';
import {
	canAddTree,
	canViewYrsDetails,
	getAccessibleTrees,
	getHiddenTreeCount,
	hasProFeatureAccess,
	isTreeAccessible,
	sortTreesForAccess
} from './featurePolicy';

function makeTree(id: string, capturedAt: string, isFavorite = false): Tree {
	return {
		id,
		species: 'Pin',
		notes: '',
		photos: [],
		visits: [],
		assessment: {
			nebari: null,
			trunkDiameterCm: null,
			bark: null,
			deadwood: null,
			sizeClass: null,
			caliber: null,
			potentialScore: null,
			observedPhenologyStage: null,
			cernageStatus: null
		},
		voiceNote: null,
		latitude: null,
		longitude: null,
		accuracyMeters: null,
		altitudeMeters: null,
		frontHeadingDegrees: null,
		isFavorite,
		climateHistory: null,
		locationLabel: null,
		cadastreInfo: null,
		harvestEthicsConfirmation: null,
		environmentExposure: 'OPEN',
		yrsAtCapture: null,
		capturedAt
	};
}

function setPro(isPro: boolean): void {
	proEntitlementState.loaded = true;
	proEntitlementState.isPro = isPro;
}

function setPromoPricingWindow(nowMs: number): void {
	proPromoState.loaded = true;
	proPromoState.promoEndsAt = new Date(nowMs + PRO_PROMO_DURATION_MS).toISOString();
}

describe('featurePolicy', () => {
	beforeEach(() => {
		setPro(false);
		proPromoState.loaded = true;
		proPromoState.promoEndsAt = null;
		devProOverrideState.available = false;
		devProOverrideState.enabled = false;
		devProOverrideState.loaded = true;
	});

	it('allows adding trees up to the free limit', () => {
		expect(canAddTree(0)).toBe(true);
		expect(canAddTree(2)).toBe(true);
		expect(canAddTree(3)).toBe(false);
	});

	it('allows unlimited trees when Pro is unlocked', () => {
		setPro(true);
		expect(canAddTree(3)).toBe(true);
		expect(canAddTree(100)).toBe(true);
	});

	it('returns only three accessible trees for free users', () => {
		const trees = [
			makeTree('a', '2026-01-01'),
			makeTree('b', '2026-02-01'),
			makeTree('c', '2026-03-01'),
			makeTree('d', '2026-04-01')
		];

		const accessible = getAccessibleTrees(trees);
		expect(accessible).toHaveLength(3);
		expect(accessible.map((t) => t.id)).toEqual(['d', 'c', 'b']);
		expect(getHiddenTreeCount(trees)).toBe(1);
	});

	it('prioritizes favorites when selecting accessible trees', () => {
		const trees = [
			makeTree('old', '2026-01-01'),
			makeTree('fav', '2025-01-01', true),
			makeTree('mid', '2026-06-01'),
			makeTree('new', '2026-12-01')
		];

		const accessible = getAccessibleTrees(trees);
		expect(accessible.map((t) => t.id)).toEqual(['fav', 'new', 'mid']);
	});

	it('blocks access to hidden trees by id', () => {
		const trees = [
			makeTree('visible', '2026-06-01'),
			makeTree('hidden', '2026-01-01')
		];
		for (let i = 0; i < 3; i++) {
			trees.push(makeTree(`extra-${i}`, `2026-0${i + 2}-01`));
		}

		expect(isTreeAccessible('visible', trees)).toBe(true);
		expect(isTreeAccessible('hidden', trees)).toBe(false);
	});

	it('grants full access when Pro is unlocked', () => {
		const trees = Array.from({ length: 5 }, (_, i) => makeTree(`t${i}`, `2026-0${i + 1}-01`));
		setPro(true);

		expect(getAccessibleTrees(trees)).toHaveLength(5);
		expect(getHiddenTreeCount(trees)).toBe(0);
		expect(isTreeAccessible('t0', trees)).toBe(true);
	});

	it('gates YRS details behind Pro', () => {
		expect(canViewYrsDetails()).toBe(false);
		setPro(true);
		expect(canViewYrsDetails()).toBe(true);
	});

	it('sorts favorites before capture date', () => {
		const trees = [
			makeTree('b', '2026-02-01'),
			makeTree('a', '2026-03-01', true)
		];
		expect(sortTreesForAccess(trees).map((t) => t.id)).toEqual(['a', 'b']);
	});

	it('does not grant Pro feature access during an active promo pricing window', () => {
		const now = Date.parse('2026-06-01T12:00:00.000Z');
		setPromoPricingWindow(now);
		const trees = Array.from({ length: 5 }, (_, i) => makeTree(`t${i}`, `2026-0${i + 1}-01`));

		expect(hasProFeatureAccess()).toBe(false);
		expect(canAddTree(5)).toBe(false);
		expect(getAccessibleTrees(trees)).toHaveLength(3);
		expect(getHiddenTreeCount(trees)).toBe(2);
		expect(canViewYrsDetails()).toBe(false);
	});
});
