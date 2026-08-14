<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { getGddBaseCategoryLabels, getGddSeasonZone } from '$lib/constants/gdd-config';
	import { getGdd7dMetricHelp, getGddMetricHelp } from '$lib/constants/gdd-metric-help';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import { agriData } from '$lib/stores/agriData.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { getGddSeasonStartDate } from '$lib/utils/openMeteoArchive';
	import GddSparkline from './GddSparkline.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		species = '',
		loading = false,
		offline = false
	}: {
		species?: string;
		loading?: boolean;
		offline?: boolean;
	} = $props();

	let gddHelpOpen = $state(false);
	let gdd7dHelpOpen = $state(false);
	const gddHelpId = 'gdd-metric-help';
	const gdd7dHelpId = 'gdd-7d-metric-help';

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

	const baseCategoryLabel = $derived(
		gdd ? baseCategoryLabels[gdd.baseCategory] : ''
	);

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
		return data.latitude < 0 ? m.gdd_season_start_july({ date: start }) : m.gdd_season_start_jan({ date: start });
	});

	const gddBaseTempLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return gdd ? m.gdd_base_temp({ temp: String(gdd.baseTempC) }) : '';
	});
</script>

<div>
	<div class="flex items-start justify-between gap-2">
		<div class="flex flex-wrap items-center gap-2">
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
			class="mt-4 flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-3"
			role="status"
			aria-busy="true"
			aria-label={m.agri_loading()}
		>
			{#each [0, 1] as i (i)}
				<div class="rounded-lg bg-violet-50/60 px-4 py-3">
					<Skeleton class="h-3.5 w-28" decorative />
					<Skeleton class="mt-2 h-8 w-20" decorative />
					<Skeleton class="mt-2 h-3 w-full" decorative />
				</div>
			{/each}
		</div>
	{:else if gdd}
		{#if gdd.phenology}
			<p class="mt-4 text-base font-semibold text-forest-900" role="status">
				{gdd.phenology.transitionLabel}
			</p>
		{:else if gdd.phenologyUnavailableReason}
			<p class="mt-4 text-sm text-amber-800" role="status">{gdd.phenologyUnavailableReason}</p>
		{/if}

		<div class="mt-4 flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-3">
			<article class="rounded-lg bg-violet-50 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">{m.gdd_cumulative()}</p>
				<p class="mt-1 text-2xl font-semibold text-forest-800">
					{m.gdd_degrees_days({ value: gdd.cumulativeSinceJan1 })}
				</p>
				{#if seasonZone}
					<p class="mt-1 text-sm font-medium {seasonZoneClass}" role="status">
						{seasonZone.label}
					</p>
				{/if}
				{#if seasonStartLabel}
					<p class="mt-1 text-xs text-muted">{seasonStartLabel}</p>
				{:else}
					<p class="mt-1 text-xs text-muted">{m.gdd_since_jan1()}</p>
				{/if}
			</article>

			<article class="rounded-lg bg-violet-50/70 px-4 py-3">
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0">
						<p class="text-sm font-medium text-forest-900">{gdd7dMetricHelp.title}</p>
					</div>
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
				<p class="mt-1 text-2xl font-semibold text-forest-800">
					{m.gdd_degrees_days({ value: gdd.last7dSum })}
				</p>
				<p class="mt-1 text-xs text-muted">{gdd7dMetricHelp.summary}</p>

				{#if gdd7dHelpOpen}
					<div id={gdd7dHelpId} class="mt-3 space-y-3 border-t border-violet-200/80 pt-3 text-xs" role="note">
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

						<p class="rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2 leading-relaxed text-amber-950">
							⚠️ {gdd7dMetricHelp.warning}
						</p>
					</div>
				{/if}
			</article>
		</div>

		{#if gdd.dailySeries.length > 0}
			<div class="mt-4 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3">
				<p class="text-[10px] font-semibold uppercase tracking-wide text-muted">
					{m.gdd_cumulative()} — {m.gdd_since_jan1().toLowerCase()}
				</p>
				<GddSparkline history={gdd.dailySeries} />
			</div>
		{/if}

		<p class="mt-4 text-xs text-muted">
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
