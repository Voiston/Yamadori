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
	class="simple-mode-toggle focus-mode-toggle shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition active:scale-95 sm:px-3 sm:text-sm {simpleMode
		? 'simple-mode-toggle--active border-forest-900 bg-forest-900 text-white'
		: 'border-forest-200 bg-white text-forest-900'}"
	aria-label={simpleMode ? m.simple_mode_disable() : m.simple_mode_enable()}
	aria-pressed={simpleMode}
	title={simpleMode ? m.simple_mode_active() : m.simple_mode_inactive()}
	onclick={() => void toggleSimpleMode()}
>
	{m.simple_mode_label()}
</button>
