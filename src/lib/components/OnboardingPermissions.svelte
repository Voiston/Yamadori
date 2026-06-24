<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { setOnboardingComplete } from '$lib/utils/onboarding';
	import { openBackgroundLocationSettings } from '$lib/utils/backgroundLocation';
	import {
		requestCameraPermission,
		requestCompassPermission,
		requestLocationPermission,
		requestMicrophonePermission,
		requestNotificationPermission
	} from '$lib/utils/permissions';
	import * as m from '$lib/paraglide/messages.js';

	let { oncomplete }: { oncomplete: () => void } = $props();

	type StepId = 'welcome' | 'location' | 'media' | 'notifications' | 'compass' | 'backup' | 'legal';

	const stepIds: StepId[] = [
		'welcome',
		'location',
		'media',
		'notifications',
		'compass',
		'backup',
		'legal'
	];

	let stepIndex = $state(0);
	let working = $state(false);
	let feedback = $state('');
	let locationGranted = $state(false);

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
			case 'notifications':
				return m.onboarding_notifications_title();
			case 'compass':
				return m.onboarding_compass_title();
			case 'backup':
				return m.onboarding_backup_title();
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
			case 'notifications':
				return m.onboarding_notifications_desc();
			case 'compass':
				return m.onboarding_compass_desc();
			case 'backup':
				return m.onboarding_backup_desc();
			case 'legal':
				return m.onboarding_legal_desc();
		}
	});

	async function handlePrimaryAction() {
		if (currentStepId === 'welcome' || currentStepId === 'backup') {
			stepIndex += 1;
			return;
		}

		if (currentStepId === 'legal') {
			await setOnboardingComplete();
			oncomplete();
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
				case 'notifications': {
					const granted = await requestNotificationPermission();
					feedback = granted
						? m.onboarding_notifications_ok()
						: m.onboarding_notifications_denied();
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
		} finally {
			working = false;
		}
	}

	function handleSkip() {
		if (currentStepId === 'legal') {
			return;
		}
		stepIndex += 1;
	}

	async function handleOpenLocationSettings() {
		await openBackgroundLocationSettings();
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-safe pt-safe sm:items-center"
	role="dialog"
	aria-modal="true"
	aria-labelledby="onboarding-title"
>
	<div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
		<p class="text-xs font-medium uppercase tracking-wide text-muted">
			Étape {stepIndex + 1} / {stepIds.length}
		</p>
		<h2
			id="onboarding-title"
			class="mt-2 font-semibold text-forest-900 {currentStepId === 'legal'
				? 'text-2xl leading-tight sm:text-3xl'
				: 'text-xl'}"
		>
			{currentTitle}
		</h2>
		<p
			class="mt-3 leading-relaxed text-muted {currentStepId === 'legal'
				? 'text-base text-forest-800'
				: 'text-sm'}"
		>
			{currentDescription}
		</p>

		{#if feedback}
			<p class="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
				{feedback}
			</p>
		{/if}

		{#if currentStepId === 'welcome'}
			<p class="mt-4 rounded-xl border border-gray-100 bg-forest-50 px-3 py-2 text-sm text-forest-800">
				{m.onboarding_simple_mode_hint()}
			</p>
		{/if}

		{#if currentStepId === 'location'}
			<button
				type="button"
				onclick={handleOpenLocationSettings}
				class="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98]"
			>
				{m.settings_open_location()}
			</button>
		{/if}

		<div class="mt-6 flex flex-col gap-3">
			<button
				type="button"
				onclick={() => void handlePrimaryAction()}
				disabled={working}
				class="rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
			>
				{#if working}
					{m.climate_loading()}
				{:else if currentStepId === 'welcome'}
					Commencer
				{:else if currentStepId === 'legal'}
					{m.onboarding_legal_accept()}
				{:else if isLastStep}
					Terminer
				{:else}
					Continuer
				{/if}
			</button>

			{#if currentStepId !== 'welcome' && currentStepId !== 'legal'}
				<button
					type="button"
					onclick={handleSkip}
					disabled={working}
					class="rounded-xl px-4 py-2 text-sm font-medium text-muted transition active:scale-[0.98] disabled:opacity-50"
				>
					{isLastStep ? m.onboarding_finish_skip() : m.onboarding_skip()}
				</button>
			{/if}
		</div>
	</div>
</div>
