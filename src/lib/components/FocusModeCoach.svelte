<script lang="ts">
	import TutorialSpotlight from '$lib/components/TutorialSpotlight.svelte';
	import {
		appearanceSettingsState,
		toggleSimpleMode
	} from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { portal, APP_SHELL_PORTAL_TARGET } from '$lib/utils/portal';
	import {
		FOCUS_MODE_TOGGLE_SELECTOR,
		nextFocusModeCoachStep,
		type FocusModeCoachStep
	} from '$lib/utils/focusModeCoach';
	import { findTutorialTarget, scrollTargetIntoView } from '$lib/utils/tutorialSpotlight';
	import { fade } from 'svelte/transition';
	import { MOTION_MS, prefersReducedMotion } from '$lib/utils/motion';
	import { tick } from 'svelte';

	let { ondismiss }: { ondismiss: () => void } = $props();

	const titleId = 'focus-mode-coach-title';
	let highlightTarget = $state<HTMLElement | null>(null);
	let revealing = $state(false);

	let step = $derived<FocusModeCoachStep>(
		appearanceSettingsState.simpleMode ? 'toggle' : nextFocusModeCoachStep('toggle')
	);
	let isYrsStep = $derived(step === 'yrs');

	let title = $derived.by(() => {
		void appearanceSettingsState.locale;
		return isYrsStep ? m.yrs_score_label() : m.focus_mode_coach_title();
	});

	let body = $derived.by(() => {
		void appearanceSettingsState.locale;
		return isYrsStep ? m.tutorial_capture_step_yrs() : m.focus_mode_coach_body();
	});

	let primaryLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return isYrsStep ? m.map_onboarding_got_it() : m.focus_mode_coach_reveal();
	});

	let laterLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.map_layers_coach_later();
	});

	function resolveHighlight(): HTMLElement | null {
		if (step === 'yrs') {
			return findTutorialTarget('yrs');
		}
		return document.querySelector<HTMLElement>(FOCUS_MODE_TOGGLE_SELECTOR);
	}

	async function updateHighlight(signal: AbortSignal) {
		await tick();
		if (signal.aborted) {
			return;
		}

		const el = resolveHighlight();
		if (!el) {
			highlightTarget = null;
			return;
		}

		if (step === 'yrs') {
			await scrollTargetIntoView(el, {
				paddingTop: 16,
				paddingBottom: 120,
				behavior: 'smooth'
			});
			if (signal.aborted) {
				return;
			}
		}

		highlightTarget = el;
	}

	async function handleReveal() {
		if (revealing || isYrsStep) {
			return;
		}
		revealing = true;
		try {
			if (appearanceSettingsState.simpleMode) {
				await toggleSimpleMode();
			}
		} finally {
			revealing = false;
		}
	}

	function handlePrimary() {
		if (isYrsStep) {
			ondismiss();
			return;
		}
		void handleReveal();
	}

	$effect(() => {
		const controller = new AbortController();
		const current = step;
		void appearanceSettingsState.simpleMode;
		void current;
		void updateHighlight(controller.signal);
		return () => {
			controller.abort();
		};
	});
</script>

<div
	use:portal={APP_SHELL_PORTAL_TARGET}
	class="pointer-events-none fixed inset-0 z-[55]"
	role="presentation"
>
	<TutorialSpotlight target={highlightTarget} />
	<div
		class="pointer-events-none fixed inset-x-0 z-[56] px-3 pt-2"
		style="top: calc(3.5rem + env(safe-area-inset-top, 0px))"
	>
		<div
			class="app-card pointer-events-auto ml-auto w-[min(100vw-1.5rem,20rem)] px-3 pb-3 pt-2 shadow-sm"
			role="dialog"
			aria-modal="false"
			aria-labelledby={titleId}
			transition:fade={{ duration: prefersReducedMotion() ? 0 : MOTION_MS.fast }}
		>
			<h2 id={titleId} class="text-sm font-semibold text-forest-900">{title}</h2>
			<p class="mt-1 text-sm leading-snug text-muted">{body}</p>
			<div class="mt-2 flex flex-col gap-1.5">
				<button
					type="button"
					class="btn-primary !h-9 text-sm"
					disabled={revealing}
					onclick={handlePrimary}
				>
					{primaryLabel}
				</button>
				{#if !isYrsStep}
					<button
						type="button"
						class="rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium text-muted transition active:scale-[0.98]"
						onclick={ondismiss}
					>
						{laterLabel}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
