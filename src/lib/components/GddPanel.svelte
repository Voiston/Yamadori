<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { getGddBaseCategoryLabels, getGddSeasonZone } from '$lib/constants/gdd-config';
	import { getGdd7dMetricHelp, getGddMetricHelp } from '$lib/constants/gdd-metric-help';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import { agriData } from '$lib/stores/agriData.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { getGddSeasonStartDate } from '$lib/utils/openMeteoArchive';
	import {
		formatYrsPoints,
		getYrsPointsClass,
		type YrsScoreBreakdownItem
	} from '$lib/utils/yrs';
	import GddSparkline from './GddSparkline.svelte';
	import * as m from '$lib/paraglide/messages.js';

	type GddMetric = 'season' | 'week';

	let {
		species = '',
		loading = false,
		offline = false,
		scoreItem = null
	}: {
		species?: string;
		loading?: boolean;
		offline?: boolean;
		scoreItem?: YrsScoreBreakdownItem | null;
	} = $props();

	let gddHelpOpen = $state(false);
	let gdd7dHelpOpen = $state(false);
	let openMetric = $state<GddMetric | null>(null);
	const gddHelpId = 'gdd-metric-help';
	const gdd7dHelpId = 'gdd-7d-metric-help';
	const detailId = 'gdd-metric-detail';

	const data = $derived(agriData.data);
	const gdd = $derived(data?.gdd ?? null);
	const agriLoading = $derived(agriData.loading || loading);
	const fromCache = $derived(agriData.source === 'cache');

	const gddMetricHelp = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getGddMetricHelp();
	});

	const gdd7dMetricHelp = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getGdd7dMetricHelp();
	});

	const baseCategoryLabels = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getGddBaseCategoryLabels();
	});

	const baseCategoryLabel = $derived(gdd ? baseCategoryLabels[gdd.baseCategory] : '');

	const speciesDisplay = $derived.by(() => {
		void appearanceSettingsState.locale;
		const raw = gdd?.speciesLabel || species.trim();
		return raw ? speciesDisplayName(raw) : null;
	});

	const seasonZone = $derived(
		gdd ? getGddSeasonZone(gdd.cumulativeSinceJan1, gdd.baseCategory) : null
	);

	const seasonZoneClass = $derived(
		seasonZone?.tone === 'good'
			? 'text-emerald-800'
			: seasonZone?.tone === 'warn'
				? 'text-amber-800'
				: 'text-muted'
	);

	const seasonStartLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!data) return '';
		const start = getGddSeasonStartDate(
			data.fetchedAt ? new Date(data.fetchedAt) : new Date(),
			data.latitude
		);
		return data.latitude < 0
			? m.gdd_season_start_july({ date: start })
			: m.gdd_season_start_jan({ date: start });
	});

	const gddBaseTempLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return gdd ? m.gdd_base_temp({ temp: String(gdd.baseTempC) }) : '';
	});

	const seasonValue = $derived.by(() => {
		void appearanceSettingsState.locale;
		return gdd ? m.gdd_degrees_days({ value: gdd.cumulativeSinceJan1 }) : '';
	});

	const weekValue = $derived.by(() => {
		void appearanceSettingsState.locale;
		return gdd ? m.gdd_degrees_days({ value: gdd.last7dSum }) : '';
	});

	const seasonTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.gdd_cumulative();
	});

	const iconClass = 'h-5 w-5 text-forest-700';

	function toggleMetric(metric: GddMetric): void {
		openMetric = openMetric === metric ? null : metric;
		if (openMetric !== 'week') gdd7dHelpOpen = false;
	}

	function onWindowKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;
		if (gdd7dHelpOpen) {
			gdd7dHelpOpen = false;
			return;
		}
		if (openMetric) openMetric = null;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#snippet iconTrend()}
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
		<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
		<polyline points="16 7 22 7 22 13" />
	</svg>
{/snippet}

