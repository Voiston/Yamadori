import { App } from '@capacitor/app';
import { goto } from '$app/navigation';
import {
	appearanceSettingsState,
	initAppearanceSettings
} from '$lib/stores/appearanceSettings.svelte';
import { initApiSettings } from '$lib/stores/apiSettings.svelte';
import { initBackupPasswordSettings, clearBackupPasswordMemoryCache } from '$lib/stores/backupPasswordSettings.svelte';
import { initCaptureSettings } from '$lib/stores/captureSettings.svelte';
import { initCompassSettings } from '$lib/stores/compassSettings.svelte';
import {
	initPowerSavingMode,
	powerSavingModeState,
	setPowerSavingMode
} from '$lib/stores/powerSavingMode.svelte';
import { initDevProOverride } from '$lib/stores/devProOverride.svelte';
import { initParking } from '$lib/stores/parking.svelte';
import { initProEntitlement, proEntitlementState } from '$lib/stores/proEntitlement.svelte';
import { initProPromo } from '$lib/stores/proPromo.svelte';
import { initSecuritySettings, securitySettingsState } from '$lib/stores/securitySettings.svelte';
import { initTrees, treeStore } from '$lib/stores/trees.svelte';
import { parkingStore } from '$lib/stores/parking.svelte';
import { cleanupLegacySyncData } from '$lib/utils/cleanupLegacySync';
import { initBackupReminder } from '$lib/utils/backupReminder.svelte';
import { syncProEntitlementFromStore, handleBillingAppResume } from '$lib/utils/billing';
import { initIncomingBackupListener } from '$lib/utils/archive';
import { registerTileCacheInterceptor } from '$lib/utils/map/tileCache';
import { initNativeUi, initViewportInsets } from '$lib/utils/nativeInit';
import { initOnlineState } from '$lib/utils/online.svelte';
import { initOnboarding, onboardingState } from '$lib/stores/onboarding.svelte';
import { getBackNavigationTarget } from '$lib/utils/app-navigation';
import { isAndroidApp } from '$lib/utils/platform';

export type AppBootCleanup = () => void;

type AppBootOptions = {
	base: string;
	nativeApp: boolean;
	getRouteId: () => string | null;
	getTreeId: () => string | null;
	onOnboardingReady?: () => void;
};

export function canRenderRouteContent(routeId: string | null): boolean {
	if (routeId === '/settings' || routeId === '/settings/privacy') {
		return appearanceSettingsState.loaded;
	}
	if (routeId === '/' || routeId === '/map') {
		return treeStore.indexReady && parkingStore.loaded;
	}
	if (routeId === '/parking/compass') {
		return parkingStore.loaded && appearanceSettingsState.loaded;
	}
	return treeStore.loaded && parkingStore.loaded;
}

function scheduleDeferredBoot(): void {
	const run = () => {
		void cleanupLegacySyncData();
		void initBackupReminder();
		void initProPromo();
		void initDevProOverride();
		registerTileCacheInterceptor();
	};

	if (typeof requestIdleCallback === 'function') {
		requestIdleCallback(run, { timeout: 3_000 });
		return;
	}
	setTimeout(run, 0);
}

export function runAppBoot(options: AppBootOptions): AppBootCleanup {
	let backListener: { remove: () => Promise<void> } | undefined;
	let appStateListener: { remove: () => Promise<void> } | undefined;
	let resumeListener: { remove: () => Promise<void> } | undefined;
	let incomingBackupCleanup: (() => void) | undefined;
	let cleanupViewportInsets: (() => void) | undefined;
	let removeVisibilityListener: (() => void) | undefined;

	if (options.nativeApp) {
		void initNativeUi();
		cleanupViewportInsets = initViewportInsets();
		void initOnboarding().then(() => {
			if (onboardingState.phase === 'capture') {
				void goto(`${options.base}/capture`);
			}
			options.onOnboardingReady?.();
		});

		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				handleBillingAppResume();
			}
		};
		document.addEventListener('visibilitychange', onVisibilityChange);
		removeVisibilityListener = () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};

		void App.addListener('appStateChange', ({ isActive }) => {
			if (isActive) {
				handleBillingAppResume();
				if (!proEntitlementState.purchasePending) {
					void syncProEntitlementFromStore();
				}
			} else {
				clearBackupPasswordMemoryCache();
			}
		}).then((listener) => {
			appStateListener = listener;
		});

		void App.addListener('resume', () => {
			handleBillingAppResume();
		}).then((listener) => {
			resumeListener = listener;
		});

		if (isAndroidApp()) {
			void initIncomingBackupListener(() => {
				if (options.getRouteId() !== '/settings') {
					void goto(`${options.base}/settings`);
				}
			}).then((cleanup) => {
				incomingBackupCleanup = cleanup;
			});
		}

		void App.addListener('backButton', () => {
			if (securitySettingsState.migrationPending) {
				return;
			}
			const target = getBackNavigationTarget(options.getRouteId(), options.getTreeId());
			if (target.showBack) {
				void goto(target.href);
				return;
			}
			void App.minimizeApp();
		}).then((listener) => {
			backListener = listener;
		});
	}

	void initAppearanceSettings();
	void initApiSettings();
	void initCompassSettings();
	void initPowerSavingMode();
	void initCaptureSettings();
	void initProEntitlement();
	void initParking();

	void initSecuritySettings()
		.then(() => Promise.all([initTrees(), initBackupPasswordSettings(), initApiSettings()]))
		.then(() =>
			import('$lib/utils/refreshLocationLabels').then((mod) =>
				mod.refreshLocationLabelsForUiLocale(appearanceSettingsState.locale)
			)
		);

	scheduleDeferredBoot();

	const cleanupOnline = initOnlineState();

	return () => {
		cleanupOnline();
		cleanupViewportInsets?.();
		incomingBackupCleanup?.();
		removeVisibilityListener?.();
		void backListener?.remove();
		void appStateListener?.remove();
		void resumeListener?.remove();
	};
}
