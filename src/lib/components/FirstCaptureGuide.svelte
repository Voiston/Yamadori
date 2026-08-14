<script lang="ts">
	import OnboardingStepPanel from '$lib/components/OnboardingStepPanel.svelte';
	import TutorialSpotlight from '$lib/components/TutorialSpotlight.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { teardownCaptureTutorial } from '$lib/utils/captureTutorialTeardown';
	import {
		findTutorialTarget,
		scrollTargetIntoView,
		setTutorialScrollMargins
	} from '$lib/utils/tutorialSpotlight';
	import { ONBOARDING_PANEL_CLASS } from '$lib/utils/portal';
	import { onDestroy, onMount, tick } from 'svelte';

	export type CaptureTutorialTarget =
		| 'photo'
		| 'gps'
		| 'yrs'
		| 'species'
		| 'voice'
		| 'assessment'
		| 'cadastre'
		| 'save';

	const ALL_STEPS: CaptureTutorialTarget[] = [
		'photo',
		'gps',
		'yrs',
		'species',
		'voice',
		'assessment',
		'cadastre',
		'save'
	];

	const TOP_PANEL_STEPS = new Set<CaptureTutorialTarget>([
		'yrs',
		'species',
		'voice',
		'assessment',
		'cadastre',
		'save'
	]);

	function isTopPanelStep(step: CaptureTutorialTarget | null): boolean {
		return step !== null && TOP_PANEL_STEPS.has(step);
	}

	let { onskip }: { onskip: () => void } = $props();

	let stepIndex = $state(0);
	let activeSteps = $state<CaptureTutorialTarget[]>([...ALL_STEPS]);
	let highlightTarget = $state<HTMLElement | null>(null);
	let panelEl = $state<HTMLDivElement | null>(null);
	let firstScroll = $state(true);

	const messageForStep = (step: CaptureTutorialTarget): string => {
		void appearanceSettingsState.locale;
		switch (step) {
			case 'photo':
				return m.tutorial_capture_step_photo();
			case 'gps':
				return m.tutorial_capture_step_gps();
			case 'yrs':
				return m.tutorial_capture_step_yrs();
			case 'species':
				return m.tutorial_capture_step_species();
			case 'voice':
				return m.tutorial_capture_step_voice();
			case 'assessment':
				return m.tutorial_capture_step_assessment();
			case 'cadastre':
				return m.tutorial_capture_step_cadastre();
			case 'save':
				return m.tutorial_capture_step_save();
		}
	};

	let currentStep = $derived(activeSteps[stepIndex] ?? null);
	let currentMessage = $derived(currentStep ? messageForStep(currentStep) : '');
	let isLastStep = $derived(stepIndex >= activeSteps.length - 1);
	let panelAtTop = $derived(isTopPanelStep(currentStep));

	function refreshVisibleSteps() {
		activeSteps = ALL_STEPS.filter((step) => findTutorialTarget(step) !== null);
		if (stepIndex >= activeSteps.length) {
			stepIndex = Math.max(0, activeSteps.length - 1);
		}
	}

	async function updateHighlight(signal: AbortSignal) {
		await tick();
		if (signal.aborted) {
			return;
		}

		const step = activeSteps[stepIndex];
		if (!step) {
			highlightTarget = null;
			return;
		}

		const el = findTutorialTarget(step);
		if (!el) {
			if (step === 'cadastre' && stepIndex < activeSteps.length - 1) {
				stepIndex += 1;
				await updateHighlight(signal);
				return;
			}
			highlightTarget = null;
			return;
		}

		const panelHeight = panelEl?.offsetHeight ?? 0;
		const paddingTop = panelAtTop ? panelHeight + 16 : 16;
		const paddingBottom = panelAtTop ? 16 : panelHeight + 16;
		setTutorialScrollMargins(paddingTop, paddingBottom);

		await scrollTargetIntoView(el, {
			paddingTop,
			paddingBottom,
			behavior: firstScroll ? 'smooth' : 'instant'
		});
		if (signal.aborted) {
			return;
		}

		firstScroll = false;
		highlightTarget = el;
	}

	function advanceStep() {
		if (isLastStep) {
			return;
		}
		stepIndex += 1;
	}

	function handleSkip() {
		onskip();
	}

	onMount(() => {
		refreshVisibleSteps();
	});

	onDestroy(() => {
		teardownCaptureTutorial();
	});

	$effect(() => {
		const controller = new AbortController();
		const index = stepIndex;
		const steps = activeSteps;
		const top = panelAtTop;
		const panelHeight = panelEl?.offsetHeight ?? 0;
		void index;
		void steps;
		void top;
		void panelHeight;
		void updateHighlight(controller.signal);

		return () => {
			controller.abort();
		};
	});
</script>

<div data-capture-tutorial-overlay class="pointer-events-none fixed inset-0 z-[55]" aria-hidden="true">
	<TutorialSpotlight target={highlightTarget} />
</div>

<div
	data-capture-tutorial-overlay
	class="fixed inset-x-0 z-[56] pointer-events-auto {panelAtTop
		? 'top-0 px-4 pt-safe'
		: 'bottom-0'}"
	role="region"
	aria-label={m.tutorial_capture_progress({
		current: String(stepIndex + 1),
		total: String(activeSteps.length)
	})}
>
	<OnboardingStepPanel
		bind:panelRef={panelEl}
		progress={m.tutorial_capture_progress({
			current: String(stepIndex + 1),
			total: String(activeSteps.length)
		})}
		description={currentMessage}
		panelClass={panelAtTop ? 'mx-4 mt-4' : ONBOARDING_PANEL_CLASS}
		descriptionClass="text-sm leading-relaxed text-forest-900"
	>
		{#snippet actions()}
			{#if isLastStep}
				<button
					type="button"
					class="rounded-xl bg-forest-800 px-4 py-2.5 text-sm font-semibold text-white"
					onclick={handleSkip}
				>
					{m.tutorial_capture_done()}
				</button>
			{:else}
				<button
					type="button"
					class="rounded-xl bg-forest-800 px-4 py-2.5 text-sm font-semibold text-white"
					onclick={advanceStep}
				>
					{m.tutorial_capture_continue()}
				</button>
			{/if}
			<button
				type="button"
				class="rounded-xl px-4 py-2 text-sm font-medium text-muted"
				onclick={handleSkip}
			>
				{m.tutorial_capture_skip()}
			</button>
		{/snippet}
	</OnboardingStepPanel>
</div>
