<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { fade } from 'svelte/transition';
	import { MOTION_MS, prefersReducedMotion } from '$lib/utils/motion';
	import type { MapOnboardingStepId } from '$lib/utils/mapOnboarding';

	let {
		stepId,
		stepIndex,
		stepTotal,
		onnext,
		ondone,
		onskip
	}: {
		stepId: MapOnboardingStepId;
		stepIndex: number;
		stepTotal: number;
		onnext: () => void;
		ondone: () => void;
		onskip: () => void;
	} = $props();

	const titleId = 'map-onboarding-title';

	let progress = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_step({ current: stepIndex, total: stepTotal });
	});

	let title = $derived.by(() => {
		void appearanceSettingsState.locale;
		return stepId === 'follow'
			? m.map_onboarding_follow_title()
			: m.map_onboarding_menu_title();
	});

	let body = $derived.by(() => {
		void appearanceSettingsState.locale;
		return stepId === 'follow'
			? m.map_onboarding_follow_body()
			: m.map_onboarding_menu_body();
	});

	let primaryLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return stepId === 'follow' ? m.map_onboarding_got_it() : m.map_onboarding_next();
	});

	let skipLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.map_layers_coach_later();
	});

	function handlePrimary(): void {
		if (stepId === 'follow') {
			ondone();
			return;
		}
		onnext();
	}
</script>

<div
	class="app-card w-full px-3 pb-3 pt-2 shadow-sm"
	role="dialog"
	aria-labelledby={titleId}
	transition:fade={{ duration: prefersReducedMotion() ? 0 : MOTION_MS.fast }}
>
	<p class="text-xs font-medium uppercase tracking-wide text-muted">{progress}</p>
	<h2 id={titleId} class="mt-1 text-sm font-semibold text-forest-900">{title}</h2>
	<p class="mt-1 text-sm leading-snug text-muted">{body}</p>
	<div class="mt-2 flex flex-col gap-1.5">
		<button type="button" class="btn-primary !h-9 text-sm" onclick={handlePrimary}>
			{primaryLabel}
		</button>
		<button
			type="button"
			class="rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium text-muted transition active:scale-[0.98]"
			onclick={onskip}
		>
			{skipLabel}
		</button>
	</div>
</div>
