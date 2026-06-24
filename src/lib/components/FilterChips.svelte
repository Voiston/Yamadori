<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
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
</script>

<div class="flex gap-2" role="group" aria-label={m.filter_group_label()}>
	{#each options as option (option.id)}
		<button
			type="button"
			onclick={() => (value = option.id)}
			class="h-10 rounded-full px-4 text-sm font-medium transition active:scale-[0.98] {value === option.id
				? 'bg-forest-800 text-white'
				: 'border border-gray-200 bg-white text-forest-900'}"
			aria-pressed={value === option.id}
		>
			{option.label}
		</button>
	{/each}
</div>
