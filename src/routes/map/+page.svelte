<script lang="ts">

	import { page } from '$app/state';

	import TopoMap from '$lib/components/TopoMap.svelte';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import * as m from '$lib/paraglide/messages.js';



	let focusTreeId = $derived(page.url.searchParams.get('focus') ?? undefined);



	let pageTitle = $derived.by(() => {

		void appearanceSettingsState.locale;

		return m.title_map();

	});

</script>



<svelte:head>

	<title>{pageTitle}</title>

</svelte:head>



<div class="flex h-full min-h-0 w-full flex-1 flex-col">

	<TopoMap {focusTreeId} />

</div>

