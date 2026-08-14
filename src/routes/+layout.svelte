<script lang="ts">

	import '../app.css';

	import AppBootSplash from '$lib/components/AppBootSplash.svelte';

	import AppToast from '$lib/components/AppToast.svelte';

	import BottomNav from '$lib/components/BottomNav.svelte';

	import OutdoorModeToggle from '$lib/components/OutdoorModeToggle.svelte';

	import SimpleModeToggle from '$lib/components/SimpleModeToggle.svelte';

	import { base } from '$app/paths';

	import { goto } from '$app/navigation';

	import { page } from '$app/state';

	import { canRenderRouteContent, runAppBoot } from '$lib/boot/appInit';

	import { getTreeById, treeStore } from '$lib/stores/trees.svelte';

	import { parkingStore } from '$lib/stores/parking.svelte';

	import { onlineState } from '$lib/utils/online.svelte';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import { speciesDisplayName } from '$lib/constants/species-i18n';

	import * as m from '$lib/paraglide/messages.js';

	import { formatMigrationErrorMessage, securitySettingsState, setLocalEncryptionEnabled } from '$lib/stores/securitySettings.svelte';

	import { getBackNavigationTarget } from '$lib/utils/app-navigation';
	import { releaseOnboardingUiLocks } from '$lib/utils/onboardingUi';
	import { showAppToast } from '$lib/stores/appToast.svelte';

	import { applyStatusBarForAppearance } from '$lib/utils/nativeInit';

	import { applyOutdoorScreenBrightness } from '$lib/utils/screenBrightness';

	import { isNativeApp } from '$lib/utils/platform';

	import { MOTION_MS, prefersReducedMotion } from '$lib/utils/motion';

	import {

		dismissBackupReminderForSession,

		getActiveBackupWarning

	} from '$lib/utils/backupReminder.svelte';

	import { resyncLocationWatchAfterParkingChange } from '$lib/utils/userPosition.svelte';

	import {
		advanceOnboardingPhase,
		onboardingState
	} from '$lib/stores/onboarding.svelte';
	import type { OnboardingPhase } from '$lib/utils/onboarding';

	import { onMount, tick, untrack, type Component } from 'svelte';

	import { fade } from 'svelte/transition';



	let { children } = $props();



	const nativeApp = isNativeApp();



	let initError = $derived.by(() => {
		if (securitySettingsState.migrationPending || treeStore.storageMigrationPending) {
			return null;
		}
		return treeStore.loadError ?? parkingStore.loadError;
	});

	let ProPaywallDialog = $state<Component | null>(null);

	let LocalEncryptionMigrationOverlay = $state<Component | null>(null);

	let TreeStorageMigrationOverlay = $state<Component | null>(null);

	let OnboardingPermissions = $state<Component<{ onphasecomplete: () => void }> | null>(
		null
	);

	let OnboardingProtection = $state<
		Component<{
			captureSavedTree?: boolean;
			onphasecomplete: (options: { enableLocalEncryption: boolean }) => void;
		}> | null
	>(null);

	let LegalDisclaimerGate = $state<Component | null>(null);



	let routeId = $derived(page.route.id);

	let treeId = $derived(page.params.id ?? null);

	let backNavigation = $derived(getBackNavigationTarget(routeId, treeId));

	let backHref = $derived(backNavigation.href);

	let showBack = $derived(backNavigation.showBack);

	let canRenderChildren = $derived(canRenderRouteContent(routeId));

	let bootMinElapsed = $state(false);

	let bootDismissed = $state(false);

	$effect(() => {
		if (bootDismissed) return;
		if (canRenderChildren && bootMinElapsed) {
			bootDismissed = true;
		}
	});



	async function handleBackNavigation(event: MouseEvent) {

		if (!nativeApp || securitySettingsState.migrationPending) {

			if (securitySettingsState.migrationPending) {

				event.preventDefault();

			}

			return;

		}

		event.preventDefault();

		await goto(backHref);

	}



	async function handlePermissionsPhaseComplete() {
		await advanceOnboardingPhase('capture');
		await releaseOnboardingUiLocks();
		await goto(`${base}/capture`);
	}

	async function handleProtectionPhaseComplete(options: { enableLocalEncryption: boolean }) {
		await advanceOnboardingPhase('done');
		await tick();
		await tick();
		await releaseOnboardingUiLocks({ removeOverlays: true });
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
		});
		await goto(`${base}/`, { invalidateAll: true, replaceState: true });
		await tick();
		await releaseOnboardingUiLocks({ removeOverlays: true });
		if (options.enableLocalEncryption) {
			const ok = await setLocalEncryptionEnabled(true);
			if (!ok) {
				showAppToast('error', formatMigrationErrorMessage(securitySettingsState.lastError));
			}
		}
		await releaseOnboardingUiLocks({ removeOverlays: true });
	}

	let previousOnboardingPhase = $state<OnboardingPhase | null>(null);

	let showPermissionsModal = $derived(
		nativeApp && onboardingState.loaded && onboardingState.phase === 'permissions'
	);

	let showProtectionModal = $derived(
		nativeApp &&
			onboardingState.loaded &&
			onboardingState.phase === 'protection' &&
			onboardingState.legalDisclaimerAccepted
	);

	let showLegalDisclaimerGate = $derived(
		nativeApp &&
			onboardingState.loaded &&
			!onboardingState.legalDisclaimerAccepted &&
			onboardingState.phase !== 'permissions'
	);

	function ensureOnboardingComponentsLoaded(): void {
		if (!nativeApp || OnboardingPermissions) {
			return;
		}

		void Promise.all([
			import('$lib/components/OnboardingPermissions.svelte'),
			import('$lib/components/OnboardingProtection.svelte')
		]).then(([onboardingPermissions, onboardingProtection]) => {
			OnboardingPermissions = onboardingPermissions.default;
			OnboardingProtection = onboardingProtection.default;
		});
	}

	function ensureLegalDisclaimerGateLoaded(): void {
		if (!nativeApp || LegalDisclaimerGate) {
			return;
		}

		void import('$lib/components/LegalDisclaimerGate.svelte').then((mod) => {
			LegalDisclaimerGate = mod.default;
		});
	}

	$effect(() => {
		if (
			!nativeApp ||
			!onboardingState.loaded ||
			onboardingState.phase === 'done'
		) {
			return;
		}

		ensureOnboardingComponentsLoaded();
	});

	$effect(() => {
		if (!showLegalDisclaimerGate) {
			return;
		}
		ensureLegalDisclaimerGateLoaded();
	});

	$effect(() => {
		const phase = onboardingState.phase;
		if (
			nativeApp &&
			onboardingState.loaded &&
			previousOnboardingPhase !== null &&
			previousOnboardingPhase !== 'done' &&
			phase === 'done'
		) {
			void releaseOnboardingUiLocks({ removeOverlays: true });
		}
		previousOnboardingPhase = phase;
	});



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

		if (!parkingStore.loaded) {

			return;

		}

		void parkingStore.position;

		untrack(() => {

			resyncLocationWatchAfterParkingChange();

		});

	});



	onMount(() => {

		void Promise.all([

			import('$lib/components/ProPaywallDialog.svelte'),

			import('$lib/components/LocalEncryptionMigrationOverlay.svelte'),

			import('$lib/components/TreeStorageMigrationOverlay.svelte'),

			import('$lib/components/OnboardingPermissions.svelte'),

			import('$lib/components/OnboardingProtection.svelte')

		]).then(

			([

				proPaywall,

				localEncryptionOverlay,

				treeStorageOverlay,

				onboardingPermissions,

				onboardingProtection

			]) => {

				ProPaywallDialog = proPaywall.default;

				LocalEncryptionMigrationOverlay = localEncryptionOverlay.default;

				TreeStorageMigrationOverlay = treeStorageOverlay.default;

				OnboardingPermissions = onboardingPermissions.default;

				OnboardingProtection = onboardingProtection.default;

			}

		);



		const bootTimer = setTimeout(() => {
			bootMinElapsed = true;
		}, MOTION_MS.bootMin);

		const cleanupBoot = runAppBoot({

			base,

			nativeApp,

			getRouteId: () => page.route.id,

			getTreeId: () => page.params.id ?? null,

			onOnboardingReady: () => {}

		});

		return () => {
			clearTimeout(bootTimer);
			cleanupBoot();
		};

	});



	let detailTree = $derived(treeId ? getTreeById(treeId) : undefined);



	let isCapture = $derived(routeId === '/capture');

	let isMap = $derived(routeId === '/map');

	let isCompass = $derived(routeId === '/tree/[id]/compass');

	let isParkingCompass = $derived(routeId === '/parking/compass');

	let isDetail = $derived(routeId === '/tree/[id]');

	let showBottomNav = $derived(

		(routeId === '/' || routeId === '/map') && !securitySettingsState.migrationPending

	);

	let isSettings = $derived(routeId === '/settings');

	let isPrivacy = $derived(routeId === '/settings/privacy');



	let headerTitle = $derived.by(() => {

		void appearanceSettingsState.locale;

		if (isCapture) return m.title_capture();

		if (isMap) return m.nav_map();

		if (isParkingCompass) return m.title_parking();

		if (isCompass) return m.onboarding_compass_title().replace(/\s*\([^)]*\)$/, '');

		if (isPrivacy) return m.settings_privacy_link();

		if (isSettings) return m.nav_settings();

		if (isDetail) {

			if (!detailTree) return m.title_detail();

			const raw = detailTree.species.trim();

			return raw ? speciesDisplayName(raw) : m.tree_species_unset();

		}

		return 'Yamadori';

	});



	let backupWarning = $derived(

		treeStore.loaded && parkingStore.loaded && !isSettings && !isPrivacy

			? getActiveBackupWarning(treeStore.trees, parkingStore.position)

			: null

	);

	let appMetaDescription = $derived.by(() => {

		void appearanceSettingsState.locale;

		return m.app_meta_description();

	});

