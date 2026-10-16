<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { ClimateHistory } from '$lib/types/climate';
	import { formatCalendarDate } from '$lib/utils/i18n/format';
	import * as m from '$lib/paraglide/messages.js';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { climateErrorCopy } from '$lib/utils/errorCopy';

	type ClimateMetric = 'min' | 'rain' | 'frost';

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

	let openMetric = $state<ClimateMetric | null>(null);
	const detailId = 'climate-metric-detail';

	const periodLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!climate) return '';
		const start = formatCalendarDate(climate.startDate);
		const end = formatCalendarDate(climate.endDate);
		if (!start || !end) return `${climate.startDate} → ${climate.endDate}`;
		return `${start} → ${end}`;
	});

	const metricCopy = $derived.by(() => {
		void appearanceSettingsState.locale;
		return {
			min: { title: m.climate_min_temp(), hint: m.climate_min_temp_hint() },
			rain: { title: m.climate_precipitation(), hint: m.climate_precipitation_hint() },
			frost: { title: m.climate_frost_days(), hint: '' }
		};
	});

	const openCopy = $derived(openMetric ? metricCopy[openMetric] : null);

	const precipValue = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!climate) return '';
		return m.climate_precip_annual({ n: String(climate.avgAnnualPrecipitationMm) });
	});

	const showRetry = $derived(!loading && (!climate || !!error) && !!onretry);

	const iconClass = 'h-5 w-5 text-forest-700';

	function toggleMetric(metric: ClimateMetric): void {
		openMetric = openMetric === metric ? null : metric;
	}

	function onWindowKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && openMetric) openMetric = null;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#snippet iconSnowflake()}
	<svg
		class={iconClass}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="m10 20-1.25-2.5L6 18" />
		<path d="M10 4 8.75 6.5 6 6" />
		<path d="m14 20 1.25-2.5L18 18" />
		<path d="m14 4 1.25 2.5L18 6" />
		<path d="m17 21-3-6h-4" />
		<path d="m17 3-3 6 1.5 3" />
		<path d="M2 12h6.5L10 9" />
		<path d="m20 10-1.5 2 1.5 2" />
		<path d="M22 12h-6.5L14 15" />
		<path d="m4 10 1.5 2L4 14" />
		<path d="m7 21 3-6-1.5-3" />
		<path d="m7 3 3 6h4" />
	</svg>
{/snippet}

{#snippet iconDroplet()}
	<svg
		class={iconClass}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path
			d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"
		/>
	</svg>
{/snippet}

{#snippet iconThermometer()}
	<svg
		class={iconClass}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
	</svg>
{/snippet}

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
			class="app-card-muted mt-3 p-2"
			role="status"
			aria-busy="true"
			aria-label={m.climate_analyzing()}
		>
			<div class="flex gap-1">
				{#each [0, 1, 2] as i (i)}
					<div class="flex min-h-11 flex-1 flex-col items-center justify-center gap-1.5 py-1">
						<Skeleton class="h-9 w-9 rounded-full" decorative />
						<Skeleton class="h-3 w-10" decorative />
					</div>
				{/each}
			</div>
		</div>
	{:else if climate}
		<p class="mt-1 text-sm text-muted">
			{periodLabel}
		</p>

		<div class="app-card-muted mt-3 p-2">
			<div class="flex gap-1">
				<button
					type="button"
					class="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 transition active:scale-[0.98] {openMetric ===
					'min'
						? 'ring-2 ring-forest-600/30'
						: ''}"
					aria-expanded={openMetric === 'min'}
					aria-controls={openMetric === 'min' ? detailId : undefined}
					aria-label={metricCopy.min.title}
					onclick={() => toggleMetric('min')}
				>
					<span
						class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white"
					>
						{@render iconSnowflake()}
					</span>
					<span class="px-0.5 text-center text-sm font-semibold leading-tight text-forest-800">
						{climate.absoluteMinTempC}°C
					</span>
				</button>
				<button
					type="button"
					class="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 transition active:scale-[0.98] {openMetric ===
					'rain'
						? 'ring-2 ring-forest-600/30'
						: ''}"
					aria-expanded={openMetric === 'rain'}
					aria-controls={openMetric === 'rain' ? detailId : undefined}
					aria-label={metricCopy.rain.title}
					onclick={() => toggleMetric('rain')}
				>
					<span
						class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white"
					>
						{@render iconDroplet()}
					</span>
					<span class="px-0.5 text-center text-sm font-semibold leading-tight text-forest-800">
						{precipValue}
					</span>
				</button>
				<button
					type="button"
					class="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 transition active:scale-[0.98] {openMetric ===
					'frost'
						? 'ring-2 ring-forest-600/30'
						: ''}"
					aria-expanded={openMetric === 'frost'}
					aria-controls={openMetric === 'frost' ? detailId : undefined}
					aria-label={metricCopy.frost.title}
					onclick={() => toggleMetric('frost')}
				>
					<span
						class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white"
					>
						{@render iconThermometer()}
					</span>
					<span class="px-0.5 text-center text-sm font-semibold leading-tight text-forest-800">
						{climate.avgFrostDaysPerYear}
					</span>
				</button>
			</div>

			{#if openCopy}
				<div id={detailId} class="border-t border-gray-100 px-3 py-2" role="region" aria-label={openCopy.title}>
					<p class="text-sm font-medium text-forest-900">{openCopy.title}</p>
					{#if openMetric === 'frost' && climate.yearlyStats.length > 0}
						<ul class="mt-1.5 flex flex-col gap-1">
							{#each climate.yearlyStats as year (year.year)}
								<li class="flex items-baseline justify-between gap-3 text-sm">
									<span class="text-muted">{year.year}</span>
									<span class="font-medium text-forest-800">
										{m.climate_frost_year({ days: String(year.frostDays) })}
									</span>
								</li>
							{/each}
						</ul>
					{:else if openCopy.hint}
						<p class="mt-0.5 text-xs leading-relaxed text-muted">{openCopy.hint}</p>
					{/if}
				</div>
			{/if}
		</div>
	{:else if error}
		<ErrorBanner copy={climateErrorCopy()} tone="warning" onretry={onretry} />
	{:else}
		<p class="mt-3 text-sm text-muted" role="status">
			{m.tree_climate_unavailable()} — {m.climate_online_required().toLowerCase()}
		</p>
	{/if}

	{#if showRetry && !error}
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
