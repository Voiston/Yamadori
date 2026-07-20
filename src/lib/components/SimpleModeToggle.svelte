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
		class="hidden h-5 w-5 narrow:block"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round" />
		<path
			d="M4 12h2M18 12h2M12 4v2M12 18v2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M6.5 6.5l1.4 1.4M16.1 16.1l1.4 1.4M6.5 17.5l1.4-1.4M16.1 7.9l1.4-1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
	<span class="narrow:hidden">{m.simple_mode_label()}</span>
</button>
