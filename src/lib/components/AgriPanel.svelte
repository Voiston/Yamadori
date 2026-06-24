<script lang="ts">
	import type { AgriRiskLevel } from '$lib/types/agri';
	import type { PhenologyStageId } from '$lib/types/gdd';
	import type { CernageStatus, YrsDecision } from '$lib/types/yrs';
	import type { EnvironmentExposure } from '$lib/types/environment';
	import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
	import { getAgriMetricHelp } from '$lib/constants/agri-metric-help';
	import { getGddSeasonZone } from '$lib/constants/gdd-config';
	import { agriData } from '$lib/stores/agriData.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { getIntlLocale } from '$lib/utils/i18n/locale';
	import {
		assessYamadoriMetricRisks,
		assessYrsDetailRisks,
		computeEffectiveSoilStabilityScore,
		getSoil18cmZoneLabel,
		worstAgriRisk
	} from '$lib/utils/agri';
	import {
		formatSoilNightDropAttenuationLabel,
		getSoilNightDropActivationWeight
	} from '$lib/utils/soilNightDrop';
	import { getYrsScoreBreakdown, getYrsDecisionLabels, getYrsScoreLabel, type YrsLayerKey } from '$lib/utils/yrs';
	import AgriMetricCard from './AgriMetricCard.svelte';
	import GddPanel from './GddPanel.svelte';
	import SoilTempSparkline from './SoilTempSparkline.svelte';
	import ViabilityWeekChart from './ViabilityWeekChart.svelte';
	import YrsLayerScoreCell from './YrsLayerScoreCell.svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		approximate?: boolean;
		offline?: boolean;
		species?: string;
		observedPhenologyStage?: PhenologyStageId | null;
		cernageStatus?: CernageStatus | null;
		environmentExposure?: EnvironmentExposure;
		loading?: boolean;
		onretry?: () => void;
	}

	let {
		approximate = false,
		offline = false,
		species = '',
		observedPhenologyStage = null,
		cernageStatus = null,
		environmentExposure = DEFAULT_ENVIRONMENT_EXPOSURE,
		loading = false,
		onretry
	}: Props = $props();

	let yrsHelpOpen = $state(false);
	let openLayer = $state<YrsLayerKey | 'total' | null>(null);
	const yrsHelpId = 'yrs-score-help';

	const data = $derived(agriData.data);
	const error = $derived(agriData.error);
	const agriLoading = $derived(agriData.loading || loading);
	const fromCache = $derived(agriData.source === 'cache');
	const cacheBanner = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!fromCache || !agriData.cachedAt) return null;

		if (agriData.cacheStale) {
			const days = Math.floor(
				(Date.now() - Date.parse(agriData.cachedAt)) / (24 * 60 * 60 * 1000)
			);
			if (days >= 1) {
				return m.weather_cache_stale_days({ count: String(days) });
			}
			const hours = Math.max(
				1,
				Math.floor((Date.now() - Date.parse(agriData.cachedAt)) / (60 * 60 * 1000))
			);
			return m.weather_cache_stale_hours({ count: String(hours) });
		}

		const fetchedAt = new Date(agriData.cachedAt);
		const timeLabel = fetchedAt.toLocaleTimeString(getIntlLocale(appearanceSettingsState.locale), {
			hour: '2-digit',
			minute: '2-digit'
		});
		const distanceKm =
			agriData.cacheDistanceM !== null ? Math.round(agriData.cacheDistanceM / 1000) : null;
		const distanceLabel =
			distanceKm !== null && distanceKm > 0 ? ` (zone ~${distanceKm} km)` : ' (zone ~30 km)';
		return m.yrs_offline_forecast({ time: timeLabel, distance: distanceLabel });
	});
	const cacheBannerClass = $derived(
		agriData.cacheStale
			? 'border-gray-200 bg-gray-50 text-gray-700'
			: 'border-sky-200 bg-sky-50 text-sky-900'
	);
	const cacheRetryButtonClass = $derived(
		agriData.cacheStale
			? 'border-gray-300 bg-white text-gray-700'
			: 'border-sky-300 bg-white text-sky-800'
	);

	const plantInputs = $derived({
		species,
		observedPhenologyStage,
		cernageStatus,
		environmentExposure
	});
	const showMicroclimateBadge = $derived(environmentExposure !== DEFAULT_ENVIRONMENT_EXPOSURE);
	const metricRisks = $derived(data ? assessYamadoriMetricRisks(data, plantInputs) : null);
	const yrsRisks = $derived(data ? assessYrsDetailRisks(data, plantInputs) : null);
	const yrs = $derived(data?.yrs ?? null);
	const effectiveSoilStabilityScore = $derived(
		data ? computeEffectiveSoilStabilityScore(data, plantInputs) : null
	);
	const soilNightDropWeight = $derived(
		data ? getSoilNightDropActivationWeight(data, plantInputs) : null
	);
	const soilNightDropAttenuation = $derived(
		data && soilNightDropWeight !== null
			? formatSoilNightDropAttenuationLabel(data, plantInputs, soilNightDropWeight)
			: null
	);
	const yrsBreakdown = $derived(data ? getYrsScoreBreakdown(data, plantInputs) : null);
	const weeklyViability = $derived(data?.weeklyViability ?? null);

	const metricHelp = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getAgriMetricHelp();
	});

	const yrsScoreLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getYrsScoreLabel();
	});

	const yrsDecisionLabels = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getYrsDecisionLabels();
	});

	const yrsLayerLabels = $derived.by(() => {
		void appearanceSettingsState.locale;
		return {
			climate: m.yrs_layer_climate(),
			soil: m.yrs_layer_soil(),
			phenology: m.yrs_layer_phenology(),
			hydric: m.yrs_layer_hydric(),
			stressPenalty: m.yrs_layer_penalties()
		} as const;
	});

	const yrsViabilityHeading = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.yrs_chart_aria({ today: '', best: '' }).split('.')[0] ?? '';
	});

	const bestDay = $derived(
		weeklyViability?.days.find((day) => day.date === weeklyViability.bestDayDate) ?? null
	);

	const viabilityBestDayLine = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!bestDay || !weeklyViability) return null;
		const segments = m
			.yrs_chart_aria({
				today: formatDayLabel(weeklyViability.days[0]?.date ?? ''),
				best: `${formatDayLabel(bestDay.date)} (YRS ${bestDay.score})`
			})
			.split('. ');
		return segments[segments.length - 1] ?? null;
	});

	const soil18cmZoneLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return data ? getSoil18cmZoneLabel(data.soilTemperature18cmC) : '';
	});

	const allDaysRisk = $derived(
		weeklyViability !== null &&
			weeklyViability.days.every((d) => d.yrsDecision === 'RISK' || d.yrsDecision === 'NO_GO')
	);

	const showRetry = $derived(!agriLoading && (!data || !!error) && !!onretry);

	const yrsDecisionStyles = $derived.by((): Record<YrsDecision, string> => ({
		OPTIMAL: 'bg-emerald-50 text-emerald-800 border-emerald-200',
		ACCEPTABLE: 'bg-amber-50 text-amber-900 border-amber-200',
		RISK: 'bg-orange-50 text-orange-900 border-orange-200',
		NO_GO: 'bg-red-50 text-red-800 border-red-200'
	}));

	const gddSeasonZone = $derived(
		data?.gdd ? getGddSeasonZone(data.gdd.cumulativeSinceJan1) : null
	);

	const gddSeasonZoneClass = $derived(
		gddSeasonZone?.tone === 'good'
			? 'text-emerald-800'
			: gddSeasonZone?.tone === 'warn'
				? 'text-amber-800'
				: 'text-muted'
	);

	const frostDetailRisk = $derived(
		yrsRisks ? worstAgriRisk(yrsRisks.frostPast, yrsRisks.frostForecast) : ('Excellent' as AgriRiskLevel)
	);

	function formatDayLabel(isoDate: string): string {
		const [, month, day] = isoDate.split('-');
		return `${day}/${month}`;
	}

	function toggleLayer(layer: YrsLayerKey | 'total'): void {
		openLayer = openLayer === layer ? null : layer;
	}

	$effect(() => {
		if (!openLayer) return;

		function onKeydown(event: KeyboardEvent): void {
			if (event.key === 'Escape') openLayer = null;
		}

		document.addEventListener('keydown', onKeydown);
		return () => document.removeEventListener('keydown', onKeydown);
	});
