<script lang="ts">
	import { SORT_OPTIONS, type SortKey } from '$lib/utils/sort';

	let {
		value = $bindable<SortKey>('date_desc')
	}: {
		value?: SortKey;
	} = $props();
</script>

<div class="flex flex-col gap-1.5">
	<label for="sort-select" class="text-sm font-medium text-forest-900">Trier par</label>
	<select
		id="sort-select"
		bind:value
		class="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base text-forest-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
	>
		{#each SORT_OPTIONS as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</div>
