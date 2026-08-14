<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		value = $bindable(''),
		placeholder,
		compact = false
	}: {
		value?: string;
		placeholder?: string;
		compact?: boolean;
	} = $props();

	let resolvedPlaceholder = $derived.by(() => {
		void appearanceSettingsState.locale;
		return placeholder ?? m.search_placeholder();
	});

	function clear() {
		value = '';
	}
</script>

<div class="relative">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted {compact
			? 'left-3 h-4 w-4'
			: 'left-4 h-5 w-5'}"
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
		class="search-input w-full rounded-xl border border-gray-200 bg-white text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 {compact
			? 'h-10 py-2 pl-10 text-sm'
			: 'h-12 py-3 pl-12 text-base'} {value ? (compact ? 'pr-10' : 'pr-11') : 'pr-4'}"
	/>
	{#if value}
		<button
			type="button"
			class="absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:text-forest-900 {compact
				? 'right-1.5 h-7 w-7'
				: 'right-2 h-8 w-8'}"
			aria-label={m.action_clear()}
			onclick={clear}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class={compact ? 'h-4 w-4' : 'h-5 w-5'}
				aria-hidden="true"
			>
				<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
			</svg>
		</button>
	{/if}
</div>

<style>
	/* Hide native search clear so the custom × is the only control. */
	.search-input::-webkit-search-cancel-button,
	.search-input::-webkit-search-decoration {
		-webkit-appearance: none;
		appearance: none;
	}
</style>
