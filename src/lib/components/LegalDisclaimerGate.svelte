<script lang="ts">
	import OnboardingStepPanel from '$lib/components/OnboardingStepPanel.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { acceptLegalDisclaimer } from '$lib/stores/onboarding.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import {
		BODY_PORTAL_TARGET,
		ONBOARDING_PANEL_CLASS,
		portal
	} from '$lib/utils/portal';
	import { sheetBackdrop, sheetPanel } from '$lib/utils/motion';

	let working = $state(false);

	let title = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_legal_title();
	});

	let description = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_legal_desc();
	});

	let acceptLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_legal_accept();
	});

	async function handleAccept() {
		if (working) return;
		working = true;
		try {
			await acceptLegalDisclaimer();
		} finally {
			working = false;
		}
	}
</script>

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
		aria-labelledby="legal-disclaimer-gate-title"
	>
		<OnboardingStepPanel
			progress={m.settings_legal_disclaimer_link()}
			title={title}
			titleId="legal-disclaimer-gate-title"
			description={description}
			titleClass="text-2xl leading-tight sm:text-3xl"
			descriptionClass="text-base text-forest-800"
			panelClass="{ONBOARDING_PANEL_CLASS} w-full"
		>
			{#snippet actions()}
				<button
					type="button"
					onclick={() => void handleAccept()}
					disabled={working}
					class="btn-primary"
				>
					{acceptLabel}
				</button>
			{/snippet}
		</OnboardingStepPanel>
	</div>
</div>
