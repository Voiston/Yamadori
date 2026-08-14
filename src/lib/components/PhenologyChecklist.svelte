<script lang="ts">
	import {
		getAoutementOptions,
		getLeafFallOptions,
		getPhenologyObservedOptions
	} from '$lib/constants/assessment';
	import AssessmentFieldHelp from '$lib/components/AssessmentFieldHelp.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { isEvergreenSpecies } from '$lib/constants/gdd-config';
	import type { TreeAssessment } from '$lib/types/tree';
	import * as m from '$lib/paraglide/messages.js';

	let {
		assessment = $bindable({} as TreeAssessment),
		species = '',
		disabled = false,
		onChange
	}: {
		assessment?: TreeAssessment;
		species?: string;
		disabled?: boolean;
		onChange?: (next: TreeAssessment) => void | Promise<void>;
	} = $props();

	const phenologyOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getPhenologyObservedOptions(species);
	});
	const aoutementOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getAoutementOptions();
	});
	const leafFallOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getLeafFallOptions();
	});
	const showLeafFall = $derived(!species.trim() || !isEvergreenSpecies(species));

	const stageLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.assessment_phenology_checklist();
	});
	const stageHelp = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.assessment_help_phenology_stage();
	});
	const aoutementLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.assessment_aoutement();
	});
	const aoutementHelp = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.assessment_help_aoutement();
	});
	const leafFallLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.assessment_leaf_fall();
	});
	const leafFallHelp = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.assessment_help_leaf_fall();
	});

	async function toggleChip<K extends keyof TreeAssessment>(key: K, value: TreeAssessment[K]) {
		const next = {
			...assessment,
			[key]: assessment[key] === value ? null : value
		} as TreeAssessment;
		assessment = next;
		await onChange?.(next);
	}

	function chipClass(active: boolean): string {
		return `rounded-full px-3 py-2 text-sm transition active:scale-[0.98] disabled:opacity-50 ${
			active
				? 'bg-forest-800 text-white'
				: 'border border-gray-200 bg-white text-forest-900'
		}`;
	}
</script>

<div class="flex flex-col gap-4">
	<AssessmentFieldHelp label={stageLabel} helpText={stageHelp}>
		<div class="flex flex-wrap gap-2">
			{#each phenologyOptions as option (option.value)}
				<button
					type="button"
					{disabled}
					onclick={() => void toggleChip('observedPhenologyStage', option.value)}
					class={chipClass(assessment.observedPhenologyStage === option.value)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</AssessmentFieldHelp>

	<AssessmentFieldHelp label={aoutementLabel} helpText={aoutementHelp}>
		<div class="flex flex-wrap gap-2">
			{#each aoutementOptions as option (option.value)}
				<button
					type="button"
					{disabled}
					onclick={() => void toggleChip('aoutementStatus', option.value)}
					class={chipClass(assessment.aoutementStatus === option.value)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</AssessmentFieldHelp>

	{#if showLeafFall}
		<AssessmentFieldHelp label={leafFallLabel} helpText={leafFallHelp}>
			<div class="flex flex-wrap gap-2">
				{#each leafFallOptions as option (option.value)}
					<button
						type="button"
						{disabled}
						onclick={() => void toggleChip('leafFallPct', option.value)}
						class={chipClass(assessment.leafFallPct === option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</AssessmentFieldHelp>
	{/if}
</div>
