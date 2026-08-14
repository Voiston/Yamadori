<script lang="ts">
	import { agriData } from '$lib/stores/agriData.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { YrsConfidence, YrsDecision } from '$lib/types/yrs';
	import { canUseApi } from '$lib/utils/apiPolicy';
	import { resolveYrsBannerDisplayState } from '$lib/utils/yrsBannerState';
	import { getYrsBannerAccentClasses, getYrsBannerClasses, getCombinedYamadoriVerdict, getPrimaryYrsConfidenceGap, getYrsConfidenceGapCta } from '$lib/utils/yrs';
	import { resolveHarvestCalendarPrior } from '$lib/geo/harvestWindowPrior';
	import * as m from '$lib/paraglide/messages.js';

	let {
		gpsReady = false,
		locationError = '',
		potentialScore = null,
		species = ''
	}: {
		gpsReady?: boolean;
		locationError?: string;
		potentialScore?: number | null;
		species?: string;
	} = $props();

	const yrs = $derived(agriData.data?.yrs ?? null);
	const loading = $derived(agriData.loading);
	const fromCache = $derived(agriData.source === 'cache');

	const combinedVerdict = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getCombinedYamadoriVerdict(potentialScore, yrs);
	});

	const confidenceCta = $derived.by(() => {
		void appearanceSettingsState.locale;
		const data = agriData.data;
		if (!data?.yrs || data.yrs.confidence === 'high') return null;
		const gap = getPrimaryYrsConfidenceGap(data, { species });
		return getYrsConfidenceGapCta(gap);
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
</script>

<div
	class="relative overflow-hidden rounded-xl border bg-white/90 px-4 py-3.5 {bannerBorderClass}"
	role="status"
	aria-live="polite"
	aria-label={yrsScoreLabel}
	data-capture-tutorial="yrs"
>
	<div class="absolute inset-y-0 left-0 w-1 {accentClass}" aria-hidden="true"></div>

	<div class="flex items-center justify-between gap-4 pl-2">
		<div class="min-w-0 text-left">
			<p class="text-xs font-medium tracking-wide text-muted">{yrsScoreLabel}</p>

			{#if displayState === 'score' && yrs}
				<p class="mt-1 text-2xl font-semibold tabular-nums leading-none text-forest-900">
					{yrs.score}<span class="text-base font-normal text-muted">/100</span>
				</p>
				<p
					class="mt-1 text-[11px] leading-snug {confidenceClass[yrs.confidence]}"
					title={m.yrs_confidence_hint()}
				>
					{m.yrs_confidence_label()} : {yrsConfidenceLabels[yrs.confidence]}
					<span class="text-muted"> — {m.yrs_confidence_hint()}</span>
				</p>
				{#if harvestOutside}
					<p class="mt-1 text-[11px] leading-snug text-orange-800">
						{m.yrs_breakdown_harvest_calendar_outside()}
					</p>
				{/if}
				{#if yrs.localization === 'generic'}
					<p class="mt-1 text-[11px] leading-snug text-amber-800">
						{m.yrs_localization_generic_hint()}
					</p>
				{/if}
				{#if confidenceCta}
					<p class="mt-1 text-[11px] leading-snug text-forest-800">{confidenceCta}</p>
				{/if}
				{#if combinedVerdict}
					<p class="mt-1.5 text-[11px] font-medium leading-snug text-forest-800" role="status">
						{combinedVerdict}
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

		{#if displayState === 'score' && yrs}
			<span
				class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium leading-tight {decisionPillClass[
					yrs.decision
				]}"
			>
				{yrsDecisionLabels[yrs.decision]}
			</span>
		{:else if displayState === 'pending_offline'}
			<span
				class="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium leading-tight text-gray-700"
			>
				{m.yrs_pending_offline()}
			</span>
		{/if}
	</div>
</div>
