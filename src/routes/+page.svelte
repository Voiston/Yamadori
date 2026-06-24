<script lang="ts">

	import FilterChips from '$lib/components/FilterChips.svelte';

	import SearchBar from '$lib/components/SearchBar.svelte';

	import SortSelect from '$lib/components/SortSelect.svelte';

	import TreeList from '$lib/components/TreeList.svelte';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import { sortedTrees, treeStore } from '$lib/stores/trees.svelte';

	import * as m from '$lib/paraglide/messages.js';

	import {

		getTreeDistance,

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

	let query = $state('');

	let filter = $state<'all' | 'favorites'>('all');

	let sortKey = $state<SortKey>('date_desc');



	$effect(() => {
		if (needsUserPosition(sortKey)) {
			void requestCurrentPosition('proximity');
			const release = acquireLocationWatch('home-list', 'proximity');
			return () => release();
		}

		releaseLocationWatch('home-list');
	});



	let allTrees = $derived(

		sortTrees(sortedTrees(), sortKey, userPositionState.position ?? undefined)

	);



	let trees = $derived(

		allTrees.filter((tree) => {

			const matchesQuery =

				!query.trim() || tree.species.toLowerCase().includes(query.trim().toLowerCase());

			const matchesFilter = filter === 'all' || tree.isFavorite;

			return matchesQuery && matchesFilter;

		})

	);



	let distanceByTreeId = $derived.by(() => {

		if (!needsUserPosition(sortKey) || !userPositionState.position) {

			return {} as Record<string, number>;

		}

		const map: Record<string, number> = {};

		for (const tree of trees) {

			const distance = getTreeDistance(tree, userPositionState.position);

			if (distance !== null) {

				map[tree.id] = distance;

			}

		}

		return map;

	});



	let isFiltering = $derived(query.trim().length > 0 || filter === 'favorites');

	let emptyTitle = $derived.by(() => {

		void appearanceSettingsState.locale;

		if (filter === 'favorites') {

			return isFiltering && query.trim() ? m.list_no_results() : m.list_no_favorites();

		}

		return isFiltering ? m.list_no_results() : m.list_no_trees();

	});

	let emptyMessage = $derived.by(() => {

		void appearanceSettingsState.locale;

		const q = query.trim();

		if (filter === 'favorites') {

			return q ? m.list_no_favorites_for_query({ query: q }) : m.list_favorites_hint();

		}

		return q ? m.list_no_results_for_query({ query: q }) : m.list_empty_hint();

	});

	let pageTitle = $derived.by(() => {

		void appearanceSettingsState.locale;

		return m.title_list();

	});

</script>



<svelte:head>

	<title>{pageTitle}</title>

</svelte:head>



<div class="flex flex-col gap-4 md:gap-6">

	{#if treeStore.trees.length > 0}

		<div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">

			<div class="min-w-0 flex-1">

				<SearchBar bind:value={query} />

			</div>

		</div>



		<FilterChips bind:value={filter} />

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



	<TreeList {trees} {distanceByTreeId} {emptyTitle} {emptyMessage} />

</div>

