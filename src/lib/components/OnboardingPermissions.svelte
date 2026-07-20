<script lang="ts">
	import OnboardingStepPanel from '$lib/components/OnboardingStepPanel.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import {
		requestCameraPermission,
		requestCompassPermission,
		requestLocationPermission,
		requestMicrophonePermission
	} from '$lib/utils/permissions';
	import * as m from '$lib/paraglide/messages.js';
	import { portal, BODY_PORTAL_TARGET, ONBOARDING_OVERLAY_CLASS, ONBOARDING_PANEL_CLASS } from '$lib/utils/portal';

	let { onphasecomplete }: { onphasecomplete: () => void } = $props();

	type StepId = 'welcome' | 'location' | 'media' | 'compass' | 'capture_intro' | 'legal';

	const stepIds: StepId[] = ['welcome', 'location', 'media', 'compass', 'capture_intro', 'legal'];

	let stepIndex = $state(0);
	let working = $state(false);
	let feedback = $state('');
	let locationGranted = $state(false);

	function blurActiveElement() {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	}

	function advanceStep() {
		stepIndex += 1;
		blurActiveElement();
	}

	let currentStepId = $derived(stepIds[stepIndex]);
	let isLastStep = $derived(stepIndex >= stepIds.length - 1);

	let currentTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		switch (currentStepId) {
			case 'welcome':
				return m.onboarding_welcome_title();
			case 'location':
				return m.onboarding_location_title();
			case 'media':
				return m.onboarding_camera_title();
			case 'compass':
				return m.onboarding_compass_title();
			case 'capture_intro':
				return m.onboarding_capture_intro_title();
			case 'legal':
				return m.onboarding_legal_title();
		}
	});

	let currentDescription = $derived.by(() => {
		void appearanceSettingsState.locale;
		switch (currentStepId) {
			case 'welcome':
				return m.onboarding_welcome_desc();
			case 'location':
				return m.onboarding_location_desc();
			case 'media':
				return m.onboarding_camera_desc();
			case 'compass':
				return m.onboarding_compass_desc();
			case 'capture_intro':
				return m.onboarding_capture_intro_desc();
			case 'legal':
				return m.onboarding_legal_desc();
		}
	});

	let titleClass = $derived(
		currentStepId === 'legal' ? 'text-2xl leading-tight sm:text-3xl' : 'text-xl'
	);

	let descriptionClass = $derived(
		currentStepId === 'legal' ? 'text-base text-forest-800' : 'text-sm'
	);

	async function handlePrimaryAction() {
		if (currentStepId === 'welcome' || currentStepId === 'capture_intro') {
			advanceStep();
			return;
		}

		if (currentStepId === 'legal') {
			blurActiveElement();
			onphasecomplete();
			return;
		}

		working = true;
		feedback = '';

		try {
			switch (currentStepId) {
				case 'location': {
					locationGranted = await requestLocationPermission();
					feedback = locationGranted
						? m.onboarding_location_ok()
						: m.onboarding_location_denied();
					break;
				}
				case 'media': {
					const cameraOk = await requestCameraPermission();
					const micOk = await requestMicrophonePermission();
					if (cameraOk && micOk) {
						feedback = m.onboarding_camera_ok();
					} else if (cameraOk || micOk) {
						feedback = m.onboarding_camera_partial();
					} else {
						feedback = m.onboarding_camera_denied();
					}
					break;
				}
				case 'compass': {
					const granted = await requestCompassPermission();
					feedback = granted
						? m.onboarding_compass_ok()
						: m.onboarding_compass_denied();
					break;
				}
			}

			stepIndex += 1;
			blurActiveElement();
		} finally {
			working = false;
		}
	}

	function handleSkip() {
		if (currentStepId === 'legal') {
			return;
		}
		advanceStep();
	}
</script>

<div
	use:portal={BODY_PORTAL_TARGET}
	data-yamadori-onboarding-overlay
	class={ONBOARDING_OVERLAY_CLASS}
	role="dialog"
	aria-modal="true"
	aria-labelledby="onboarding-title"
>
	<OnboardingStepPanel
		progress={m.onboarding_step({ current: stepIndex + 1, total: stepIds.length })}
		title={currentTitle}
		titleId="onboarding-title"
		description={currentDescription}
		{titleClass}
		{descriptionClass}
		panelClass="{ONBOARDING_PANEL_CLASS} w-full"
	>
		{#snippet middle()}
			{#if feedback}
				<p class="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
					{feedback}
				</p>
			{/if}

			{#if currentStepId === 'welcome'}
				<p class="rounded-xl border border-gray-100 bg-forest-50 px-3 py-2 text-sm text-forest-800">
					{m.onboarding_simple_mode_hint()}
				</p>
			{/if}
		{/snippet}

		{#snippet actions()}
			<button
				type="button"
				onclick={() => void handlePrimaryAction()}
				disabled={working}
				class="rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] focus:outline-none disabled:opacity-50"
			>
				{#if working}
					{m.climate_loading()}
				{:else if currentStepId === 'welcome'}
					{m.onboarding_start()}
				{:else if currentStepId === 'capture_intro'}
					{m.onboarding_capture_intro_start()}
				{:else if currentStepId === 'legal'}
					{m.onboarding_legal_accept()}
				{:else if isLastStep}
					{m.onboarding_finish()}
				{:else}
					{m.onboarding_continue()}
				{/if}
			</button>

			{#if currentStepId !== 'welcome' && currentStepId !== 'legal'}
				<button
					type="button"
					onclick={handleSkip}
					disabled={working}
					class="rounded-xl px-4 py-2 text-sm font-medium text-muted transition active:scale-[0.98] focus:outline-none disabled:opacity-50"
				>
					{isLastStep ? m.onboarding_finish_skip() : m.onboarding_skip()}
				</button>
			{/if}
		{/snippet}
	</OnboardingStepPanel>
</div>
