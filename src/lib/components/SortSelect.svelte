<script lang="ts">

	import { getSortOptions, getSimpleSortOptions, type SortKey } from '$lib/utils/sort';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import * as m from '$lib/paraglide/messages.js';



	let {

		value = $bindable<SortKey>('date_desc')

	}: {

		value?: SortKey;

	} = $props();



	const options = $derived.by(() => {

		void appearanceSettingsState.locale;

		return appearanceSettingsState.simpleMode ? getSimpleSortOptions() : getSortOptions();

	});

</script>



<div class="flex flex-col gap-1.5">

	<label for="sort-select" class="text-sm font-medium text-forest-900">{m.sort_label()}</label>

	<select

		id="sort-select"

		bind:value

		class="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base text-forest-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"

	>

		{#each options as option (option.value)}

			<option value={option.value}>{option.label}</option>

		{/each}

	</select>

</div>

