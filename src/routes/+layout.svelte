<script lang="ts">
	import '../app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import SideNav from '$lib/components/SideNav.svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { getTreeById, initTrees, treeStore } from '$lib/stores/trees.svelte';
	import { initParking, parkingStore } from '$lib/stores/parking.svelte';
	import { initSyncEngine, stopSyncEngine, syncState } from '$lib/sync/engine.svelte';
	import { initOnlineState, onlineState } from '$lib/utils/online.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { initInstallPrompt } from '$lib/utils/pwa-install.svelte';
	import { onMount } from 'svelte';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	let { children } = $props();

	const { needRefresh, updateServiceWorker } = useRegisterSW({
		onRegistered() {},
		onRegisterError(error) {
			console.error('PWA registration failed:', error);
		}
	});

	let initError = $derived(treeStore.loadError ?? parkingStore.loadError);

	onMount(() => {
		void Promise.all([initTrees(), initParking()]).then(() => {
			const startSync = () => void initSyncEngine();
			if (typeof requestIdleCallback === 'function') {
				requestIdleCallback(startSync);
			} else {
				setTimeout(startSync, 0);
			}
		});
		const cleanupOnline = initOnlineState();
		const cleanupInstall = initInstallPrompt();
		return () => {
			stopSyncEngine();
			cleanupOnline();
			cleanupInstall();
		};
	});

	let routeId = $derived(page.route.id);
	let treeId = $derived(page.params.id ?? null);
	let detailTree = $derived(treeId ? getTreeById(treeId) : undefined);

	let isCapture = $derived(routeId === '/capture');
	let isMap = $derived(routeId === '/map');
	let isCompass = $derived(routeId === '/tree/[id]/compass');
	let isParkingCompass = $derived(routeId === '/parking/compass');
	let isDetail = $derived(routeId === '/tree/[id]');
	let showBottomNav = $derived(routeId === '/' || routeId === '/map');
	let isSettings = $derived(routeId === '/settings');
	let showBack = $derived(isCapture || isDetail || isCompass || isParkingCompass || isSettings);

	let backHref = $derived(
		isParkingCompass
			? `${base}/map`
			: isCompass && treeId
				? `${base}/tree/${treeId}`
				: `${base}/`
	);

	let headerTitle = $derived(
		isCapture
			? 'Nouveau repérage'
			: isMap
				? 'Carte'
				: isParkingCompass
					? 'Point de départ'
					: isCompass
						? 'Boussole'
						: isSettings
							? 'Réglages'
							: isDetail
								? (detailTree?.species ?? 'Détail')
								: 'Yamadori'
	);

	let headerSubtitle = $derived(
		!isCapture && !isMap && !isDetail && !isCompass && !isParkingCompass ? 'Scouting' : ''
	);

	let syncLabel = $derived.by(() => {
		if (syncState.status === 'syncing') return 'Sync…';
		if (syncState.pendingCount > 0) return `${syncState.pendingCount} en attente`;
		if (syncState.status === 'error') {
			const detail = syncState.lastError?.split(':')[0] ?? 'Sync erreur';
			return detail.length > 24 ? 'Sync erreur' : detail;
		}
		if (syncState.status === 'offline' && syncState.pendingCount > 0) return 'Hors sync';
		return null;
	});
</script>

<svelte:head>
	<title>Yamadori Scouting</title>
	<link rel="apple-touch-icon" href="{base}/icons/icon-192.png" />
</svelte:head>

<div class="flex min-h-dvh">
	<SideNav />

	<div class="mx-auto flex min-h-dvh max-w-lg flex-1 flex-col px-safe lg:mx-0 lg:max-w-none">
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

			<a
				href="{base}/settings"
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest-900 transition active:scale-95 lg:hidden"
				aria-label="Réglages"
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
					<path
						d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.77 1.05 1.41 1.1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>

			{#if syncLabel}
				<span
					class="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800"
					role="status"
				>
					{syncLabel}
				</span>
			{/if}

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

	{#if $needRefresh}
		<div
			class="border-b border-forest-200 bg-forest-50 px-4 py-2 text-sm text-forest-900"
			role="status"
		>
			<div class="flex items-center justify-between gap-3">
				<p>Mise à jour disponible — rechargez en ligne avant d'aller hors-ligne.</p>
				<button
					type="button"
					class="shrink-0 rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white"
					onclick={() => updateServiceWorker(true)}
				>
					Mettre à jour
				</button>
			</div>
		</div>
	{/if}

	<InstallPrompt />

	{#if initError}
		<div
			class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
			role="alert"
		>
			{initError}
		</div>
	{/if}

	<main
		class="flex-1 {showBottomNav ? 'pb-20 lg:pb-0' : ''} {isMap
			? 'px-0 py-0'
			: 'px-4 py-6 lg:px-6'}"
	>
		{#if treeStore.loaded && parkingStore.loaded}
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
</div>
