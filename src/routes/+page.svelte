<script lang="ts">
	import FilterChips, { type ListFilter } from '$lib/components/FilterChips.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SortSelect from '$lib/components/SortSelect.svelte';
	import TreeList from '$lib/components/TreeList.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import BackupReminderCard from '$lib/components/BackupReminderCard.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { treeStore } from '$lib/stores/trees.svelte';
	import { parkingStore } from '$lib/stores/parking.svelte';
	import { refreshWeekWindow, weekWindowState } from '$lib/stores/weekWindow.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { Tree } from '$lib/types/tree';
	import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';
	import { haversineDistanceM } from '$lib/utils/haversine';
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
	import { WEEK_WINDOW_PREVIEW_LIMIT } from '$lib/utils/weekWindow';
	import {
		dismissBackupReminder,
		getActiveBackupWarning,
		shouldShowBackupHomeCard
	} from '$lib/utils/backupReminder.svelte';

	const SEARCH_DEBOUNCE_MS = 200;
	const SORT_DISTANCE_MIN_MOVE_M = POOR_ACCURACY_THRESHOLD_M;

	let query = $state('');
	let debouncedQuery = $state('');
	let filter = $state<ListFilter>('all');
	let sortKey = $state<SortKey>('date_desc');
	let stableSortPosition = $state<{ latitude: number; longitude: number } | null>(null);

	$effect(() => {
		if (!treeStore.loaded) return;
		void refreshWeekWindow(treeStore.trees);
	});

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
		const matchesFilter =
			filter === 'all' ||
			(filter === 'favorites' && tree.isFavorite) ||
			(filter === 'window' && Boolean(weekWindowState.byId[tree.id]));
		return matchesQuery && matchesFilter;
	}

	function treesInWindowOrder(source: Tree[]): Tree[] {
		const byId = new Map(source.map((tree) => [tree.id, tree]));
		const ordered: Tree[] = [];
		for (const id of weekWindowState.orderedIds) {
			const tree = byId.get(id);
			if (tree) ordered.push(tree);
		}
		return ordered;
	}

	let showWeekSection = $derived(
		filter === 'all' &&
			debouncedQuery.trim().length === 0 &&
			weekWindowState.orderedIds.length > 0
	);

	let weekPreviewTrees = $derived.by(() => {
		if (!showWeekSection) return [] as Tree[];
		const accessible = treeStore.trees;
		const byId = new Map(accessible.map((tree) => [tree.id, tree]));
		const preview: Tree[] = [];
		for (const id of weekWindowState.orderedIds.slice(0, WEEK_WINDOW_PREVIEW_LIMIT)) {
			const tree = byId.get(id);
			if (tree) preview.push(tree);
		}
		return preview;
	});

	let listState = $derived.by(() => {
		const sourceTrees = treeStore.trees;
		const normalizedQuery = debouncedQuery.trim().toLowerCase();
		const useDistanceSort = needsUserPosition(sortKey);
		const sortPosition = useDistanceSort ? (stableSortPosition ?? undefined) : undefined;
		const distanceMap = sortPosition ? buildTreeDistanceMap(sourceTrees, sortPosition) : undefined;
		const windowIdSet = new Set(weekWindowState.orderedIds);

		let sorted: Tree[];
		if (filter === 'window') {
			const candidates = sourceTrees.filter((tree) => treeMatchesFilters(tree, normalizedQuery));
			sorted = treesInWindowOrder(candidates);
		} else if (normalizedQuery && useDistanceSort) {
			const candidates = sourceTrees.filter((tree) => treeMatchesFilters(tree, normalizedQuery));
			sorted = sortTrees(candidates, sortKey, sortPosition, distanceMap);
		} else {
			sorted = sortTrees(sourceTrees, sortKey, sortPosition, distanceMap);
		}

		let trees =
			filter === 'window' || (normalizedQuery && useDistanceSort)
				? sorted
				: sorted.filter((tree) => treeMatchesFilters(tree, normalizedQuery));

		if (showWeekSection) {
			trees = trees.filter((tree) => !windowIdSet.has(tree.id));
		}

		const distanceByTreeId: Record<string, number> = {};
		if (distanceMap && useDistanceSort) {
			for (const tree of trees) {
				const distance = distanceMap.get(tree.id);
				if (distance !== undefined) {
					distanceByTreeId[tree.id] = distance;
				}
			}
			if (showWeekSection) {
				for (const tree of weekPreviewTrees) {
					const distance = distanceMap.get(tree.id);
					if (distance !== undefined) {
						distanceByTreeId[tree.id] = distance;
					}
				}
			}
		}

		return { trees, distanceByTreeId };
	});

	let trees = $derived(listState.trees);
	let distanceByTreeId = $derived(listState.distanceByTreeId);

	let isFiltering = $derived(
		debouncedQuery.trim().length > 0 || filter === 'favorites' || filter === 'window'
	);

	let emptyTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (filter === 'favorites') {
			return isFiltering && debouncedQuery.trim() ? m.list_no_results() : m.list_no_favorites();
		}
		if (filter === 'window') {
			return debouncedQuery.trim() ? m.list_no_results() : m.list_no_window();
		}
		return isFiltering ? m.list_no_results() : m.list_no_trees();
	});

	let emptyMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		const q = debouncedQuery.trim();
		if (filter === 'favorites') {
			return q ? m.list_no_favorites_for_query({ query: q }) : m.list_favorites_hint();
		}
		if (filter === 'window') {
			return q ? m.list_no_results_for_query({ query: q }) : m.list_no_window_hint();
		}
		return q ? m.list_no_results_for_query({ query: q }) : m.list_empty_hint();
	});

	let pageTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.title_list();
	});

	const backupWarning = $derived.by(() => {
		void appearanceSettingsState.locale;
		return treeStore.loaded && parkingStore.loaded
			? getActiveBackupWarning(treeStore.trees, parkingStore.position)
			: null;
	});
	const showBackupCard = $derived(shouldShowBackupHomeCard(backupWarning));
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="flex flex-col gap-3 md:gap-4">
	{#if showBackupCard && backupWarning}
		<BackupReminderCard
			warning={backupWarning}
			ondismiss={() => void dismissBackupReminder(backupWarning.reason)}
		/>
	{/if}

	{#if treeStore.trees.length > 0}
		<div class="flex min-w-0 items-center gap-3 narrow:gap-2">
			<FilterChips bind:value={filter} />
			<div class="min-w-0 flex-1">
				<SearchBar bind:value={query} compact />
			</div>
		</div>

		{#if filter !== 'window'}
			<SortSelect bind:value={sortKey} />

			{#if needsUserPosition(sortKey) && userPositionState.errorCopy}
				<ErrorBanner
					copy={userPositionState.errorCopy}
					tone="warning"
					onretry={() => void requestCurrentPosition()}
				/>
			{/if}
		{/if}
	{/if}

	{#if showWeekSection}
		<section class="flex flex-col gap-3" aria-labelledby="week-window-heading">
			<div class="flex items-baseline justify-between gap-3">
				<h2 id="week-window-heading" class="text-base font-semibold text-forest-900">
					{m.list_week_window_title()}
				</h2>
				{#if weekWindowState.orderedIds.length > WEEK_WINDOW_PREVIEW_LIMIT}
					<button
						type="button"
						class="text-sm font-medium text-forest-800 underline-offset-2 hover:underline"
						onclick={() => {
							filter = 'window';
						}}
					>
						{m.list_week_window_see_all()}
					</button>
				{/if}
			</div>
			<TreeList
				trees={weekPreviewTrees}
				{distanceByTreeId}
				showCaptureCta={false}
			/>
		</section>
	{/if}

	{#if trees.length > 0 || !showWeekSection}
		<TreeList
			{trees}
			{distanceByTreeId}
			{emptyTitle}
			{emptyMessage}
			emptyKind={isFiltering ? 'no-results' : 'first-use'}
			showCaptureCta={!isFiltering}
		>
			{#snippet emptyActions()}
				{#if debouncedQuery.trim()}
					<button
						type="button"
						class="btn-primary btn-primary--inline"
						onclick={() => {
							query = '';
							debouncedQuery = '';
						}}
					>
						{m.action_clear()}
					</button>
				{/if}
				{#if filter !== 'all'}
					<button
						type="button"
						class={debouncedQuery.trim()
							? 'text-sm font-medium text-forest-700 underline-offset-2 hover:underline'
							: 'btn-primary btn-primary--inline'}
						onclick={() => (filter = 'all')}
					>
						{m.list_see_all_trees()}
					</button>
				{/if}
			{/snippet}
		</TreeList>
	{/if}
</div>
