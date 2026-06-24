<script lang="ts">
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
			climate?.yearlyStats.map((year) => `${year.frostDays} j · ${year.year}`).join(' · ') ?? ''
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
		<div class="mt-4 flex items-center gap-3 text-sm text-muted" role="status">
			<svg
				class="h-5 w-5 animate-spin text-forest-600"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
				></path>
			</svg>
			{m.climate_analyzing()}
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
					{climate.avgAnnualPrecipitationMm} mm/an
				</p>
				<p class="mt-1 text-xs text-muted">{m.climate_precipitation_hint()}</p>
			</article>

			<article class="rounded-lg bg-amber-50 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">☀️ {m.climate_frost_days()}</p>
				<p class="mt-1 text-base font-semibold text-forest-800">{frostYearLabels}</p>
				<p class="mt-1 text-xs text-muted">
					Moyenne : {climate.avgFrostDaysPerYear} jours/an
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
