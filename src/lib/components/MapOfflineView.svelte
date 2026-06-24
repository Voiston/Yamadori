<script lang="ts">

	import { base } from '$app/paths';

	import ParkingPanel from '$lib/components/ParkingPanel.svelte';

	import { parkingStore } from '$lib/stores/parking.svelte';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import { getTreeById, treesWithGps } from '$lib/stores/trees.svelte';

	import { getTreeDisplayLabel } from '$lib/types/tree';

	import { formatDistance, haversineDistanceM } from '$lib/utils/haversine';

	import * as m from '$lib/paraglide/messages.js';

	import { requestCurrentPosition, userPositionState } from '$lib/utils/userPosition.svelte';

	import { onMount } from 'svelte';



	let {

		focusTreeId

	}: {

		focusTreeId?: string;

	} = $props();



	const compassLabel = $derived.by(() => {

		void appearanceSettingsState.locale;

		return m.onboarding_compass_title().replace(/\s*\([^)]*\)$/, '');

	});



	onMount(() => {
		void requestCurrentPosition('proximity');
	});



	let focusTree = $derived(focusTreeId ? getTreeById(focusTreeId) : undefined);

	let focusHasGps = $derived(

		focusTree !== undefined &&

			focusTree.latitude !== null &&

			focusTree.longitude !== null

	);



	let nearestTrees = $derived.by(() => {

		void appearanceSettingsState.locale;

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



	let treesHeading = $derived.by(() => {

		void appearanceSettingsState.locale;

		return userPositionState.position ? m.map_nearest_trees() : m.map_geolocated_trees();

	});

</script>



<div

	class="flex h-[calc(100dvh-3.5rem-4rem)] min-h-[320px] flex-col gap-4 overflow-y-auto px-4 py-6"

>

	<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">

		<p class="font-semibold">{m.feedback_map_offline()}</p>

		<p class="mt-1 text-amber-800">

			{m.geocode_online_required()} {m.settings_offline_tip_1()}. {m.onboarding_compass_desc()}

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

			{m.title_parking()}

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

			{compassLabel} — {getTreeDisplayLabel(focusTree)}

		</a>

	{/if}



	{#if nearestTrees.length > 0}

		<section>

			<h2 class="mb-3 text-sm font-semibold text-forest-900">

				{treesHeading}

			</h2>

			<ul class="space-y-2">

				{#each nearestTrees as { tree, distance } (tree.id)}

					<li>

						<a

							href="{base}/tree/{tree.id}/compass"

							class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 transition active:scale-[0.98]"

						>

							<span class="font-medium text-forest-900">{getTreeDisplayLabel(tree)}</span>

							<span class="text-sm text-muted">

								{#if distance !== null}

									{formatDistance(distance)}

								{:else}

									{compassLabel}

								{/if}

							</span>

						</a>

					</li>

				{/each}

			</ul>

		</section>

	{:else}

		<p class="text-center text-sm text-muted">

			{m.gps_no_coords_saved()}

		</p>

	{/if}



	{#if userPositionState.error}

		<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">

			{userPositionState.error}

		</p>

	{/if}

</div>

