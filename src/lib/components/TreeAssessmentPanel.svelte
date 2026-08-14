<script lang="ts">
	import {
		getAssessmentSummary,
		getBarkOptions,
		getCaliberOptions,
		getCernageOptions,
		getDeadwoodOptions,
		getNebariOptions,
		getSizeOptions
	} from '$lib/constants/assessment';
	import AssessmentFieldHelp from '$lib/components/AssessmentFieldHelp.svelte';
	import PhenologyChecklist from '$lib/components/PhenologyChecklist.svelte';
	import { loadAgriData } from '$lib/stores/agriData.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { updateAssessment } from '$lib/stores/trees.svelte';
	import type { DeadwoodFeature, Tree, TreeAssessment } from '$lib/types/tree';
	import * as m from '$lib/paraglide/messages.js';

	let { tree }: { tree: Tree } = $props();

	let open = $state(false);

	const nebariOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getNebariOptions();
	});
	const barkOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getBarkOptions();
	});
	const deadwoodOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getDeadwoodOptions();
	});
	const sizeOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getSizeOptions();
	});
	const caliberOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getCaliberOptions();
	});
	const cernageOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getCernageOptions();
	});

	const potentialLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return `${m.assessment_potential()} : ${tree.assessment.potentialScore ?? '—'}/10`;
	});

	async function saveAssessment(assessment: TreeAssessment) {
		await updateAssessment(tree.id, assessment);
	}

	async function updateField<K extends keyof TreeAssessment>(key: K, value: TreeAssessment[K]) {
		const assessment = { ...tree.assessment, [key]: value };
		await saveAssessment(assessment);

		if (
			(key === 'observedPhenologyStage' ||
				key === 'cernageStatus' ||
				key === 'aoutementStatus' ||
				key === 'leafFallPct') &&
			tree.latitude !== null &&
			tree.longitude !== null
		) {
			void loadAgriData(tree.latitude, tree.longitude, false, {
				species: tree.species,
				observedPhenologyStage: assessment.observedPhenologyStage,
				cernageStatus: assessment.cernageStatus,
				aoutementStatus: assessment.aoutementStatus,
				leafFallPct: assessment.leafFallPct,
				environmentExposure: tree.environmentExposure
			});
		}
	}

	async function toggleChip<K extends keyof TreeAssessment>(
		key: K,
		value: TreeAssessment[K],
		current: TreeAssessment[K]
	) {
		await updateField(key, (current === value ? null : value) as TreeAssessment[K]);
	}

	async function toggleDeadwood(feature: DeadwoodFeature) {
		const current = tree.assessment.deadwood ?? [];
		const next = current.includes(feature)
			? current.filter((entry) => entry !== feature)
			: [...current, feature];
		await updateField('deadwood', next);
	}

	let summary = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getAssessmentSummary(tree.assessment);
	});
</script>

