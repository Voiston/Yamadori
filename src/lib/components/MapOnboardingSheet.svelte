<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { sheetPanel } from '$lib/utils/motion';
	import type {
		MapOnboardingLayersVariant,
		MapOnboardingStepId
	} from '$lib/utils/mapOnboarding';

	let {
		stepId,
		stepIndex,
		stepTotal,
		layersVariant = 'both',
		cadastrePartial = false,
		cadastreSource = 'parcel data',
		protectedSource = 'protected areas',
		onenable,
		onnext,
		ondone,
		onskip
	}: {
		stepId: MapOnboardingStepId;
		stepIndex: number;
		stepTotal: number;
		layersVariant?: MapOnboardingLayersVariant;
		cadastrePartial?: boolean;
		cadastreSource?: string;
		protectedSource?: string;
		onenable: () => void;
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
		switch (stepId) {
			case 'menu':
				return m.map_onboarding_menu_title();
			case 'layers':
				if (layersVariant === 'cadastre') return m.map_onboarding_layers_cadastre_title();
				if (layersVariant === 'protected') return m.map_onboarding_layers_protected_title();
				return m.map_onboarding_layers_title();
			case 'tap':
				return m.map_onboarding_tap_title();
			default:
				return m.map_onboarding_tips_title();
		}
	});

	let body = $derived.by(() => {
		void appearanceSettingsState.locale;
		switch (stepId) {
			case 'menu':
				return m.map_onboarding_menu_body();
			case 'layers':
				if (layersVariant === 'cadastre') {
					return m.map_onboarding_layers_cadastre_body({ cadastreSource });
				}
				if (layersVariant === 'protected') {
					return m.map_onboarding_layers_protected_body({ protectedSource });
				}
				return m.map_onboarding_layers_body({ cadastreSource, protectedSource });
			case 'tap':
				return cadastrePartial
					? m.map_onboarding_tap_body_partial({ cadastreSource })
					: m.map_onboarding_tap_body({ cadastreSource });
			default:
				return m.map_onboarding_tips_body();
		}
	});

	let primaryLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (stepId === 'layers') return m.map_onboarding_enable();
		if (stepId === 'tips') return m.map_onboarding_got_it();
		return m.map_onboarding_next();
	});

	let skipLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.map_layers_coach_later();
	});

	function handlePrimary(): void {
		if (stepId === 'layers') {
			onenable();
			return;
		}
		if (stepId === 'tips') {
			ondone();
			return;
		}
		onnext();
	}
</script>

<div
	class="app-card w-full px-4 pb-4 pt-2 shadow-sm"
	role="dialog"
	aria-labelledby={titleId}
	transition:sheetPanel
>
	<div class="sheet-grabber sm:hidden" aria-hidden="true"></div>
	<p class="text-xs font-medium uppercase tracking-wide text-muted">{progress}</p>
	<h2 id={titleId} class="mt-2 text-base font-semibold text-forest-900">{title}</h2>
	<p class="mt-2 text-sm leading-relaxed text-muted">{body}</p>
	<div class="mt-3 flex flex-col gap-2 sm:flex-row">
		<button type="button" class="btn-primary !h-10 text-sm" onclick={handlePrimary}>
			{primaryLabel}
		</button>
		<button
			type="button"
			class="rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium text-muted transition active:scale-[0.98]"
			onclick={onskip}
		>
			{skipLabel}
		</button>
	</div>
</div>
