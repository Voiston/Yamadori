<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		value = $bindable(''),
		placeholder
	}: {
		value?: string;
		placeholder?: string;
	} = $props();

	let resolvedPlaceholder = $derived.by(() => {
		void appearanceSettingsState.locale;
		return placeholder ?? m.search_placeholder();
	});
</script>

<div class="relative">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
		aria-hidden="true"
	>
		<circle cx="11" cy="11" r="8" />
		<path d="M21 21l-4.35-4.35" stroke-linecap="round" />
	</svg>
	<input
		type="search"
		bind:value
		placeholder={resolvedPlaceholder}
		autocomplete="off"
		class="h-12 w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-base text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
	/>
</div>