</script>

<div>
	{#if approximate}
		<p class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
			{m.climate_approximate()}
		</p>
	{/if}

	{#if showMicroclimateBadge}
		<p class="mt-2 rounded-lg bg-forest-50 px-3 py-2 text-xs text-forest-800" role="status">
			{m.exposure_hint_edge()}
		</p>
	{/if}

	{#if cacheBanner}
		<div
			class="mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs {cacheBannerClass}"
			role="status"
		>
			<p class="min-w-0 flex-1">{cacheBanner}</p>
			{#if onretry}
				<button
					type="button"
					class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition active:scale-95 disabled:opacity-50 {cacheRetryButtonClass}"
					aria-label={m.yrs_help_aria()}
					title={m.yrs_refresh_aria()}
					disabled={agriLoading}
					onclick={onretry}
				>
					<svg
						class="h-3.5 w-3.5 {agriLoading ? 'animate-spin' : ''}"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M21 12a9 9 0 1 1-2.64-6.36" />
						<path d="M21 3v6h-6" />
					</svg>
				</button>
			{/if}
		</div>
	{/if}

	{#if offline && !data && !agriLoading && !fromCache}
		<p class="mt-3 text-sm text-muted" role="status">{m.climate_online_required()}</p>
	{:else if agriLoading}
		<div class="mt-4 flex items-center gap-3 text-sm text-muted" role="status">
			<svg class="h-5 w-5 animate-spin text-forest-600" viewBox="0 0 24 24" aria-hidden="true">
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
					fill="none"
				/>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
				/>
			</svg>
			{m.agri_loading()}
		</div>
	{:else if error}
		<p class="mt-3 text-sm text-red-700" role="alert">{error}</p>
		{#if showRetry}
			<button
				type="button"
				class="mt-3 rounded-lg bg-forest-800 px-4 py-2 text-sm text-white transition active:scale-[0.98]"
				onclick={onretry}
			>
				{m.action_retry()}
			</button>
		{/if}
	{:else if data}
		{#if yrs}
			<section
				class="mt-3 rounded-xl border border-forest-100 bg-forest-50/50 p-4"
				aria-label={yrsScoreLabel}
			>
				<div class="flex items-start justify-between gap-2">
					<h5 class="text-xs font-semibold uppercase tracking-wide text-muted">
						{yrsScoreLabel}
					</h5>
					<button
						type="button"
						class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-forest-700 transition active:scale-95"
						aria-expanded={yrsHelpOpen}
						aria-controls={yrsHelpId}
						aria-label={m.yrs_help_aria()}
						onclick={() => (yrsHelpOpen = !yrsHelpOpen)}
					>
						?
					</button>
				</div>
				{#if yrsHelpOpen}
					<p id={yrsHelpId} class="mt-2 text-xs leading-relaxed text-muted" role="note">
						<span class="font-medium text-forest-800">{m.yrs_recommendation()}</span>
						{metricHelp.yrs.helpText}
					</p>
				{/if}
				<div class="mt-3 flex flex-wrap items-center gap-3">
					<div class="relative">
						<button
							type="button"
							class="rounded-lg px-1 py-0.5 text-left transition active:scale-[0.98] {openLayer ===
							'total'
								? 'ring-2 ring-forest-600/30'
								: ''}"
							aria-expanded={openLayer === 'total'}
							aria-label={m.yrs_score_detail({ label: 'YRS' })}
							onclick={(event) => {
								event.stopPropagation();
								toggleLayer('total');
							}}
						>
							<p class="text-3xl font-semibold text-forest-900">
								{yrs.score}<span class="text-lg text-muted">/100</span>
							</p>
						</button>
						{#if openLayer === 'total' && yrsBreakdown}
							<div
								role="region"
								aria-label={m.yrs_composition()}
								class="absolute top-full left-0 z-20 mt-1 min-w-[16rem] rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg"
							>
								<p class="font-medium text-forest-900">{m.yrs_composition()}</p>
								<ul class="mt-2 flex flex-col gap-1 text-forest-800">
									<li>{yrsLayerLabels.climate} : +{yrs.layers.climate}</li>
									<li>{yrsLayerLabels.soil} : +{yrs.layers.soil}</li>
									<li>{yrsLayerLabels.phenology} : +{yrs.layers.phenology}</li>
									<li>{yrsLayerLabels.hydric} : +{yrs.layers.hydric}</li>
									<li>{yrsLayerLabels.stressPenalty} : −{yrs.layers.stressPenalty}</li>
								</ul>
								<p class="mt-2 border-t border-gray-100 pt-2 font-semibold text-forest-900">
									{yrs.layers.climate} + {yrs.layers.soil} + {yrs.layers.phenology} +
									{yrs.layers.hydric} − {yrs.layers.stressPenalty} = {yrs.score}
								</p>
							</div>
						{/if}
					</div>
					<span
						class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold {yrsDecisionStyles[
							yrs.decision
						]}"
						role="status"
					>
						{yrsDecisionLabels[yrs.decision]}
					</span>
				</div>
				{#if yrs.summary}
					<p class="mt-2 text-xs text-muted" role="status">{yrs.summary}</p>
				{/if}
				{#if yrsBreakdown}
					<div class="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
						<YrsLayerScoreCell
							label={yrsLayerLabels.climate}
							displayValue="{yrs.layers.climate}/30"
							breakdown={yrsBreakdown.climate}
							open={openLayer === 'climate'}
							ontoggle={() => toggleLayer('climate')}
						/>
						<YrsLayerScoreCell
							label={yrsLayerLabels.soil}
							displayValue="{yrs.layers.soil}/25"
							breakdown={yrsBreakdown.soil}
							open={openLayer === 'soil'}
							ontoggle={() => toggleLayer('soil')}
						/>
						<YrsLayerScoreCell
							label={yrsLayerLabels.phenology}
							displayValue="{yrs.layers.phenology}/25"
							breakdown={yrsBreakdown.phenology}
							open={openLayer === 'phenology'}
							ontoggle={() => toggleLayer('phenology')}
						/>
						<YrsLayerScoreCell
							label={yrsLayerLabels.hydric}
							displayValue="{yrs.layers.hydric}/20"
							breakdown={yrsBreakdown.hydric}
							open={openLayer === 'hydric'}
							ontoggle={() => toggleLayer('hydric')}
						/>
						<YrsLayerScoreCell
							label={yrsLayerLabels.stressPenalty}
							displayValue="−{yrs.layers.stressPenalty}"
							breakdown={yrsBreakdown.stressPenalty}
							isPenalty
							open={openLayer === 'stressPenalty'}
							ontoggle={() => toggleLayer('stressPenalty')}
						/>
					</div>
				{/if}

				{#if yrsRisks}
					<h6 class="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
						{m.yrs_detailed_indicators()}
					</h6>
					<div class="mt-3 flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3">
						<AgriMetricCard
							title={metricHelp.gddSeason.title}
							helpText={metricHelp.gddSeason.helpText}
							riskLevel={yrsRisks.gddSeason}
						>
							<p class="text-2xl font-semibold text-forest-800">
								{data.gdd?.cumulativeSinceJan1 ?? '—'}<span class="text-base text-muted"> °c.j</span>
							</p>
							{#if gddSeasonZone}
								<p class="mt-1 text-sm font-medium {gddSeasonZoneClass}" role="status">
									{gddSeasonZone.label}
								</p>
							{:else}
								<p class="mt-1 text-xs text-muted">{m.gdd_since_jan1()}</p>
							{/if}
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.et0.title}
							helpText={metricHelp.et0.helpText}
							riskLevel={yrsRisks.et0Mean}
						>
							<p class="text-base font-semibold text-forest-800">
								{m.yrs_et0_past_forecast({
									past: String(data.et0Past7dMeanMm ?? '—'),
									forecast: String(data.et0Trend7dMeanMm ?? '—')
								})}
							</p>
							<p class="mt-1 text-xs text-muted">{m.yrs_et0_mean_7d()}</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.air.title}
							helpText={metricHelp.air.helpText}
							riskLevel={yrsRisks.air}
						>
							<p class="text-2xl font-semibold text-forest-800">{data.airTemperatureC}°C</p>
							<p class="mt-1 text-xs text-muted">
								{data.windSpeedKmh} km/h · {data.relativeHumidityPct}% {m.agri_field_humidity()}
							</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.soil.title}
							helpText={metricHelp.soil.helpText}
							riskLevel={yrsRisks.soil}
						>
							<p class="text-base text-forest-800">
								<span class="font-semibold">{data.soilTemperature6cmC}°C</span>
								<span class="text-muted"> ({m.agri_field_soil_6()})</span>
								<span class="text-muted"> / </span>
								<span class="font-semibold">{data.soilTemperature18cmC}°C</span>
								<span class="text-muted"> ({m.agri_field_soil_18()})</span>
							</p>
							<p class="mt-1 text-xs text-muted">
								{soil18cmZoneLabel} · {m.agri_verdict_soil_warming({
									days: String(data.soilConsecutiveStableDays)
								})}
							</p>
							<p class="mt-3 text-sm font-medium text-forest-900">{m.yrs_history()}</p>
							<SoilTempSparkline history={data.soilDailyHistory7d} />
							<p class="mt-2 text-xs text-muted">
								{effectiveSoilStabilityScore ?? data.soilStabilityScore}/100 · {data.soilHeatBufferC}°C
								{#if !data.soilTrend7dRising}
									· {m.agri_verdict_soil_stable()}
								{/if}
							</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.soilNightDrop.title}
							helpText={metricHelp.soilNightDrop.helpText}
							riskLevel={yrsRisks.soilNightDrop}
						>
							<p class="text-base font-semibold text-forest-800">
								{#if data.soilBrutalNightDrop}
									{m.agri_soil_night_drop_title()}
									{#if soilNightDropAttenuation}
										<span class="font-normal text-muted"> — {soilNightDropAttenuation}</span>
									{/if}
								{:else}
									{m.yrs_no_penalty()}
								{/if}
							</p>
							<p class="mt-1 text-xs text-muted">
								{m.agri_soil_night_drop_help()}
							</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.hydricBalance.title}
							helpText={metricHelp.hydricBalance.helpText}
							riskLevel={yrsRisks.hydricBalance}
						>
							<p class="text-2xl font-semibold text-forest-800">
								{data.waterBalance7dMm ?? '—'} mm
							</p>
							<p class="mt-1 text-xs text-muted">
								RR {data.rainPast7dMm} mm − ET₀ {data.et0Past7dSumMm ?? '—'} mm
							</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.wsi.title}
							helpText={metricHelp.wsi.helpText}
							riskLevel={yrsRisks.wsi}
						>
							<p class="text-2xl font-semibold text-forest-800">{data.wsi ?? '—'} mm</p>
							<p class="mt-1 text-xs text-muted">{m.yrs_soil_buffer({ score: data.soilBufferScore })}</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.et0Cumul.title}
							helpText={metricHelp.et0Cumul.helpText}
							riskLevel={yrsRisks.et0Cumul}
						>
							<p class="text-base font-semibold text-forest-800">
								{m.yrs_et0_past_forecast({
									past: `${data.et0Past7dSumMm ?? '—'} mm`,
									forecast: `${data.et0Forecast7dSumMm ?? '—'} mm`
								})}
							</p>
							<p class="mt-1 text-xs text-muted">{m.yrs_et0_cumul_7d()}</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.windStress.title}
							helpText={metricHelp.windStress.helpText}
							riskLevel={yrsRisks.windStress}
						>
							<p class="text-2xl font-semibold text-forest-800">
								{Math.round(data.windStressIndex)}/100
							</p>
							<p class="mt-1 text-xs text-muted">{m.yrs_wind_stress_index()}</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.radiationStress.title}
							helpText={metricHelp.radiationStress.helpText}
							riskLevel={yrsRisks.radiationStress}
						>
							<p class="text-2xl font-semibold text-forest-800">
								{Math.round(data.radiationStressIndex)}/100
							</p>
							<p class="mt-1 text-xs text-muted">
								{Math.round(data.shortwaveRadiationMaxTodayWm2)} W/m²
							</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.heatStress.title}
							helpText={metricHelp.heatStress.helpText}
							riskLevel={yrsRisks.heatStress}
						>
							<p class="text-base font-semibold text-forest-800">
								{data.heatStressDaysPast7d} / {data.heatStressDaysForecast7d}
							</p>
							<p class="mt-1 text-xs text-muted">{m.yrs_heat_days()}</p>
						</AgriMetricCard>

						<AgriMetricCard
							title={metricHelp.frostCombined.title}
							helpText={metricHelp.frostCombined.helpText}
							riskLevel={frostDetailRisk}
						>
							<p class="text-base font-semibold text-forest-800">
								{data.frostEventsPast7d} &lt; 0 °C
							</p>
							<p class="mt-1 text-xs text-muted">
								{m.agri_frost_past_help()}
								{#if data.frostMinNext7dC !== null && data.frostMinNext7dC !== undefined}
									· {m.agri_verdict_frost({ temp: String(data.frostMinNext7dC) })}
								{/if}
							</p>
						</AgriMetricCard>
					</div>
				{/if}

				{#if weeklyViability}
					<div class="mt-4 border-t border-forest-100 pt-4">
						<h6 class="text-xs font-semibold uppercase tracking-wide text-muted">
							{yrsViabilityHeading}
						</h6>
						<ViabilityWeekChart viability={weeklyViability} />
						<p class="mt-2 text-xs text-muted" role="status">
							{#if allDaysRisk}
								{m.yrs_decision_risk()} — {m.yrs_decision_no_go()}
							{:else if viabilityBestDayLine}
								{viabilityBestDayLine}
							{/if}
						</p>
					</div>
				{/if}
			</section>

			<p
				class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950"
				role="note"
			>
				{m.yrs_field_reminder()}
			</p>
		{/if}

		<section class="mt-4">
			<h5 class="text-xs font-semibold uppercase tracking-wide text-muted">{m.yrs_conditions_terrain()}</h5>
			<div class="mt-3 flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3">
				<AgriMetricCard
					title={metricHelp.rain.title}
					helpText={metricHelp.rain.helpText}
					riskLevel={metricRisks?.rain}
				>
					<p class="text-base font-semibold text-forest-800">
						{data.rainPast3dMm} / {data.rainPast5dMm} / {data.rainPast7dMm} mm
					</p>
					<p class="mt-1 text-xs text-muted">{m.yrs_rain_cumul()}</p>
				</AgriMetricCard>
			</div>
		</section>

		<section class="mt-4 border-t border-gray-100 pt-4">
			<h5 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{m.yrs_phenology_section()}</h5>
			<GddPanel {species} {offline} loading={agriLoading} />
		</section>
	{:else}
		<p class="mt-3 text-sm text-muted">{m.yrs_no_agri_data()}</p>
		{#if showRetry}
			<button
				type="button"
				class="mt-3 rounded-lg bg-forest-800 px-4 py-2 text-sm text-white transition active:scale-[0.98]"
				onclick={onretry}
			>
				{m.action_retry()}
			</button>
		{/if}
	{/if}
</div>
