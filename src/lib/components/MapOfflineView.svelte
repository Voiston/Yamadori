<script lang="ts">
	import { base } from '$app/paths';
	import ParkingPanel from '$lib/components/ParkingPanel.svelte';
	import { parkingStore } from '$lib/stores/parking.svelte';
	import { getTreeById, treesWithGps } from '$lib/stores/trees.svelte';
	import { formatDistance, haversineDistanceM } from '$lib/utils/haversine';
	import {
		requestCurrentPosition,
		startWatchingPosition,
		stopWatchingPosition,
		userPositionState
	} from '$lib/utils/userPosition.svelte';
	import { onMount } from 'svelte';

	let {
		focusTreeId
	}: {
		focusTreeId?: string;
	} = $props();

	onMount(() => {
		void requestCurrentPosition();
		startWatchingPosition();
		return () => stopWatchingPosition();
	});

	let focusTree = $derived(focusTreeId ? getTreeById(focusTreeId) : undefined);
	let focusHasGps = $derived(
		focusTree !== undefined &&
			focusTree.latitude !== null &&
			focusTree.longitude !== null
	);

	let nearestTrees = $derived.by(() => {
		const trees = treesWithGps();
		const userPos = userPositionState.position;

		if (!userPos) {
			return trees.slice(0, 8).map((tree) => ({ tree, distance: null as number | null }));
		}

		return [...trees]
			.map((tree) => ({
				tree,
				distance: haversineDistanceM(
					userPos.latitude,
					userPos.longitude,
					tree.latitude!,
					tree.longitude!
				)
			}))
			.sort((a, b) => a.distance - b.distance)
			.slice(0, 8);
	});
</script>

<div
	class="flex h-[calc(100dvh-3.5rem-4rem)] min-h-[320px] flex-col gap-4 overflow-y-auto px-4 py-6 lg:h-[calc(100dvh-3.5rem)]"
>
	<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
		<p class="font-semibold">Carte indisponible hors-ligne</p>
		<p class="mt-1 text-amber-800">
			Les fonds topographiques et satellite IGN nécessitent une connexion. Utilisez la boussole
			pour vous orienter vers vos arbres en forêt.
		</p>
	</div>

	{#if parkingStore.position}
		<a
			href="{base}/parking/compass"
			class="flex h-14 items-center justify-center gap-2 rounded-xl bg-forest-800 text-sm font-semibold text-white transition active:scale-[0.98]"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-5 w-5"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<path d="M12 8l3 8-3-2-3 2 3-8z" fill="currentColor" stroke="none" />
			</svg>
			Retour au parking
		</a>
	{/if}

	<ParkingPanel variant="inline" />

	{#if focusHasGps && focusTree}
		<a
			href="{base}/tree/{focusTree.id}/compass"
			class="flex h-14 items-center justify-center gap-2 rounded-xl bg-forest-800 text-sm font-semibold text-white transition active:scale-[0.98]"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-5 w-5"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<path d="M12 8l3 8-3-2-3 2 3-8z" fill="currentColor" stroke="none" />
			</svg>
			Ouvrir la boussole — {focusTree.species}
		</a>
	{/if}

	{#if nearestTrees.length > 0}
		<section>
			<h2 class="mb-3 text-sm font-semibold text-forest-900">
				{userPositionState.position ? 'Arbres les plus proches' : 'Arbres géolocalisés'}
			</h2>
			<ul class="space-y-2">
				{#each nearestTrees as { tree, distance } (tree.id)}
					<li>
						<a
							href="{base}/tree/{tree.id}/compass"
							class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 transition active:scale-[0.98]"
						>
							<span class="font-medium text-forest-900">{tree.species}</span>
							<span class="text-sm text-muted">
								{#if distance !== null}
									{formatDistance(distance)}
								{:else}
									Boussole
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{:else}
		<p class="text-center text-sm text-muted">
			Aucun arbre géolocalisé — activez le GPS lors de la capture.
		</p>
	{/if}

	{#if userPositionState.error}
		<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
			{userPositionState.error}
		</p>
	{/if}
</div>
