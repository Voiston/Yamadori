<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		class: className = '',
		label,
		decorative = false
	}: {
		class?: string;
		label?: string;
		/** When true, hide from AT (parent provides the status label). */
		decorative?: boolean;
	} = $props();

	const resolvedLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return label ?? m.climate_loading();
	});
</script>

{#if decorative}
	<div class="skeleton {className}" aria-hidden="true"></div>
{:else}
	<div
		class="skeleton {className}"
		role="status"
		aria-busy="true"
		aria-label={resolvedLabel}
	></div>
{/if}