{#snippet iconCalendar()}
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
		<path d="M8 2v4" />
		<path d="M16 2v4" />
		<rect width="18" height="18" x="3" y="4" rx="2" />
		<path d="M3 10h18" />
	</svg>
{/snippet}

<div>
	<div class="flex items-start justify-between gap-2">
		<div class="flex min-w-0 flex-wrap items-center gap-2">
			<h4 class="text-sm font-medium text-forest-900">{gddMetricHelp.title}</h4>
			{#if gdd?.phenology}
				<span
					class="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800"
					role="status"
				>
					{m.gdd_probabilistic_disclaimer()}
				</span>
			{/if}
		</div>
		<button
			type="button"
			class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-forest-700 transition active:scale-95"
			aria-expanded={gddHelpOpen}
			aria-controls={gddHelpId}
			aria-label={m.gdd_help_aria()}
			onclick={() => (gddHelpOpen = !gddHelpOpen)}
		>
			?
		</button>
	</div>

	{#if gddHelpOpen}
		<p id={gddHelpId} class="mt-2 text-xs leading-relaxed text-muted" role="note">
			<span class="font-medium text-forest-800">{m.yrs_recommendation()}</span>
			{gddMetricHelp.helpText}
		</p>
	{/if}

	{#if offline && !gdd && !agriLoading && !fromCache}
		<p class="mt-3 text-sm text-muted" role="status">{m.climate_online_required()}</p>
	{:else if agriLoading}
		<div
			class="app-card-muted mt-3 p-2"
			role="status"
			aria-busy="true"
			aria-label={m.agri_loading()}
		>
			<div class="flex gap-1">
				{#each [0, 1] as i (i)}
					<div class="flex min-h-11 flex-1 flex-col items-center justify-center gap-1.5 py-1">
						<Skeleton class="h-9 w-9 rounded-full" decorative />
						<Skeleton class="h-3 w-12" decorative />
					</div>
				{/each}
			</div>
		</div>
	{:else if gdd}
		{#if gdd.phenology || gdd.phenologyUnavailableReason || scoreItem}
			<div class="mt-3 flex items-start justify-between gap-2">
				<div class="min-w-0">
					{#if gdd.phenology}
						<p class="text-base font-semibold text-forest-900" role="status">
							{gdd.phenology.transitionLabel}
						</p>
					{:else if gdd.phenologyUnavailableReason}
						<p class="text-sm text-amber-800" role="status">{gdd.phenologyUnavailableReason}</p>
					{/if}
					{#if scoreItem && scoreItem.points <= 0}
						<p class="mt-1 text-sm text-muted">{scoreItem.label}</p>
					{/if}
				</div>
				{#if scoreItem}
					<span class="shrink-0 text-sm font-semibold tabular-nums {getYrsPointsClass(scoreItem.points)}">
						{formatYrsPoints(scoreItem.points)}
					</span>
				{/if}
			</div>
		{/if}

		<div class="app-card-muted mt-3 p-2">
			<div class="flex gap-1">
				<button
					type="button"
					class="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 transition active:scale-[0.98] {openMetric ===
					'season'
						? 'ring-2 ring-forest-600/30'
						: ''}"
					aria-expanded={openMetric === 'season'}
					aria-controls={openMetric === 'season' ? detailId : undefined}
					aria-label={seasonTitle}
					onclick={() => toggleMetric('season')}
				>
					<span
						class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white"
					>
						{@render iconTrend()}
					</span>
					<span class="px-0.5 text-center text-sm font-semibold leading-tight text-forest-800">
						{seasonValue}
					</span>
				</button>
				<button
					type="button"
					class="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 transition active:scale-[0.98] {openMetric ===
					'week'
						? 'ring-2 ring-forest-600/30'
						: ''}"
					aria-expanded={openMetric === 'week'}
					aria-controls={openMetric === 'week' ? detailId : undefined}
					aria-label={gdd7dMetricHelp.title}
					onclick={() => toggleMetric('week')}
				>
					<span
						class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white"
					>
						{@render iconCalendar()}
					</span>
					<span class="px-0.5 text-center text-sm font-semibold leading-tight text-forest-800">
						{weekValue}
					</span>
				</button>
			</div>

			{#if openMetric === 'season'}
				<div id={detailId} class="border-t border-gray-100 px-3 py-2" role="region" aria-label={seasonTitle}>
					<p class="text-sm font-medium text-forest-900">{seasonTitle}</p>
					{#if seasonZone}
						<p class="mt-0.5 text-sm font-medium {seasonZoneClass}" role="status">{seasonZone.label}</p>
					{/if}
					<p class="mt-0.5 text-xs leading-relaxed text-muted">
						{seasonStartLabel || m.gdd_since_jan1()}
					</p>
				</div>
			{:else if openMetric === 'week'}
				<div
					id={detailId}
					class="border-t border-gray-100 px-3 py-2"
					role="region"
					aria-label={gdd7dMetricHelp.title}
				>
					<div class="flex items-start justify-between gap-2">
						<p class="text-sm font-medium text-forest-900">{gdd7dMetricHelp.title}</p>
						<button
							type="button"
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-forest-700 transition active:scale-95"
							aria-expanded={gdd7dHelpOpen}
							aria-controls={gdd7dHelpId}
							aria-label={m.gdd_7d_help_aria()}
							onclick={() => (gdd7dHelpOpen = !gdd7dHelpOpen)}
						>
							?
						</button>
					</div>
					<p class="mt-0.5 text-xs leading-relaxed text-muted">{gdd7dMetricHelp.summary}</p>

					{#if gdd7dHelpOpen}
						<div id={gdd7dHelpId} class="mt-3 space-y-3 border-t border-gray-100 pt-3 text-xs" role="note">
							<p class="leading-relaxed text-muted">{gdd7dMetricHelp.intro}</p>
							<p class="leading-relaxed text-muted">{gdd7dMetricHelp.contrast}</p>

							<div>
								<p class="font-medium text-forest-800">{gdd7dMetricHelp.interpretationTitle}</p>
								<ul class="mt-2 space-y-1.5 text-muted">
									{#each gdd7dMetricHelp.interpretationLevels as level (level.label)}
										<li>
											<span class="font-medium text-forest-800">{level.label}</span>
											→ {level.text}
										</li>
									{/each}
								</ul>
							</div>

							<div>
								<p class="font-medium text-forest-800">{gdd7dMetricHelp.yamadoriTitle}</p>
								<p class="mt-1 leading-relaxed text-muted">{gdd7dMetricHelp.yamadoriIntro}</p>
								<ul class="mt-2 list-disc space-y-1.5 pl-4 text-muted">
									{#each gdd7dMetricHelp.yamadoriPoints as point (point)}
										<li>{point}</li>
									{/each}
								</ul>
							</div>

							<p
								class="rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2 leading-relaxed text-amber-950"
							>
								⚠️ {gdd7dMetricHelp.warning}
							</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if gdd.dailySeries.length > 0}
			<div class="mt-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3">
				<p class="text-[10px] font-semibold uppercase tracking-wide text-muted">
					{m.gdd_cumulative()} — {m.gdd_since_jan1().toLowerCase()}
				</p>
				<GddSparkline history={gdd.dailySeries} />
			</div>
		{/if}

		<p class="mt-3 text-xs text-muted">
			{gddBaseTempLabel} ({baseCategoryLabel})
			{#if speciesDisplay}
				· {speciesDisplay}
			{/if}
		</p>
	{:else}
		<p class="mt-3 text-sm text-muted" role="status">
			{m.yrs_gdd_unavailable()} — {m.climate_online_required().toLowerCase()}
		</p>
	{/if}
</div>
