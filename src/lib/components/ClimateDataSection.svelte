<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { agriData, loadAgriData } from '$lib/stores/agriData.svelte';
	import type { ClimateHistory } from '$lib/types/climate';
	import type { PhenologyStageId } from '$lib/types/gdd';
	import type { CernageStatus, YrsDecision } from '$lib/types/yrs';
	import type { EnvironmentExposure } from '$lib/types/environment';
	import AgriPanel from './AgriPanel.svelte';
	import ClimatePanel from './ClimatePanel.svelte';
	import { resolveCountry } from '$lib/geo/resolveCountry';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		climate: ClimateHistory | null;
		loading?: boolean;
		error?: string | null;
		approximate?: boolean;
		offline?: boolean;
		species?: string;
		observedPhenologyStage?: PhenologyStageId | null;
		cernageStatus?: CernageStatus | null;
		environmentExposure?: EnvironmentExposure;
		latitude?: number | null;
		longitude?: number | null;
		onretry?: () => void;
		open?: boolean;
	}

	let {
		climate,
		loading = false,
		error = null,
		approximate = false,
		offline = false,
		species = '',
		observedPhenologyStage = null,
		cernageStatus = null,
		environmentExposure = 'OPEN',
		latitude = null,
		longitude = null,
		onretry,
		open = $bindable(false)
	}: Props = $props();

	let climateFetchRequested = $state(false);

	const yrs = $derived(agriData.data?.yrs ?? null);
	const showFranceCalibrationDisclaimer = $derived(
		latitude != null &&
			longitude != null &&
			resolveCountry(latitude, longitude) !== 'FR'
	);

	const yrsDecisionLabels = $derived.by((): Record<YrsDecision, string> => {
		void appearanceSettingsState.locale;
		return {
			OPTIMAL: m.yrs_decision_optimal(),
			ACCEPTABLE: m.yrs_decision_acceptable(),
			RISK: m.yrs_decision_risk(),
			NO_GO: m.yrs_decision_no_go()
		};
	});

	function yrsDecisionClass(decision: YrsDecision): string {
		if (decision === 'OPTIMAL') return 'text-emerald-700';
		if (decision === 'ACCEPTABLE') return 'text-amber-700';
		if (decision === 'RISK') return 'text-orange-700';
		return 'text-red-700';
	}

	$effect(() => {
		if (!open) {
			climateFetchRequested = false;
			return;
		}
		if (latitude === null || longitude === null) {
			return;
		}

		void loadAgriData(latitude, longitude, false, {
			species,
			observedPhenologyStage,
			cernageStatus,
			environmentExposure
		});

		if (!climate && !loading && !climateFetchRequested && onretry) {
			climateFetchRequested = true;
			onretry();
		}
	});
</script>

<details class="rounded-lg border border-gray-200 bg-white" bind:open>
	<summary class="cursor-pointer px-4 py-3 font-medium text-forest-900 select-none">
		{m.climate_section_title()}
		{#if yrs}
			<span class="ml-2 text-sm font-normal text-muted">
				YRS <strong class={yrsDecisionClass(yrs.decision)}>{yrs.score}</strong>
				<span class={yrsDecisionClass(yrs.decision)}>({yrsDecisionLabels[yrs.decision]})</span>
			</span>
		{:else if agriData.loading}
			<span class="ml-2 text-sm font-normal text-muted">{m.climate_loading()}</span>
		{/if}
	</summary>

	<div class="border-t border-gray-100 px-4 py-3">
		{#if showFranceCalibrationDisclaimer}
			<p class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950" role="status">
				{m.gdd_france_calibration_disclaimer()}
			</p>
		{/if}
		<AgriPanel
			{approximate}
			{offline}
			{species}
			{observedPhenologyStage}
			{cernageStatus}
			{environmentExposure}
			{loading}
			{onretry}
		/>

		{#if climate || loading || error}
			<div class="mt-4 border-t border-gray-100 pt-4">
				<ClimatePanel {climate} {loading} error={error ?? ''} {approximate} {offline} {onretry} />
			</div>
		{/if}
	</div>
</details>
