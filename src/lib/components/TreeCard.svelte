<script lang="ts">
	import { getCoverPhotoThumb } from '$lib/types/tree';
	import type { Tree } from '$lib/types/tree';
	import { resolve } from '$app/paths';
	import { formatDate } from '$lib/utils/date';
	import { formatDistance } from '$lib/utils/haversine';
	import { formatAltitudeLabel } from '$lib/utils/altitude';
	import { hasApproximateGps } from '$lib/utils/gps';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import { getAssessmentSummary } from '$lib/constants/assessment';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { openProPaywall } from '$lib/stores/proPaywall.svelte';
	import AppLogoImage from './AppLogoImage.svelte';

	let {
		tree,
		distanceMeters = null,
		locked = false
	}: {
		tree: Tree;
		distanceMeters?: number | null;
		locked?: boolean;
	} = $props();

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

	let distanceLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (distanceMeters === null) return '';
		return formatDistance(distanceMeters);
	});
</script>

{#if locked}
	<button
		type="button"
		class="relative block w-full text-left transition active:scale-[0.98]"
		aria-label={m.pro_tree_locked()}
		onclick={() => openProPaywall('tree_locked')}
	>
		<article
			class="app-card pointer-events-none flex items-center gap-4 p-4 opacity-60 select-none narrow:gap-3 narrow:p-3"
			aria-hidden="true"
		>
			{@render cardContent()}
		</article>
		<div
			class="absolute inset-0 flex flex-col items-end justify-end gap-1 rounded-[var(--radius-card)] p-3"
			aria-hidden="true"
		>
			<p class="max-w-[85%] rounded-lg bg-white/90 px-2 py-1 text-right text-[10px] font-medium leading-snug text-forest-800 shadow-sm">
				{m.pro_tree_locked_access_hint()}
			</p>
			<span class="pro-badge pro-badge--on-light shadow-sm">{m.pro_upgrade_cta()}</span>
		</div>
	</button>
{:else}
	<a
		href={resolve('/tree/[id]', { id: tree.id })}
		class="block transition active:scale-[0.98]"
		aria-label={m.tree_view_detail({ label: displayLabel })}
	>
		<article class="app-card flex items-center gap-4 p-4 narrow:gap-3 narrow:p-3">
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
		<div class="flex min-w-0 items-center gap-1.5">
			{#if tree.isFavorite}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="h-3.5 w-3.5 shrink-0 text-amber-500"
					aria-label={m.tree_favorite()}
				>
					<path
						d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
					/>
				</svg>
			{/if}
			<h2 class="truncate text-lg font-semibold text-forest-900 narrow:text-base">{displayLabel}</h2>
			{#if tree.voiceNote}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="h-3.5 w-3.5 shrink-0 text-forest-700"
					aria-label={m.voice_note()}
				>
					<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
					<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
					<line x1="12" y1="19" x2="12" y2="22" />
				</svg>
			{/if}
		</div>

		<div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
			<p class="text-sm text-muted">{formatDate(tree.capturedAt)}</p>
			{#if showApproxBadge}
				<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
					{m.tree_approx_badge()}
				</span>
			{/if}
			{#if assessmentSummary}
				<span
					class="rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-medium text-forest-800"
				>
					{assessmentSummary}
				</span>
			{/if}
		</div>

		{#if tree.latitude !== null && tree.longitude !== null}
			<p class="mt-1 truncate text-xs text-muted">
				{#if tree.locationLabel}
					{tree.locationLabel}
				{:else}
					{tree.latitude.toFixed(5)}, {tree.longitude.toFixed(5)}
				{/if}
				{#if formatAltitudeLabel(tree.altitudeMeters)}
					· {formatAltitudeLabel(tree.altitudeMeters)}
				{/if}
				{#if distanceLabel}
					· {distanceLabel}
				{/if}
			</p>
		{/if}
	</div>
{/snippet}
