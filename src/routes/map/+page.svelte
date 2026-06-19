<script lang="ts">
	import { page } from '$app/state';
	import TreeMap from '$lib/components/TreeMap.svelte';

	let focusTreeId = $derived(page.url.searchParams.get('focus') ?? undefined);
</script>

<svelte:head>
	<title>Carte — Yamadori Scouting</title>
</svelte:head>

<TreeMap {focusTreeId} />