<section class="app-card">
	<button
		type="button"
		class="flex w-full items-center justify-between gap-3 p-4 text-left"
		onclick={() => (open = !open)}
		aria-expanded={open}
	>
		<div>
			<h3 class="text-sm font-medium text-forest-900">{m.assessment_title()}</h3>
			{#if summary}
				<p class="mt-1 text-sm text-muted">{summary}</p>
			{:else}
				<p class="mt-1 text-sm text-muted">{m.assessment_evaluate()}</p>
			{/if}
		</div>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="h-5 w-5 shrink-0 text-muted transition {open ? 'rotate-180' : ''}"
			aria-hidden="true"
		>
			<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>

	{#if open}
		<div class="flex flex-col gap-5 border-t border-gray-100 p-4">
			<PhenologyChecklist
				assessment={tree.assessment}
				species={tree.species}
				onChange={async (next) => {
					await saveAssessment(next);
					if (tree.latitude !== null && tree.longitude !== null) {
						void loadAgriData(tree.latitude, tree.longitude, false, {
							species: tree.species,
							observedPhenologyStage: next.observedPhenologyStage,
							cernageStatus: next.cernageStatus,
							aoutementStatus: next.aoutementStatus,
							leafFallPct: next.leafFallPct,
							environmentExposure: tree.environmentExposure
						});
					}
				}}
			/>

			<AssessmentFieldHelp label={m.assessment_nebari()} helpText={m.assessment_help_nebari()}>
				<div class="flex flex-wrap gap-2">
					{#each nebariOptions as option (option.value)}
						<button
							type="button"
							onclick={() => toggleChip('nebari', option.value, tree.assessment.nebari)}
							class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] {tree.assessment.nebari ===
							option.value
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</AssessmentFieldHelp>

			<AssessmentFieldHelp
				label={m.assessment_trunk_diameter()}
				helpText={m.assessment_help_trunk_diameter()}
			>
				<input
					id="trunk-diameter"
					type="number"
					min="0"
					step="0.5"
					value={tree.assessment.trunkDiameterCm ?? ''}
					onchange={(e) => {
						const value = e.currentTarget.value;
						void updateField(
							'trunkDiameterCm',
							value === '' ? null : Number.parseFloat(value)
						);
					}}
					class="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base text-forest-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
				/>
			</AssessmentFieldHelp>

			<AssessmentFieldHelp label={m.assessment_bark()} helpText={m.assessment_help_bark()}>
				<div class="flex flex-wrap gap-2">
					{#each barkOptions as option (option.value)}
						<button
							type="button"
							onclick={() => toggleChip('bark', option.value, tree.assessment.bark)}
							class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] {tree.assessment.bark ===
							option.value
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</AssessmentFieldHelp>

			<AssessmentFieldHelp label={m.assessment_deadwood()} helpText={m.assessment_help_deadwood()}>
				<div class="flex flex-wrap gap-2">
					{#each deadwoodOptions as option (option.value)}
						<button
							type="button"
							onclick={() => void toggleDeadwood(option.value)}
							class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] {(tree.assessment
								.deadwood ?? []
							).includes(option.value)
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</AssessmentFieldHelp>

			<AssessmentFieldHelp label={m.assessment_size()} helpText={m.assessment_help_size()}>
				<div class="flex flex-wrap gap-2">
					{#each sizeOptions as option (option.value)}
						<button
							type="button"
							onclick={() => toggleChip('sizeClass', option.value, tree.assessment.sizeClass)}
							class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] {tree.assessment.sizeClass ===
							option.value
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</AssessmentFieldHelp>

			<AssessmentFieldHelp label={m.assessment_caliber()} helpText={m.assessment_help_caliber()}>
				<div class="flex flex-wrap gap-2">
					{#each caliberOptions as option (option.value)}
						<button
							type="button"
							onclick={() => toggleChip('caliber', option.value, tree.assessment.caliber)}
							class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] {tree.assessment.caliber ===
							option.value
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</AssessmentFieldHelp>

			<AssessmentFieldHelp label={m.assessment_cernage()} helpText={m.assessment_help_cernage()}>
				<div class="flex flex-wrap gap-2">
					{#each cernageOptions as option (option.value)}
						<button
							type="button"
							onclick={() =>
								toggleChip('cernageStatus', option.value, tree.assessment.cernageStatus)}
							class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] {tree.assessment.cernageStatus ===
							option.value
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</AssessmentFieldHelp>

			<AssessmentFieldHelp label={potentialLabel} helpText={m.assessment_help_potential()}>
				<div class="grid grid-cols-5 gap-2 narrow:gap-1">
					{#each Array.from({ length: 10 }, (_, i) => i + 1) as score (score)}
						<button
							type="button"
							onclick={() => toggleChip('potentialScore', score, tree.assessment.potentialScore)}
							class="flex h-10 items-center justify-center rounded-lg text-sm font-medium transition active:scale-[0.98] narrow:text-xs {tree.assessment.potentialScore ===
							score
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{score}
						</button>
					{/each}
				</div>
			</AssessmentFieldHelp>
		</div>
	{/if}
</section>
