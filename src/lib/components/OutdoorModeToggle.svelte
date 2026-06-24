<script lang="ts">
	import {
		appearanceSettingsState,
		toggleOutdoorMode
	} from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let outdoorMode = $derived(appearanceSettingsState.outdoorMode);
</script>

<button
	type="button"
	class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent text-forest-900 transition active:scale-95 {outdoorMode
		? 'outdoor-mode-toggle--active bg-forest-900 text-white'
		: ''}"
	aria-label={outdoorMode ? m.outdoor_mode_disable() : m.outdoor_mode_enable()}
	aria-pressed={outdoorMode}
	onclick={() => void toggleOutdoorMode()}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		class="h-5 w-5"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="4" stroke-linecap="round" stroke-linejoin="round" />
		<path
			d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</button>
