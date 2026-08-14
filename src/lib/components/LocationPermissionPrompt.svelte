<script lang="ts">
	import OnboardingStepPanel from '$lib/components/OnboardingStepPanel.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import {
		portal,
		BODY_PORTAL_TARGET,
		ONBOARDING_PANEL_CLASS
	} from '$lib/utils/portal';
	import { sheetBackdrop, sheetPanel } from '$lib/utils/motion';

	let {
		message,
		showTutorial = false,
		busy = false,
		onenable,
		oncontinue
	}: {
		message: string;
		showTutorial?: boolean;
		busy?: boolean;
		onenable?: () => void;
		oncontinue?: () => void;
	} = $props();

	let progress = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.gps_enable_before_photo_title();
	});

	let title = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_location_title();
	});

	let enableLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return busy ? m.climate_loading() : m.gps_enable_action();
	});

	let continueLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.gps_continue_without();
	});

	let tutorialIntro = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.gps_settings_tutorial_intro();
	});

	let tutorialSteps = $derived.by(() => {
		void appearanceSettingsState.locale;
		return [
			m.gps_settings_tutorial_step1(),
			m.gps_settings_tutorial_step2(),
			m.gps_settings_tutorial_step3(),
			m.gps_settings_tutorial_step4(),
			m.gps_settings_tutorial_step5()
		];
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !busy) {
			oncontinue?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	use:portal={BODY_PORTAL_TARGET}
	data-yamadori-onboarding-overlay
	class="fixed inset-0 z-50 flex items-end pb-onboarding-sheet pt-safe sm:items-center sm:justify-center sm:px-4"
	role="presentation"
>
	<div class="absolute inset-0 bg-black/50" transition:sheetBackdrop role="presentation"></div>
	<div
		class="relative z-10 w-full"
		transition:sheetPanel
		role="dialog"
		aria-modal="true"
		aria-labelledby="location-permission-title"
	>
		{#snippet actions()}
		<button
			type="button"
			onclick={() => onenable?.()}
			disabled={busy}
			class="btn-primary"
		>
			{enableLabel}
		</button>

		<button
			type="button"
			onclick={() => oncontinue?.()}
			disabled={busy}
			class="rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium text-muted transition active:scale-[0.98] disabled:opacity-50"
		>
			{continueLabel}
		</button>
		{/snippet}

		{#if showTutorial}
			<OnboardingStepPanel
				{progress}
				{title}
				titleId="location-permission-title"
				description={message}
				panelClass="{ONBOARDING_PANEL_CLASS} w-full"
				{actions}
			>
				{#snippet middle()}
					<div
						class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
						role="status"
					>
						<p class="font-medium leading-snug">{tutorialIntro}</p>
						<ol class="mt-3 list-decimal space-y-2 pl-5 leading-snug">
							{#each tutorialSteps as step, index (index)}
								<li>{step}</li>
							{/each}
						</ol>
					</div>
				{/snippet}
			</OnboardingStepPanel>
		{:else}
			<OnboardingStepPanel
				{progress}
				{title}
				titleId="location-permission-title"
				description={message}
				panelClass="{ONBOARDING_PANEL_CLASS} w-full"
				{actions}
			/>
		{/if}
	</div>
</div>
