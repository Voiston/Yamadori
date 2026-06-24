<script lang="ts">
	import '../app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import OnboardingPermissions from '$lib/components/OnboardingPermissions.svelte';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getTreeById, initTrees, treeStore } from '$lib/stores/trees.svelte';
	import { initParking, parkingStore } from '$lib/stores/parking.svelte';
	import { initOnlineState, onlineState } from '$lib/utils/online.svelte';
	import { cleanupLegacySyncData } from '$lib/utils/cleanupLegacySync';
	import OutdoorModeToggle from '$lib/components/OutdoorModeToggle.svelte';
	import SimpleModeToggle from '$lib/components/SimpleModeToggle.svelte';
	import {
		appearanceSettingsState,
		initAppearanceSettings
	} from '$lib/stores/appearanceSettings.svelte';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import * as m from '$lib/paraglide/messages.js';
	import { initLocationSettings } from '$lib/stores/locationSettings.svelte';
	import { initBackupPasswordSettings } from '$lib/stores/backupPasswordSettings.svelte';
	import { getBackNavigationTarget } from '$lib/utils/app-navigation';
	import { isOnboardingComplete } from '$lib/utils/onboarding';
	import { applyStatusBarForAppearance, initNativeUi, initViewportInsets } from '$lib/utils/nativeInit';
	import { applyOutdoorScreenBrightness } from '$lib/utils/screenBrightness';
	import { registerTileCacheInterceptor } from '$lib/utils/map/tileCache';
	import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
	import { initIncomingBackupListener } from '$lib/utils/archive';
	import {
		dismissBackupReminderForSession,
		getActiveBackupWarning,
		initBackupReminder
	} from '$lib/utils/backupReminder.svelte';
	import { scheduleCadastreBackfill } from '$lib/utils/cadastreBackfill';
	import { App } from '@capacitor/app';
	import { onMount } from 'svelte';

	let { children } = $props();

	const nativeApp = isNativeApp();

	let initError = $derived(treeStore.loadError ?? parkingStore.loadError);
	let showOnboarding = $state(false);

	let routeId = $derived(page.route.id);
	let treeId = $derived(page.params.id ?? null);
	let backNavigation = $derived(getBackNavigationTarget(routeId, treeId));
	let backHref = $derived(backNavigation.href);
	let showBack = $derived(backNavigation.showBack);

	async function handleBackNavigation(event: MouseEvent) {
		if (!nativeApp) {
			return;
		}
		event.preventDefault();
		await goto(backHref);
	}

	function handleOnboardingComplete() {
		showOnboarding = false;
	}

	$effect(() => {
		if (!appearanceSettingsState.loaded) {
			return;
		}

		if (appearanceSettingsState.outdoorMode) {
			document.documentElement.dataset.outdoor = 'true';
		} else {
			delete document.documentElement.dataset.outdoor;
		}

		if (appearanceSettingsState.darkMode) {
			document.documentElement.dataset.dark = 'true';
		} else {
			delete document.documentElement.dataset.dark;
		}

		if (appearanceSettingsState.simpleMode) {
			document.documentElement.dataset.simpleMode = 'true';
		} else {
			delete document.documentElement.dataset.simpleMode;
		}

		const themeMeta = document.querySelector('meta[name="theme-color"]');
		const themeColor = appearanceSettingsState.outdoorMode
			? '#ffffff'
			: appearanceSettingsState.darkMode
				? '#000000'
				: '#1a2e1a';
		themeMeta?.setAttribute('content', themeColor);

		if (nativeApp) {
			void applyStatusBarForAppearance(
				appearanceSettingsState.outdoorMode,
				appearanceSettingsState.darkMode
			);
			void applyOutdoorScreenBrightness(appearanceSettingsState.outdoorMode);
		}

		document.documentElement.lang = appearanceSettingsState.locale;
	});

	$effect(() => {
		if (!treeStore.loaded || !onlineState.online) return;
		void treeStore.trees;
		scheduleCadastreBackfill();
	});

	onMount(() => {
		let backListener: { remove: () => Promise<void> } | undefined;
		let incomingBackupCleanup: (() => void) | undefined;
		let cleanupViewportInsets: (() => void) | undefined;

		if (nativeApp) {
			void initNativeUi();
			cleanupViewportInsets = initViewportInsets();
			void isOnboardingComplete().then((complete) => {
				showOnboarding = !complete;
			});

			if (isAndroidApp()) {
				void initIncomingBackupListener(() => {
					if (page.route.id !== '/settings') {
						void goto(`${base}/settings`);
					}
				}).then((cleanup) => {
					incomingBackupCleanup = cleanup;
				});
			}

			void App.addListener('backButton', () => {
				const target = getBackNavigationTarget(page.route.id, page.params.id ?? null);
				if (target.showBack) {
					void goto(target.href);
					return;
				}
				void App.minimizeApp();
			}).then((listener) => {
				backListener = listener;
			});
		}

		registerTileCacheInterceptor();

		void initAppearanceSettings();
		void initLocationSettings();
		void initBackupPasswordSettings();
		void cleanupLegacySyncData();
		void initBackupReminder();
		void Promise.all([initTrees(), initParking()]);
		const cleanupOnline = initOnlineState();
		return () => {
			cleanupOnline();
			cleanupViewportInsets?.();
			incomingBackupCleanup?.();
			void backListener?.remove();
		};
	});

	let detailTree = $derived(treeId ? getTreeById(treeId) : undefined);

	let isCapture = $derived(routeId === '/capture');
	let isMap = $derived(routeId === '/map');
	let isCompass = $derived(routeId === '/tree/[id]/compass');
	let isParkingCompass = $derived(routeId === '/parking/compass');
	let isDetail = $derived(routeId === '/tree/[id]');
	let showBottomNav = $derived(routeId === '/' || routeId === '/map');
	let isSettings = $derived(routeId === '/settings');

	let headerTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (isCapture) return m.title_capture();
		if (isMap) return m.nav_map();
		if (isParkingCompass) return m.title_parking();
		if (isCompass) return m.onboarding_compass_title().replace(/\s*\([^)]*\)$/, '');
		if (isSettings) return m.nav_settings();
		if (isDetail) {
			if (!detailTree) return m.title_detail();
			const raw = detailTree.species.trim();
			return raw ? speciesDisplayName(raw) : m.tree_species_unset();
		}
		return 'Yamadori';
	});

	let backupWarning = $derived(
		treeStore.loaded && parkingStore.loaded && !isSettings
			? getActiveBackupWarning(treeStore.trees, parkingStore.position)
			: null
	);
