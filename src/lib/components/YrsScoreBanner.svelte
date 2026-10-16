<script lang="ts">
	import { agriData } from '$lib/stores/agriData.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { YrsConfidence, YrsDecision } from '$lib/types/yrs';
	import { canUseApi } from '$lib/utils/apiPolicy';
	import { resolveYrsBannerDisplayState } from '$lib/utils/yrsBannerState';
	import { getYrsBannerAccentClasses, getYrsBannerClasses, getCombinedYamadoriVerdict } from '$lib/utils/yrs';
	import { resolveHarvestCalendarPrior } from '$lib/geo/harvestWindowPrior';
	import * as m from '$lib/paraglide/messages.js';

	let {
		gpsReady = false,
		locationError = '',
		potentialScore = null,
		species = '',
		expanded = false,
		controlsId = '',
		onclick
	}: {
		gpsReady?: boolean;
		locationError?: string;
		potentialScore?: number | null;
		species?: string;
		expanded?: boolean;
		controlsId?: string;
		onclick?: () => void;
	} = $props();

	const yrs = $derived(agriData.data?.yrs ?? null);
	const loading = $derived(agriData.loading);
	const fromCache = $derived(agriData.source === 'cache');

	const combinedVerdict = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getCombinedYamadoriVerdict(potentialScore, yrs);
	});

	const harvestSpecies = $derived(species.trim() || agriData.data?.gdd?.speciesLabel || '');

	const displayState = $derived(
		resolveYrsBannerDisplayState({
			yrs,
			loading,
			gpsReady,
			online: canUseApi('openMeteoForecast'),
			fromCache,
			locationError
		})
	);

	const yrsScoreLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.yrs_score_label();
	});

	const yrsDecisionLabels = $derived.by((): Record<YrsDecision, string> => {
		void appearanceSettingsState.locale;
		return {
			OPTIMAL: m.yrs_decision_optimal(),
			ACCEPTABLE: m.yrs_decision_acceptable(),
			RISK: m.yrs_decision_risk(),
			NO_GO: m.yrs_decision_no_go()
		};
	});

	const yrsConfidenceLabels = $derived.by((): Record<YrsConfidence, string> => {
		void appearanceSettingsState.locale;
		return {
			high: m.yrs_confidence_high(),
			medium: m.yrs_confidence_medium(),
			low: m.yrs_confidence_low()
		};
	});

	const bannerBorderClass = $derived.by(() => {
		if (yrs) return getYrsBannerClasses(yrs.score, yrs.decision);
		if (displayState === 'pending_offline') return 'border-gray-200';
		if (loading && gpsReady) return 'border-forest-100';
		return 'border-gray-100';
	});

	const accentClass = $derived(
		yrs ? getYrsBannerAccentClasses(yrs.score, yrs.decision) : 'bg-forest-200'
	);

	const decisionPillClass = $derived.by((): Record<YrsDecision, string> => ({
		OPTIMAL: 'bg-emerald-50 text-emerald-800',
		ACCEPTABLE: 'bg-amber-50 text-amber-900',
		RISK: 'bg-orange-50 text-orange-900',
		NO_GO: 'bg-red-50 text-red-800'
	}));

	const confidenceClass = $derived.by((): Record<YrsConfidence, string> => ({
		high: 'text-emerald-700',
		medium: 'text-amber-700',
		low: 'text-orange-700'
	}));

	const harvestOutside = $derived.by(() => {
		const data = agriData.data;
		if (!data?.yrs || !data) return false;
		const prior = resolveHarvestCalendarPrior(
			harvestSpecies,
			data.latitude,
			data.longitude,
			data.fetchedAt ? new Date(data.fetchedAt) : new Date()
		);
		return prior.applicable && !prior.inWindow;
	});

	const statusLine = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (displayState !== 'score' || !yrs) return null;
		if (harvestOutside) {
			return {
				text: m.yrs_breakdown_harvest_calendar_outside(),
				className: 'text-orange-800',
				title: ''
			};
		}
		if (yrs.localization === 'generic') {
			return {
				text: m.yrs_localization_generic_hint(),
				className: 'text-amber-800',
				title: ''
			};
		}
		if (combinedVerdict) {
			return { text: combinedVerdict, className: 'text-forest-800', title: '' };
		}
		return {
			text: `${m.yrs_confidence_label()} : ${yrsConfidenceLabels[yrs.confidence]}`,
			className: confidenceClass[yrs.confidence],
			title: m.yrs_confidence_hint()
		};
	});

	const clickable = $derived(typeof onclick === 'function');
	const bannerClass =
		'relative overflow-hidden rounded-xl border bg-white/90 px-4 py-3.5';
</script>

{#snippet bannerInner()}
	<div class="absolute inset-y-0 left-0 w-1 {accentClass}" aria-hidden="true"></div>

	<div class="flex items-center justify-between gap-4 pl-2">
		<div class="min-w-0 text-left" role={clickable ? 'status' : undefined} aria-live={clickable ? 'polite' : undefined}>
			<p class="text-xs font-medium tracking-wide text-muted">{yrsScoreLabel}</p>

			{#if displayState === 'score' && yrs}
				<p class="mt-1 text-2xl font-semibold tabular-nums leading-none text-forest-900">
					{yrs.score}<span class="text-base font-normal text-muted">/100</span>
				</p>
				{#if statusLine}
					<p
						class="mt-1 text-sm leading-snug {statusLine.className}"
						title={statusLine.title || undefined}
					>
						{statusLine.text}
					</p>
				{/if}
			{:else if displayState === 'calculating'}
				<p class="mt-1 text-sm text-forest-700">{m.yrs_calculating()}</p>
			{:else if displayState === 'gps_required'}
				<p class="mt-1 text-sm text-amber-900">{locationError}</p>
			{:else if displayState === 'waiting_gps'}
				<p class="mt-1 text-sm text-muted">{m.yrs_waiting_gps()}</p>
			{:else if displayState === 'unavailable'}
				<p class="mt-1 text-sm text-muted">{m.yrs_unavailable()}</p>
			{/if}
		</div>

		<div class="flex shrink-0 items-center gap-2">
			{#if displayState === 'score' && yrs}
				<span
					class="rounded-full px-2.5 py-1 text-[11px] font-medium leading-tight {decisionPillClass[
						yrs.decision
					]}"
				>
					{yrsDecisionLabels[yrs.decision]}
				</span>
			{:else if displayState === 'pending_offline'}
				<span
					class="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium leading-tight text-gray-700"
				>
					{m.yrs_pending_offline()}
				</span>
			{/if}
			{#if clickable}
				<svg
					class="h-4 w-4 text-muted transition {expanded ? 'rotate-180' : ''}"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			{/if}
		</div>
	</div>
{/snippet}

{#if clickable}
	<button
		type="button"
		class="{bannerClass} w-full text-left {bannerBorderClass}"
		data-capture-tutorial="yrs"
		aria-expanded={expanded}
		aria-controls={controlsId || undefined}
		aria-label={yrsScoreLabel}
		{onclick}
	>
		{@render bannerInner()}
	</button>
{:else}
	<div
		class="{bannerClass} {bannerBorderClass}"
		role="status"
		aria-live="polite"
		aria-label={yrsScoreLabel}
		data-capture-tutorial="yrs"
	>
		{@render bannerInner()}
	</div>
{/if}
