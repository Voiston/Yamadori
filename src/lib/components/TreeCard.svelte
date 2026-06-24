<script lang="ts">

	import { getCoverPhoto } from '$lib/types/tree';

	import type { Tree } from '$lib/types/tree';

	import { base } from '$app/paths';

	import { formatDate } from '$lib/utils/date';

	import { formatAltitudeLabel } from '$lib/utils/altitude';

	import { hasApproximateGps } from '$lib/utils/gps';

	import { speciesDisplayName } from '$lib/constants/species-i18n';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import * as m from '$lib/paraglide/messages.js';



	let { tree, distanceMeters = null }: { tree: Tree; distanceMeters?: number | null } = $props();



	let coverPhoto = $derived(getCoverPhoto(tree));

	let displayLabel = $derived.by(() => {

		void appearanceSettingsState.locale;

		const raw = tree.species.trim();

		return raw ? speciesDisplayName(raw) : m.tree_species_unset();

	});



	let showApproxBadge = $derived(

		hasApproximateGps(tree.latitude, tree.longitude, tree.accuracyMeters)

	);

</script>



<a

	href="{base}/tree/{tree.id}"

	class="block transition active:scale-[0.98]"

	aria-label={m.tree_view_detail({ label: displayLabel })}

>

	<article

		class="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition"

	>

		<div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">

			{#if coverPhoto}

				<img

					src={coverPhoto}

					alt={m.tree_visit_photo_alt()}

					class="h-full w-full object-cover"

				/>

			{:else}

				<div class="flex h-full w-full items-center justify-center text-forest-600">

					<svg

						xmlns="http://www.w3.org/2000/svg"

						viewBox="0 0 24 24"

						fill="currentColor"

						class="h-8 w-8 opacity-40"

						aria-hidden="true"

					>

						<path

							d="M12 2C8.5 2 6 4.5 6 8c0 2 1 3.8 2.5 5-2.5 1.2-4.5 4-4.5 7.5 0 4.1 3.4 7.5 7.5 7.5s7.5-3.4 7.5-7.5c0-3.5-2-6.3-4.5-7.5C17 11.8 18 10 18 8c0-3.5-2.5-6-6-6z"

						/>

					</svg>

				</div>

			{/if}

		</div>



		<div class="min-w-0 flex-1">

			<div class="flex items-center gap-1.5">

				{#if tree.isFavorite}

					<svg

						xmlns="http://www.w3.org/2000/svg"

						viewBox="0 0 24 24"

						fill="currentColor"

						class="h-4 w-4 shrink-0 text-amber-500"

						aria-label={m.tree_favorite()}

					>

						<path

							d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"

						/>

					</svg>

				{/if}

				<h2 class="truncate text-lg font-semibold text-forest-900">{displayLabel}</h2>

				{#if showApproxBadge}

					<span

						class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"

					>

						~approx.

					</span>

				{/if}

			</div>

			<p class="mt-0.5 text-sm text-muted">{formatDate(tree.capturedAt)}</p>

			{#if tree.latitude !== null && tree.longitude !== null}

				<p class="mt-1 truncate text-xs text-forest-600">

					{#if tree.locationLabel}

						{tree.locationLabel}

					{:else}

						{tree.latitude.toFixed(5)}, {tree.longitude.toFixed(5)}

					{/if}

					{#if formatAltitudeLabel(tree.altitudeMeters)}

						· {formatAltitudeLabel(tree.altitudeMeters)}

					{/if}

					{#if distanceMeters !== null}

						· {distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(1)} km`}

					{/if}

				</p>

			{/if}

		</div>

	</article>

</a>

