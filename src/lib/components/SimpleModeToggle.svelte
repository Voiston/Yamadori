<script lang="ts">
	import {
		appearanceSettingsState,
		toggleSimpleMode
	} from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let simpleMode = $derived(appearanceSettingsState.simpleMode);
</script>

<button
	type="button"
	data-focus-mode-toggle
	class="simple-mode-toggle focus-mode-toggle shrink-0 rounded-full border transition active:scale-95 narrow:flex narrow:h-10 narrow:w-10 narrow:items-center narrow:justify-center narrow:px-0 px-2.5 py-1 text-xs font-semibold sm:px-3 sm:text-sm {simpleMode
		? 'simple-mode-toggle--active border-forest-900 bg-forest-900 text-white'
		: 'border-forest-200 bg-white text-forest-900'}"
	aria-label={simpleMode ? m.simple_mode_disable() : m.simple_mode_enable()}
	aria-pressed={simpleMode}
	title={simpleMode ? m.simple_mode_active() : m.simple_mode_inactive()}
	onclick={() => void toggleSimpleMode()}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="hidden h-5 w-5 narrow:block"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="3" />
		<path d="M3 7V5a2 2 0 0 1 2-2h2" />
		<path d="M17 3h2a2 2 0 0 1 2 2v2" />
		<path d="M21 17v2a2 2 0 0 1-2 2h-2" />
		<path d="M7 21H5a2 2 0 0 1-2-2v-2" />
	</svg>
	<span class="narrow:hidden">{m.simple_mode_label()}</span>
</button>