</script>

<svelte:head>
	<title>Yamadori Scouting</title>
	<link rel="icon" href="{base}/icons/icon-192.png" type="image/png" />
</svelte:head>

<div class="flex h-dvh min-h-0 w-full flex-col overflow-hidden px-safe">
	<header
		class="{isMap
			? 'absolute inset-x-0 top-0 z-40 bg-white/90 pt-safe shadow-sm backdrop-blur-sm'
			: 'sticky top-0 z-40 border-b border-gray-100 bg-surface/95 backdrop-blur-sm pt-safe'}"
	>
		<div class="flex {isMap ? 'h-10 gap-2 px-3' : 'h-14 gap-3 px-4'} items-center">
			{#if showBack}
				<a
					href={backHref}
					onclick={handleBackNavigation}
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest-900 transition active:scale-95"
					aria-label={m.layout_back()}
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
				<h1 class="truncate {isMap ? 'text-base' : 'text-lg'} font-semibold text-forest-900">
					{headerTitle}
				</h1>
			</div>

			<div class="flex shrink-0 items-center gap-1.5">
				<SimpleModeToggle />
				<OutdoorModeToggle />
			</div>

			<a
				href="{base}/settings"
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest-900 transition active:scale-95"
				aria-label={m.nav_settings()}
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

			{#if !onlineState.online}
				<span
					class="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
					role="status"
				>
					{m.map_offline_button()}
				</span>
			{/if}
		</div>
		{#if backupWarning}
			<div class="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-1.5">
				<a
					href="{base}/settings"
					class="min-w-0 flex-1 truncate whitespace-nowrap text-xs font-medium text-amber-900"
					aria-label={m.layout_export_backup()}
				>
					{backupWarning.message}
				</a>
				<button
					type="button"
					class="shrink-0 px-1 text-sm font-medium text-amber-800"
					aria-label={m.action_close()}
					onclick={dismissBackupReminderForSession}
				>
					×
				</button>
			</div>
		{/if}
	</header>

	{#if initError}
		<div
			class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
			role="alert"
		>
			{initError}
		</div>
	{/if}

	<main
		class="flex min-h-0 flex-1 flex-col {appearanceSettingsState.simpleMode
			? 'simple-mode-layout'
			: ''} {showBottomNav
			? 'pb-above-nav'
			: ''} {isMap
			? 'overflow-hidden px-0 py-0'
			: isCapture
				? 'min-h-0 overflow-hidden px-4 pt-6 md:px-6'
				: 'scroll-pb-safe overflow-y-auto px-4 pt-6 md:px-6'} {isMap || showBottomNav || isCapture ? '' : 'pb-scroll-safe'}"
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
					aria-label={m.climate_loading()}
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

{#if nativeApp && showOnboarding}
	<OnboardingPermissions oncomplete={handleOnboardingComplete} />
{/if}
