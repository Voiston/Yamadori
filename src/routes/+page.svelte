<script lang="ts">
	import FilterChips from '$lib/components/FilterChips.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SortSelect from '$lib/components/SortSelect.svelte';
	import TreeList from '$lib/components/TreeList.svelte';
	import { sortedTrees, treeStore } from '$lib/stores/trees.svelte';
	import { exportTreesCsv } from '$lib/utils/export';
	import {
		getTreeDistance,
		needsUserPosition,
		sortTrees,
		type SortKey
	} from '$lib/utils/sort';
	import {
		requestCurrentPosition,
		startWatchingPosition,
		stopWatchingPosition,
		userPositionState
	} from '$lib/utils/userPosition.svelte';
	import { onMount } from 'svelte';

	let query = $state('');
	let filter = $state<'all' | 'favorites'>('all');
	let sortKey = $state<SortKey>('date_desc');

	onMount(() => {
		return () => stopWatchingPosition();
	});

	$effect(() => {
		if (needsUserPosition(sortKey)) {
			void requestCurrentPosition();
			startWatchingPosition();
		} else {
			stopWatchingPosition();
		}
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
	let emptyTitle = $derived(
		filter === 'favorites'
			? isFiltering && query.trim()
				? 'Aucun résultat'
				: 'Aucun favori'
			: isFiltering
				? 'Aucun résultat'
				: 'Aucun arbre enregistré'
	);
	let emptyMessage = $derived(
		filter === 'favorites'
			? query.trim()
				? `Aucun favori pour « ${query.trim()} »`
				: 'Marquez des arbres en favori depuis leur fiche détail.'
			: query.trim()
				? `Aucun résultat pour « ${query.trim()} »`
				: 'Commencez votre repérage en ajoutant votre premier yamadori.'
	);

	function handleExport() {
		exportTreesCsv(allTrees);
	}
</script>

<svelte:head>
	<title>Liste — Yamadori Scouting</title>
</svelte:head>

<div class="flex flex-col gap-4">
	{#if treeStore.trees.length > 0}
		<div class="flex items-center gap-3">
			<div class="min-w-0 flex-1">
				<SearchBar bind:value={query} />
			</div>
			<button
				type="button"
				onclick={handleExport}
				class="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-forest-800 transition active:scale-[0.98]"
				aria-label="Exporter en CSV"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="h-4 w-4"
					aria-hidden="true"
				>
					<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
				</svg>
				Exporter
			</button>
		</div>

		<FilterChips bind:value={filter} />
		<SortSelect bind:value={sortKey} />

		{#if needsUserPosition(sortKey)}
			<p class="text-sm text-muted">
				{#if userPositionState.position}
					Tri par distance depuis votre position actuelle.
				{:else if userPositionState.error}
					{userPositionState.error}
				{:else}
					Recherche de votre position GPS…
				{/if}
			</p>
		{/if}
	{/if}

	<TreeList {trees} {distanceByTreeId} {emptyTitle} {emptyMessage} />
</div>
