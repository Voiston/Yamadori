<script lang="ts">
	let {
		value = $bindable<'all' | 'favorites'>('all')
	}: {
		value?: 'all' | 'favorites';
	} = $props();

	const options = [
		{ id: 'all' as const, label: 'Tous' },
		{ id: 'favorites' as const, label: 'Favoris' }
	];
</script>

<div class="flex gap-2" role="group" aria-label="Filtrer la liste">
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
