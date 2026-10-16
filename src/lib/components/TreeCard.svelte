<script lang="ts">
	import { getCoverPhotoThumb } from '$lib/types/tree';
	import type { Tree } from '$lib/types/tree';
	import { resolve } from '$app/paths';
	import { formatDate } from '$lib/utils/date';
	import { formatDistance } from '$lib/utils/haversine';
	import { hasApproximateGps } from '$lib/utils/gps';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { weekWindowState } from '$lib/stores/weekWindow.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { calendarDaysUntil, revisitDateStatus } from '$lib/utils/revisit';
	import AppLogoImage from './AppLogoImage.svelte';

	let {
		tree,
		distanceMeters = null
	}: {
		tree: Tree;
		distanceMeters?: number | null;
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

	let showApproxBadge = $derived(
		hasApproximateGps(tree.latitude, tree.longitude, tree.accuracyMeters)
	);

	let distanceLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (distanceMeters === null) return '';
		return formatDistance(distanceMeters);
	});

	let windowEntry = $derived(weekWindowState.byId[tree.id]);

	let showYrsWindowBadge = $derived.by(() => {
		void appearanceSettingsState.simpleMode;
		if (!windowEntry || appearanceSettingsState.simpleMode) {
			return false;
		}
		return windowEntry.rank === 'optimal' || windowEntry.rank === 'acceptable';
	});

	let yrsWindowLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!showYrsWindowBadge || !windowEntry) return '';
		return windowEntry.rank === 'optimal' ? m.week_window_optimal() : m.week_window_acceptable();
	});

	let revisitStatus = $derived(revisitDateStatus(tree.nextRevisitAt));

	let revisitDueLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (revisitStatus === 'overdue') return m.revisit_overdue();
		if (revisitStatus === 'today') return m.revisit_due_today();
		if (revisitStatus === 'soon') {
			const days = calendarDaysUntil(tree.nextRevisitAt);
			if (days === 1) return m.revisit_in_one_day();
			if (days !== null) return m.revisit_in_days({ count: String(days) });
		}
		return '';
	});

	let statusChip = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (revisitDueLabel) {
			return {
				text: revisitDueLabel,
				className:
					revisitStatus === 'overdue' ? 'bg-amber-100 text-amber-800' : 'bg-sky-50 text-sky-900'
			};
		}
		if (yrsWindowLabel) {
			return {
				text: yrsWindowLabel,
				className:
					windowEntry?.rank === 'optimal'
						? 'bg-emerald-50 text-emerald-800'
						: 'bg-amber-50 text-amber-900'
			};
		}
		if (showApproxBadge) {
			return { text: m.tree_approx_badge(), className: 'bg-amber-100 text-amber-800' };
		}
		return null;
	});

	let metaLine = $derived.by(() => {
		void appearanceSettingsState.locale;
		const parts = [formatDate(tree.capturedAt)];
		if (distanceLabel) parts.push(distanceLabel);
		if (tree.locationLabel) parts.push(tree.locationLabel);
		return parts.join(' · ');
	});
</script>

<a
	href={resolve('/tree/[id]', { id: tree.id })}
	class="block transition active:scale-[0.98]"
	aria-label={m.tree_view_detail({ label: displayLabel })}
>
	<article class="app-card flex items-center gap-4 p-4 narrow:gap-3 narrow:p-3">
		{@render cardContent()}
	</article>
</a>

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

		<div class="mt-0.5 flex min-w-0 items-center gap-2">
			{#if statusChip}
				<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium {statusChip.className}">
					{statusChip.text}
				</span>
			{/if}
			<p class="min-w-0 truncate text-sm text-muted">{metaLine}</p>
		</div>
	</div>
{/snippet}
