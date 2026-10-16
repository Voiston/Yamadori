<script lang="ts">
	import { resolve } from '$app/paths';
	import CompassView from '$lib/components/CompassView.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { compassParkingEmptyCopy } from '$lib/utils/errorCopy';
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
	<div class="flex flex-col items-center px-4 py-16 text-center">
		<ErrorBanner copy={compassParkingEmptyCopy()} class="w-full max-w-sm text-left" />
	</div>
{/if}
