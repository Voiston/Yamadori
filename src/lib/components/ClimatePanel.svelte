<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { ClimateHistory } from '$lib/types/climate';
	import * as m from '$lib/paraglide/messages.js';

	let {
		climate = null,
		loading = false,
		error = '',
		approximate = false,
		offline = false,
		onretry
	}: {
		climate?: ClimateHistory | null;
		loading?: boolean;
		error?: string;
		approximate?: boolean;
		offline?: boolean;
		onretry?: () => void;
	} = $props();

	const frostYearLabels = $derived.by(() => {
		void appearanceSettingsState.locale;
		return (
			climate?.yearlyStats
				.map((year) =>
					m.climate_frost_year({ days: String(year.frostDays), year: String(year.year) })
				)
				.join(' · ') ?? ''
		);
	});

	const showRetry = $derived(!loading && (!climate || !!error) && !!onretry);
</script>

<div>
	<h4 class="text-sm font-medium text-forest-900">{m.climate_history_title()}</h4>

	{#if approximate}
		<p class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
			{m.climate_approximate()}
		</p>
	{/if}

	{#if offline && !climate && !loading}
		<p class="mt-3 text-sm text-muted" role="status">{m.climate_online_required()}</p>
	{:else if loading}
		<div
			class="mt-4 flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-3"
			role="status"
			aria-busy="true"
			aria-label={m.climate_analyzing()}
		>
			{#each [0, 1, 2] as i (i)}
				<div class="rounded-lg bg-forest-50/60 px-4 py-3">
					<Skeleton class="h-3.5 w-24" decorative />
					<Skeleton class="mt-2 h-8 w-16" decorative />
					<Skeleton class="mt-2 h-3 w-full" decorative />
				</div>
			{/each}
		</div>
	{:else if climate}
		<p class="mt-1 text-xs text-muted">
			{climate.startDate} → {climate.endDate}
		</p>

		<div class="mt-4 flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-3">
			<article class="rounded-lg bg-sky-50 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">❄️ {m.climate_min_temp()}</p>
				<p class="mt-1 text-2xl font-semibold text-forest-800">
					{climate.absoluteMinTempC}°C
				</p>
				<p class="mt-1 text-xs text-muted">{m.climate_min_temp_hint()}</p>
			</article>

			<article class="rounded-lg bg-blue-50 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">🌧️ {m.climate_precipitation()}</p>
				<p class="mt-1 text-2xl font-semibold text-forest-800">
					{m.climate_precip_annual({ n: String(climate.avgAnnualPrecipitationMm) })}
				</p>
				<p class="mt-1 text-xs text-muted">{m.climate_precipitation_hint()}</p>
			</article>

			<article class="rounded-lg bg-amber-50 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">☀️ {m.climate_frost_days()}</p>
				<p class="mt-1 text-base font-semibold text-forest-800">{frostYearLabels}</p>
				<p class="mt-1 text-xs text-muted">
					{m.climate_frost_average({ days: String(climate.avgFrostDaysPerYear) })}
				</p>
			</article>
		</div>
	{:else if error}
		<p class="mt-3 text-sm text-amber-700" role="alert">{error}</p>
	{:else}
		<p class="mt-3 text-sm text-muted" role="status">
			{m.tree_climate_unavailable()} — {m.climate_online_required().toLowerCase()}
		</p>
	{/if}

	{#if showRetry}
		<button
			type="button"
			data-capture-action="climate-retry"
			class="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-forest-800 transition active:scale-[0.98]"
			onclick={onretry}
		>
			{m.action_retry()}
		</button>
	{/if}
</div>