</script>



<svelte:head>

	<title>Yamadori Scouting</title>

	<meta name="description" content={appMetaDescription} />

	<link rel="icon" href="{base}/icons/icon-192.png" type="image/png" />

</svelte:head>



<div data-app-shell class="relative flex h-dvh min-h-0 w-full flex-col overflow-hidden px-safe">

	<header
		class="sticky top-0 z-40 border-b border-gray-100 bg-surface/95 backdrop-blur-sm pt-safe"
	>
		<div class="flex h-14 gap-3 px-4 narrow:gap-2 narrow:px-3 items-center">

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

				<h1 class="truncate text-lg narrow:text-base font-semibold text-forest-900">

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

					class="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 narrow:max-w-[4.5rem] narrow:truncate narrow:px-2"

					role="status"

					title={m.map_offline_button()}

				>

					{m.map_offline_button()}

				</span>

			{/if}

		</div>

		{#if backupWarning}

			<div class="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-1.5">

				<a

					href="{base}/settings#backup-export"

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

			class="flex flex-col gap-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 sm:flex-row sm:items-center sm:gap-3"

			role="alert"

		>

			<p class="min-w-0 flex-1">{initError.message}</p>

			{#if initError.helpMessage}

				<p class="min-w-0 flex-1 text-xs text-amber-800">{initError.helpMessage}</p>

			{/if}

			{#if initError.suggestImport}

				<a

					href="{base}/settings#backup-import"

					class="shrink-0 text-xs font-semibold text-amber-950 underline underline-offset-2"

				>

					{m.layout_init_error_import_action()}

				</a>

			{/if}

		</div>

	{/if}



	<main
		data-app-main

		class="flex min-h-0 flex-1 flex-col {appearanceSettingsState.simpleMode

			? 'simple-mode-layout'

			: ''} {showBottomNav

			? 'pb-above-nav'

			: ''} {isMap

			? 'overflow-hidden px-0 py-0'

			: isCapture

				? 'min-h-0 overflow-hidden px-4 pt-6 narrow:px-3 md:px-6'

				: 'scroll-pb-safe overflow-y-auto px-4 pt-6 narrow:px-3 md:px-6'} {isMap || showBottomNav || isCapture ? '' : 'pb-scroll-safe'}"

	>

		{#key page.url.pathname}

			{#if canRenderChildren && bootDismissed}

				{@render children()}

			{/if}

		{/key}

	</main>



	{#if showBottomNav}

		<BottomNav />

	{/if}



	{#if ProPaywallDialog}

		<ProPaywallDialog />

	{/if}

	{#if !bootDismissed}
		<div
			class="absolute inset-0 z-[110]"
			out:fade={{ duration: prefersReducedMotion() ? 0 : MOTION_MS.sheet }}
		>
			<AppBootSplash label={m.climate_loading()} />
		</div>
	{/if}

</div>



{#if nativeApp && showPermissionsModal && OnboardingPermissions}

	<OnboardingPermissions onphasecomplete={() => void handlePermissionsPhaseComplete()} />

{/if}



{#if nativeApp && showLegalDisclaimerGate && LegalDisclaimerGate}

	<LegalDisclaimerGate />

{/if}



{#if nativeApp && showProtectionModal && OnboardingProtection}

	<OnboardingProtection
		captureSavedTree={onboardingState.captureSavedTree}
		onphasecomplete={(options) => void handleProtectionPhaseComplete(options)}
	/>

{/if}



{#if bootDismissed && LocalEncryptionMigrationOverlay}

	<LocalEncryptionMigrationOverlay />

{/if}

{#if bootDismissed && TreeStorageMigrationOverlay}

	<TreeStorageMigrationOverlay />

{/if}

<AppToast />


