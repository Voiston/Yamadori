<script lang="ts">
	import type { TreeAssessment } from '$lib/types/tree';
	import { getAssessmentSummary } from '$lib/constants/assessment';
	import * as m from '$lib/paraglide/messages.js';

	let {
		assessment = $bindable({} as TreeAssessment),
		submitting = false,
		caliberOptions,
		nebariOptions,
		barkOptions = [],
		deadwoodOptions = [],
		sizeOptions = []
	}: {
		assessment?: TreeAssessment;
		submitting?: boolean;
		caliberOptions: Array<{ value: TreeAssessment['caliber']; label: string }>;
		nebariOptions: Array<{ value: TreeAssessment['nebari']; label: string }>;
		barkOptions?: Array<{ value: TreeAssessment['bark']; label: string }>;
		deadwoodOptions?: Array<{ value: TreeAssessment['deadwood']; label: string }>;
		sizeOptions?: Array<{ value: TreeAssessment['sizeClass']; label: string }>;
	} = $props();

	let open = $state(false);
	let moreOpen = $state(false);

	let assessmentSummary = $derived(getAssessmentSummary(assessment));

	function toggleChip<K extends keyof TreeAssessment>(key: K, value: TreeAssessment[K]) {
		assessment = {
			...assessment,
			[key]: assessment[key] === value ? null : value
		};
	}
</script>

<section class="rounded-xl border border-gray-100 bg-white shadow-sm" data-capture-tutorial="assessment">
	<button
		type="button"
		class="flex w-full items-center justify-between gap-3 p-4 text-left"
		onclick={() => (open = !open)}
		aria-expanded={open}
	>
		<div>
			<h3 class="text-sm font-medium text-forest-900">{m.capture_quick_assessment()}</h3>
			<p class="mt-1 text-sm text-muted">
				{!open && assessmentSummary ? assessmentSummary : m.capture_quick_assessment_hint()}
			</p>
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
		<div class="flex flex-col gap-4 border-t border-gray-100 p-4">
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium text-forest-900">
					{m.assessment_potential()} (1–10) : {assessment.potentialScore ?? '—'}/10
				</span>
				<div class="grid grid-cols-5 gap-2 narrow:gap-1">
					{#each Array.from({ length: 10 }, (_, index) => index + 1) as score (score)}
						<button
							type="button"
							disabled={submitting}
							onclick={() => toggleChip('potentialScore', score)}
							class="flex h-10 items-center justify-center rounded-lg text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 narrow:text-xs {assessment.potentialScore ===
							score
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{score}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium text-forest-900">{m.assessment_caliber()}</span>
				<div class="flex flex-wrap gap-2">
					{#each caliberOptions as option (option.value)}
						<button
							type="button"
							disabled={submitting}
							onclick={() => toggleChip('caliber', option.value)}
							class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] disabled:opacity-50 {assessment.caliber ===
							option.value
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium text-forest-900">{m.assessment_nebari()}</span>
				<div class="flex flex-wrap gap-2">
					{#each nebariOptions as option (option.value)}
						<button
							type="button"
							disabled={submitting}
							onclick={() => toggleChip('nebari', option.value)}
							class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] disabled:opacity-50 {assessment.nebari ===
							option.value
								? 'bg-forest-800 text-white'
								: 'border border-gray-200 bg-white text-forest-900'}"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

			<details bind:open={moreOpen} class="rounded-lg border border-gray-100 bg-gray-50/80">
				<summary class="cursor-pointer px-3 py-2.5 text-sm font-medium text-forest-900">
					{m.capture_assessment_more()}
				</summary>
				<div class="flex flex-col gap-4 border-t border-gray-100 p-3">
					{#if sizeOptions.length > 0}
						<div class="flex flex-col gap-2">
							<span class="text-sm font-medium text-forest-900">{m.assessment_size()}</span>
							<div class="flex flex-wrap gap-2">
								{#each sizeOptions as option (option.value)}
									<button
										type="button"
										disabled={submitting}
										onclick={() => toggleChip('sizeClass', option.value)}
										class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] disabled:opacity-50 {assessment.sizeClass ===
										option.value
											? 'bg-forest-800 text-white'
											: 'border border-gray-200 bg-white text-forest-900'}"
									>
										{option.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<div class="flex flex-col gap-2">
						<label for="capture-trunk-diameter" class="text-sm font-medium text-forest-900">
							{m.assessment_trunk_diameter()}
						</label>
						<input
							id="capture-trunk-diameter"
							type="number"
							min="0"
							step="0.5"
							disabled={submitting}
							value={assessment.trunkDiameterCm ?? ''}
							oninput={(e) => {
								const value = e.currentTarget.value;
								assessment = {
									...assessment,
									trunkDiameterCm: value === '' ? null : Number.parseFloat(value)
								};
							}}
							class="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-base text-forest-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
						/>
					</div>

					{#if barkOptions.length > 0}
						<div class="flex flex-col gap-2">
							<span class="text-sm font-medium text-forest-900">{m.assessment_bark()}</span>
							<div class="flex flex-wrap gap-2">
								{#each barkOptions as option (option.value)}
									<button
										type="button"
										disabled={submitting}
										onclick={() => toggleChip('bark', option.value)}
										class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] disabled:opacity-50 {assessment.bark ===
										option.value
											? 'bg-forest-800 text-white'
											: 'border border-gray-200 bg-white text-forest-900'}"
									>
										{option.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if deadwoodOptions.length > 0}
						<div class="flex flex-col gap-2">
							<span class="text-sm font-medium text-forest-900">{m.assessment_deadwood()}</span>
							<div class="flex flex-wrap gap-2">
								{#each deadwoodOptions as option (option.value)}
									<button
										type="button"
										disabled={submitting}
										onclick={() => toggleChip('deadwood', option.value)}
										class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] disabled:opacity-50 {assessment.deadwood ===
										option.value
											? 'bg-forest-800 text-white'
											: 'border border-gray-200 bg-white text-forest-900'}"
									>
										{option.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</details>
		</div>
	{/if}
</section>
