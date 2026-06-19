<script lang="ts">
	import '../app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { getTreeById, initTrees, treeStore } from '$lib/stores/trees.svelte';
	import { initOnlineState, onlineState } from '$lib/utils/online.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		void initTrees();
		return initOnlineState();
	});

	let routeId = $derived(page.route.id);
	let treeId = $derived(page.params.id ?? null);
	let detailTree = $derived(treeId ? getTreeById(treeId) : undefined);

	let isCapture = $derived(routeId === '/capture');
	let isMap = $derived(routeId === '/map');
	let isCompass = $derived(routeId === '/tree/[id]/compass');
	let isDetail = $derived(routeId === '/tree/[id]');
	let showBottomNav = $derived(routeId === '/' || routeId === '/map');
	let showBack = $derived(isCapture || isDetail || isCompass);

	let backHref = $derived(
		isCompass && treeId ? `${base}/tree/${treeId}` : `${base}/`
	);

	let headerTitle = $derived(
		isCapture
			? 'Nouveau repérage'
			: isMap
				? 'Carte'
				: isCompass
					? 'Boussole'
					: isDetail
						? (detailTree?.species ?? 'Détail')
						: 'Yamadori'
	);

	let headerSubtitle = $derived(!isCapture && !isMap && !isDetail && !isCompass ? 'Scouting' : '');
</script>

<svelte:head>
	<title>Yamadori Scouting</title>
	<link rel="apple-touch-icon" href="{base}/icons/icon.svg" />
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-lg flex-col px-safe">
	<header
		class="sticky top-0 z-40 border-b border-gray-100 bg-surface/95 backdrop-blur-sm pt-safe"
	>
		<div class="flex h-14 items-center gap-3 px-4">
			{#if showBack}
				<a
					href={backHref}
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest-900 transition active:scale-95"
					aria-label="Retour à la liste"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="h-6 w-6"
						aria-hidden="true"
					>
						<path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</a>
			{/if}

			<div class="min-w-0 flex-1">
				<h1 class="truncate text-lg font-semibold text-forest-900">{headerTitle}</h1>
				{#if headerSubtitle}
					<p class="text-xs text-muted">{headerSubtitle}</p>
				{/if}
			</div>

			{#if !onlineState.online}
				<span
					class="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
					role="status"
				>
					Hors-ligne
				</span>
			{/if}
		</div>
	</header>

	<main class="flex-1 {showBottomNav ? 'pb-20' : ''} {isMap ? 'px-0 py-0' : 'px-4 py-6'}">
		{#if treeStore.loaded}
			{@render children()}
		{:else}
			<div class="flex items-center justify-center py-20">
				<svg
					class="h-8 w-8 animate-spin text-forest-800"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					aria-label="Chargement"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					></path>
				</svg>
			</div>
		{/if}
	</main>

	{#if showBottomNav}
		<BottomNav />
	{/if}
</div>
