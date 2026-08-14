import { FREE_TREE_LIMIT } from '$lib/constants/pro';
import { devProOverrideState } from '$lib/stores/devProOverride.svelte';
import { proEntitlementState } from '$lib/stores/proEntitlement.svelte';
import type { Tree } from '$lib/types/tree';

export function isProUnlocked(): boolean {
	if (!proEntitlementState.loaded) {
		return false;
	}
	if (proEntitlementState.isPro) {
		return true;
	}
	return devProOverrideState.available && devProOverrideState.enabled;
}

export function hasProFeatureAccess(): boolean {
	return isProUnlocked();
}

export function canAddTree(totalCount: number): boolean {
	return hasProFeatureAccess() || totalCount < FREE_TREE_LIMIT;
}

/** Remaining free tree slots; `0` when Pro or at/over the free limit. */
export function getFreeSlotsRemaining(totalCount: number): number {
	if (hasProFeatureAccess()) {
		return Number.POSITIVE_INFINITY;
	}
	return Math.max(0, FREE_TREE_LIMIT - totalCount);
}

export function sortTreesForAccess(trees: Tree[]): Tree[] {
	return [...trees].sort((a, b) => {
		if (a.isFavorite !== b.isFavorite) {
			return a.isFavorite ? -1 : 1;
		}
		return b.capturedAt.localeCompare(a.capturedAt);
	});
}

export function getAccessibleTrees(trees: Tree[]): Tree[] {
	if (hasProFeatureAccess()) {
		return sortTreesForAccess(trees);
	}
	return sortTreesForAccess(trees).slice(0, FREE_TREE_LIMIT);
}

export function getHiddenTreeCount(trees: Tree[]): number {
	if (hasProFeatureAccess()) {
		return 0;
	}
	return Math.max(0, trees.length - FREE_TREE_LIMIT);
}

export function isTreeAccessible(treeId: string, trees: Tree[]): boolean {
	return getAccessibleTrees(trees).some((tree) => tree.id === treeId);
}

export function canViewYrsDetails(): boolean {
	return hasProFeatureAccess();
}
