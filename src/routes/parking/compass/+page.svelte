<script lang="ts">

	import { base } from '$app/paths';

	import CompassView from '$lib/components/CompassView.svelte';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import { parkingStore } from '$lib/stores/parking.svelte';

	import * as m from '$lib/paraglide/messages.js';



	let target = $derived(

		parkingStore.position

			? {

					label: m.title_parking(),

					latitude: parkingStore.position.latitude,

					longitude: parkingStore.position.longitude

				}

			: null

	);



	let pageTitle = $derived.by(() => {

		void appearanceSettingsState.locale;

		return m.title_parking();

	});

</script>



<svelte:head>

	<title>{pageTitle}</title>

</svelte:head>



{#if target}

	<CompassView

		{target}

		focusCenter={{

			latitude: parkingStore.position!.latitude,

			longitude: parkingStore.position!.longitude

		}}

	/>

{:else}

	<div class="flex flex-col items-center py-16 text-center">

		<h2 class="text-xl font-semibold text-forest-900">{m.parking_load_error()}</h2>

		<p class="mt-2 text-sm text-muted">{m.parking_save()}</p>

		<a href="{base}/map" class="mt-6 text-forest-800 underline">{m.nav_map()}</a>

	</div>

{/if}

