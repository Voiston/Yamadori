<script lang="ts">
	import { BONSAI_SPECIES_PRIORITY } from '$lib/constants/bonsai-species';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { filterSpeciesDictionary } from '$lib/utils/species-filter';
	import * as m from '$lib/paraglide/messages.js';

	type Props = {
		id: string;
		value?: string;
		disabled?: boolean;
		placeholder?: string;
		highlight?: boolean;
		inputClass?: string;
		onselect?: (name: string) => void;
	};

	let {
		id,
		value = $bindable(''),
		disabled = false,
		placeholder,
		highlight = false,
		inputClass = '',
		onselect
	}: Props = $props();

	let open = $state(false);
	const listboxId = $derived(`${id}-listbox`);
	const matches = $derived(filterSpeciesDictionary(value, BONSAI_SPECIES_PRIORITY));
	const showList = $derived(open && matches.length > 0);

	const displayMatches = $derived.by(() => {
		void appearanceSettingsState.locale;
		return matches.map((name) => ({
			name,
			label: speciesDisplayName(name, appearanceSettingsState.locale)
		}));
	});

	let resolvedPlaceholder = $derived.by(() => {
		void appearanceSettingsState.locale;
		return placeholder ?? m.capture_species_placeholder();
	});

	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function handleFocus() {
		clearTimeout(closeTimer);
		open = true;
	}

	function handleBlur() {
		closeTimer = setTimeout(() => {
			open = false;
		}, 150);
	}

	function selectName(name: string) {
		value = name;
		open = false;
		onselect?.(name);
	}
</script>

<div class="relative">
	<input
		{id}
		type="text"
		bind:value
		{disabled}
		placeholder={resolvedPlaceholder}
		autocomplete="off"
		role="combobox"
		aria-expanded={showList}
		aria-controls={listboxId}
		aria-autocomplete="list"
		onfocus={handleFocus}
		onblur={handleBlur}
		class="h-12 w-full rounded-xl border bg-white px-4 text-base text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50 {highlight
			? 'border-green-500 ring-2 ring-green-500/20'
			: 'border-gray-200'} {inputClass}"
	/>

	{#if showList}
		<ul
			id={listboxId}
			role="listbox"
			aria-labelledby={id}
			class="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
		>
			{#each displayMatches as { name, label } (name)}
				<li role="presentation">
					<button
						type="button"
						role="option"
						aria-selected={value === name}
						onmousedown={(event) => event.preventDefault()}
						onclick={() => selectName(name)}
						class="flex h-12 w-full touch-manipulation items-center px-4 text-left text-base text-forest-900 transition hover:bg-forest-50 active:bg-forest-100"
					>
						{label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
