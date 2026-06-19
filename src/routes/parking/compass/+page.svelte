<script lang="ts">
	import { base } from '$app/paths';
	import CompassView from '$lib/components/CompassView.svelte';
	import { parkingStore } from '$lib/stores/parking.svelte';

	let target = $derived(
		parkingStore.position
			? {
					label: 'Ma voiture',
					latitude: parkingStore.position.latitude,
					longitude: parkingStore.position.longitude
				}
			: null
	);
</script>

<svelte:head>
	<title>Point de départ — Yamadori Scouting</title>
</svelte:head>

{#if target}
	<CompassView {target} />
{:else}
	<div class="flex flex-col items-center py-16 text-center">
		<h2 class="text-xl font-semibold text-forest-900">Aucun parking enregistré</h2>
		<p class="mt-2 text-sm text-muted">Enregistrez la position de votre voiture depuis la carte.</p>
		<a href="{base}/map" class="mt-6 text-forest-800 underline">Retour à la carte</a>
	</div>
{/if}
