<script lang="ts">
	import FilterChips from '$lib/components/FilterChips.svelte';
	import ListProStrip from '$lib/components/ListProStrip.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SortSelect from '$lib/components/SortSelect.svelte';
	import TreeList from '$lib/components/TreeList.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { proEntitlementState } from '$lib/stores/proEntitlement.svelte';
	import {
		dismissProListPromo,
		isProListPromoDismissed,
		proListPromoDismissState
	} from '$lib/stores/proListPromoDismiss.svelte';
	import { openProPaywall } from '$lib/stores/proPaywall.svelte';
	import { proPromoState } from '$lib/stores/proPromo.svelte';
	import { treeStore } from '$lib/stores/trees.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { Tree } from '$lib/types/tree';
	import { getFreeSlotsRemaining, getHiddenTreeCount, isProUnlocked } from '$lib/utils/featurePolicy';
	import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';
	import { haversineDistanceM } from '$lib/utils/haversine';
	import { getProPromoState } from '$lib/utils/proOffer';
	import {
		buildTreeDistanceMap,
		needsUserPosition,
		sortTrees,
		type SortKey
	} from '$lib/utils/sort';
	import {
		acquireLocationWatch,
		requestCurrentPosition,
		releaseLocationWatch,
		userPositionState
	} from '$lib/utils/userPosition.svelte';

	const SEARCH_DEBOUNCE_MS = 200;
	const SORT_DISTANCE_MIN_MOVE_M = POOR_ACCURACY_THRESHOLD_M;

	let query = $state('');
	let debouncedQuery = $state('');
	let filter = $state<'all' | 'favorites'>('all');
	let sortKey = $state<SortKey>('date_desc');
	let stableSortPosition = $state<{ latitude: number; longitude: number } | null>(null);

	$effect(() => {
		const nextQuery = query;
		const timer = setTimeout(() => {
			debouncedQuery = nextQuery;
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (needsUserPosition(sortKey)) {
			void requestCurrentPosition('proximity');
			const release = acquireLocationWatch('home-list', 'proximity');
			return () => release();
		}

		releaseLocationWatch('home-list');
	});

	$effect(() => {
		if (!needsUserPosition(sortKey)) {
			stableSortPosition = null;
			return;
		}

		const position = userPositionState.position;
		if (!position) {
			stableSortPosition = null;
			return;
		}

		if (!stableSortPosition) {
			stableSortPosition = {
				latitude: position.latitude,
				longitude: position.longitude
			};
			return;
		}

		const movedM = haversineDistanceM(
			stableSortPosition.latitude,
			stableSortPosition.longitude,
			position.latitude,
			position.longitude
		);

		if (movedM >= SORT_DISTANCE_MIN_MOVE_M) {
			stableSortPosition = {
				latitude: position.latitude,
				longitude: position.longitude
			};
		}
	});

	function treeMatchesFilters(tree: Tree, normalizedQuery: string): boolean {
		const matchesQuery =
			!normalizedQuery || tree.species.toLowerCase().includes(normalizedQuery);
		const matchesFilter = filter === 'all' || tree.isFavorite;
		return matchesQuery && matchesFilter;
	}

	let listState = $derived.by(() => {
		const sourceTrees = treeStore.trees;
		const normalizedQuery = debouncedQuery.trim().toLowerCase();
		const useDistanceSort = needsUserPosition(sortKey);
		const sortPosition = useDistanceSort ? (stableSortPosition ?? undefined) : undefined;
		const distanceMap = sortPosition ? buildTreeDistanceMap(sourceTrees, sortPosition) : undefined;

		let sorted: Tree[];
		if (normalizedQuery && useDistanceSort) {
			const candidates = sourceTrees.filter((tree) => treeMatchesFilters(tree, normalizedQuery));
			sorted = sortTrees(candidates, sortKey, sortPosition, distanceMap);
		} else {
			sorted = sortTrees(sourceTrees, sortKey, sortPosition, distanceMap);
		}

		const trees =
			normalizedQuery && useDistanceSort
				? sorted
				: sorted.filter((tree) => treeMatchesFilters(tree, normalizedQuery));

		const distanceByTreeId: Record<string, number> = {};
		if (distanceMap && useDistanceSort) {
			for (const tree of trees) {
				const distance = distanceMap.get(tree.id);
				if (distance !== undefined) {
					distanceByTreeId[tree.id] = distance;
				}
			}
		}

		return { trees, distanceByTreeId };
	});

	let trees = $derived(listState.trees);
	let distanceByTreeId = $derived(listState.distanceByTreeId);

	let isFiltering = $derived(debouncedQuery.trim().length > 0 || filter === 'favorites');

	let emptyTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (filter === 'favorites') {
			return isFiltering && debouncedQuery.trim() ? m.list_no_results() : m.list_no_favorites();
		}
		return isFiltering ? m.list_no_results() : m.list_no_trees();
	});

	let emptyMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		const q = debouncedQuery.trim();
		if (filter === 'favorites') {
			return q ? m.list_no_favorites_for_query({ query: q }) : m.list_favorites_hint();
		}
		return q ? m.list_no_results_for_query({ query: q }) : m.list_empty_hint();
	});

	let pageTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.title_list();
	});

	const isPro = $derived(isProUnlocked());
	const hiddenTreeCount = $derived(getHiddenTreeCount(treeStore.trees));
	const freeSlotsRemaining = $derived(getFreeSlotsRemaining(treeStore.trees.length));
	const promoActive = $derived.by(() => {
		void proPromoState.promoEndsAt;
		void proEntitlementState.isPro;
		return getProPromoState(proPromoState.promoEndsAt).phase === 'promo';
	});
	const promoListDismissed = $derived.by(() => {
		void proListPromoDismissState.dismissedUntil;
		void proListPromoDismissState.loaded;
		return isProListPromoDismissed();
	});
	const showLockedStrip = $derived(!isPro && hiddenTreeCount > 0);
	const showPromoStrip = $derived(
		!isPro && promoActive && hiddenTreeCount === 0 && !promoListDismissed
	);
	const showFreeSlotWarn = $derived(
		!isPro && freeSlotsRemaining === 1 && !showLockedStrip && !showPromoStrip
	);
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="flex flex-col gap-4 md:gap-6">
	{#if showLockedStrip}
		<ListProStrip
			variant="locked"
			hiddenCount={hiddenTreeCount}
			onclick={() => openProPaywall('tree_locked')}
		/>
	{:else if showPromoStrip}
		<ListProStrip
			variant="promo"
			onclick={() => openProPaywall('tree_limit')}
			ondismiss={() => void dismissProListPromo()}
		/>
	{:else if showFreeSlotWarn}
		<button
			type="button"
			class="app-card w-full px-4 py-3 text-left transition active:scale-[0.99]"
			onclick={() => openProPaywall('tree_limit')}
		>
			<p class="text-sm font-medium text-forest-900">{m.pro_free_slot_remaining()}</p>
			<p class="mt-0.5 text-xs text-muted">{m.pro_upgrade_cta()}</p>
		</button>
	{/if}

	{#if treeStore.trees.length > 0}
		<div class="flex min-w-0 items-center gap-3 narrow:gap-2">
			<FilterChips bind:value={filter} />
			<div class="min-w-0 flex-1">
				<SearchBar bind:value={query} compact />
			</div>
		</div>

		<SortSelect bind:value={sortKey} />

		{#if needsUserPosition(sortKey)}
			<p class="text-sm text-muted">
				{#if userPositionState.position}
					{m.list_sort_distance_active()}
				{:else if userPositionState.error}
					{userPositionState.error}
				{:else}
					{m.list_gps_searching()}
				{/if}
			</p>
		{/if}
	{/if}

	<TreeList
		{trees}
		{distanceByTreeId}
		{emptyTitle}
		{emptyMessage}
		showCaptureCta={!isFiltering}
	/>
</div>
