<script lang="ts">

	import { getCoverPhotoThumb } from '$lib/types/tree';

	import type { Tree } from '$lib/types/tree';

	import { base } from '$app/paths';

	import { formatDate } from '$lib/utils/date';

	import { formatAltitudeLabel } from '$lib/utils/altitude';

	import { hasApproximateGps } from '$lib/utils/gps';

	import { speciesDisplayName } from '$lib/constants/species-i18n';

	import { getAssessmentSummary } from '$lib/constants/assessment';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import * as m from '$lib/paraglide/messages.js';
	import { openProPaywall } from '$lib/stores/proPaywall.svelte';
	import AppLogoImage from './AppLogoImage.svelte';



	let { tree, distanceMeters = null, locked = false }: { tree: Tree; distanceMeters?: number | null; locked?: boolean } = $props();



	let coverPhoto = $derived(getCoverPhotoThumb(tree));

	let displayLabel = $derived.by(() => {

		void appearanceSettingsState.locale;

		const raw = tree.species.trim();

		return raw ? speciesDisplayName(raw) : m.tree_species_unset();

	});

	let coverPhotoAlt = $derived.by(() => {
		void appearanceSettingsState.locale;
		return `${m.photo_label()} — ${displayLabel}`;
	});

	let assessmentSummary = $derived.by(() => {

		void appearanceSettingsState.locale;

		return tree.assessment ? getAssessmentSummary(tree.assessment) : '';

	});



	let showApproxBadge = $derived(

		hasApproximateGps(tree.latitude, tree.longitude, tree.accuracyMeters)

	);

</script>



{#if locked}
	<button
		type="button"
		class="relative block w-full rounded-xl text-left transition active:scale-[0.98]"
		aria-label={m.pro_tree_locked()}
		onclick={() => openProPaywall('tree_locked')}
	>
		<article
			class="pointer-events-none flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm blur-[3px] select-none narrow:gap-3 narrow:p-3"
			aria-hidden="true"
		>
			{@render cardContent()}
		</article>
		<div
			class="absolute inset-0 flex items-center justify-center rounded-xl bg-white/30"
			aria-hidden="true"
		>
			<span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
				{m.pro_upgrade_cta()}
			</span>
		</div>
	</button>
{:else}
<a

	href="{base}/tree/{tree.id}"

	class="block transition active:scale-[0.98]"

	aria-label={m.tree_view_detail({ label: displayLabel })}

>

	<article

		class="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition narrow:gap-3 narrow:p-3"

	>

		{@render cardContent()}

	</article>

</a>
{/if}

{#snippet cardContent()}
		<div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">

			{#if coverPhoto}

				<img

					src={coverPhoto}

					alt={coverPhotoAlt}

					class="h-full w-full object-cover"

					loading="lazy"

					decoding="async"

				/>

			{:else}

				<AppLogoImage class="h-full w-full object-cover" />

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

				<h2 class="truncate text-lg font-semibold text-forest-900 narrow:text-base">{displayLabel}</h2>

				{#if showApproxBadge}

					<span

						class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"

					>

						{m.tree_approx_badge()}

					</span>

				{/if}

			</div>

			<p class="mt-0.5 text-sm text-muted">{formatDate(tree.capturedAt)}</p>

			{#if assessmentSummary}

				<span

					class="mt-1 inline-block rounded-full bg-forest-50 px-2 py-0.5 text-xs font-medium text-forest-800"

				>

					{assessmentSummary}

				</span>

			{/if}

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
{/snippet}

