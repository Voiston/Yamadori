<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { hapticSelection } from '$lib/utils/haptics';
	import * as m from '$lib/paraglide/messages.js';

	let {
		value = $bindable<'all' | 'favorites'>('all')
	}: {
		value?: 'all' | 'favorites';
	} = $props();

	const options = $derived.by(() => {
		void appearanceSettingsState.locale;
		return [
			{ id: 'all' as const, label: m.filter_all() },
			{ id: 'favorites' as const, label: m.filter_favorites() }
		];
	});

	function select(id: 'all' | 'favorites') {
		if (value === id) return;
		value = id;
		void hapticSelection();
	}
</script>

<div
	class="filter-chips relative grid h-10 min-w-0 shrink grid-cols-2 overflow-hidden rounded-full border border-gray-200 bg-forest-50 p-0.5"
	role="group"
	aria-label={m.filter_group_label()}
>
	<span
		class="filter-chips-pill pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-forest-800"
		class:filter-chips-pill--favorites={value === 'favorites'}
		aria-hidden="true"
	></span>
	{#each options as option (option.id)}
		<button
			type="button"
			onclick={() => select(option.id)}
			class="relative z-10 h-full rounded-full px-3 text-sm font-medium transition-colors active:scale-[0.98] narrow:px-2 narrow:text-xs {value ===
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

	@media (prefers-reduced-motion: reduce) {
		.filter-chips-pill {
			transition: none;
		}
	}
</style>
