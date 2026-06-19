<script lang="ts">
	import { page } from '$app/state';
	import CompassView from '$lib/components/CompassView.svelte';
	import { getTreeById } from '$lib/stores/trees.svelte';

	let treeId = $derived(page.params.id ?? '');
	let tree = $derived(treeId ? getTreeById(treeId) : undefined);
</script>

<svelte:head>
	<title>Boussole — Yamadori Scouting</title>
</svelte:head>

{#if tree}
	<CompassView {tree} />
{:else}
	<div class="flex flex-col items-center py-16 text-center">
		<h2 class="text-xl font-semibold text-forest-900">Arbre introuvable</h2>
		<a href="/" class="mt-6 text-forest-800 underline">Retour à la liste</a>
	</div>
{/if}
