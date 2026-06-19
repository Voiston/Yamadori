<script lang="ts">
	import { page } from '$app/state';
	import MapOfflineView from '$lib/components/MapOfflineView.svelte';
	import TopoMap from '$lib/components/TopoMap.svelte';
	import { onlineState } from '$lib/utils/online.svelte';

	let focusTreeId = $derived(page.url.searchParams.get('focus') ?? undefined);
</script>

<svelte:head>
	<title>Carte — Yamadori Scouting</title>
</svelte:head>

{#if onlineState.online}
	<TopoMap {focusTreeId} />
{:else}
	<MapOfflineView {focusTreeId} />
{/if}
