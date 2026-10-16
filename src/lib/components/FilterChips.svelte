<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { hapticSelection } from '$lib/utils/haptics';
	import * as m from '$lib/paraglide/messages.js';

	export type ListFilter = 'all' | 'favorites' | 'window';

	let {
		value = $bindable<ListFilter>('all')
	}: {
		value?: ListFilter;
	} = $props();

	const options = $derived.by(() => {
		void appearanceSettingsState.locale;
		return [
			{ id: 'all' as const, label: m.filter_all() },
			{ id: 'favorites' as const, label: m.filter_favorites() },
			{ id: 'window' as const, label: m.filter_window() }
		];
	});

	function select(id: ListFilter) {
		if (value === id) return;
		value = id;
		void hapticSelection();
	}
</script>

<div
	class="filter-chips relative grid h-10 w-[min(100%,13.5rem)] shrink-0 grid-cols-3 overflow-hidden rounded-full border border-gray-200 bg-forest-50 p-0.5"
	role="group"
	aria-label={m.filter_group_label()}
>
	<span
		class="filter-chips-pill pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(33.333%-0.125rem)] rounded-full bg-forest-800"
		class:filter-chips-pill--favorites={value === 'favorites'}
		class:filter-chips-pill--window={value === 'window'}
		aria-hidden="true"
	></span>
	{#each options as option (option.id)}
		<button
			type="button"
			onclick={() => select(option.id)}
			class="relative z-10 h-full rounded-full px-2 text-sm font-medium transition-colors active:scale-[0.98] narrow:px-1.5 narrow:text-xs {value ===
			option.id
				? 'text-white'
				: 'text-forest-900'}"
			aria-pressed={value === option.id}
		>
			{option.label}
		</button>
	{/each}
</div>

<style>
	.filter-chips-pill {
		transition: transform var(--motion-sheet, 200ms) var(--motion-ease, ease);
	}

	.filter-chips-pill--favorites {
		transform: translateX(100%);
	}

	.filter-chips-pill--window {
		transform: translateX(200%);
	}

	@media (prefers-reduced-motion: reduce) {
		.filter-chips-pill {
			transition: none;
		}
	}
</style>
