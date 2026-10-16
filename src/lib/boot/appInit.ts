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
	initPowerSavingMode
} from '$lib/stores/powerSavingMode.svelte';
import { initParking } from '$lib/stores/parking.svelte';
import { initSecuritySettings, securitySettingsState } from '$lib/stores/securitySettings.svelte';
import { initTrees, treeStore } from '$lib/stores/trees.svelte';
import { parkingStore } from '$lib/stores/parking.svelte';
import { cleanupLegacySyncData } from '$lib/utils/cleanupLegacySync';
import { initBackupReminder, backupReminderState } from '$lib/utils/backupReminder.svelte';
import { handleBillingAppResume, initSupportBilling, syncSupportPurchasesFromStore } from '$lib/utils/billing';
import { supportBillingState } from '$lib/stores/supportBilling.svelte';
import { showOkToast } from '$lib/stores/appToast.svelte';
import * as m from '$lib/paraglide/messages.js';
import { initIncomingBackupListener } from '$lib/utils/archive';
import {
	handleIncomingArchiveReady,
	resumeIncomingArchiveIfNeeded
} from '$lib/utils/archive/incomingTreeShare.svelte';
import { registerTileCacheInterceptor } from '$lib/utils/map/tileCache';
import { initNativeUi, initViewportInsets } from '$lib/utils/nativeInit';
import { initOnlineState } from '$lib/utils/online.svelte';
import { initOnboarding, onboardingState } from '$lib/stores/onboarding.svelte';
import { getBackNavigationTarget } from '$lib/utils/app-navigation';
import { isAndroidApp } from '$lib/utils/platform';
import { listenRevisitNotificationTaps } from '$lib/utils/revisitNotifications';
import {
	listenBackupNotificationTaps,
	syncBackupReminderNotification
} from '$lib/utils/backupNotifications';
import { syncRevisitReminders } from '$lib/utils/revisitReminders';

export type AppBootCleanup = () => void;

type AppBootOptions = {
	base: string;
	nativeApp: boolean;
	getRouteId: () => string | null;
	getTreeId: () => string | null;
	onOnboardingReady?: () => void;
};

export function canRenderRouteContent(routeId: string | null): boolean {
	if (routeId === '/settings' || routeId?.startsWith('/settings/') === true) {
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
	let notificationTapCleanup: (() => void) | undefined;
	let backupNotificationTapCleanup: (() => void) | undefined;
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
				if (!supportBillingState.purchasePending) {
					void syncSupportPurchasesFromStore();
				}
				if (treeStore.loaded) {
					void syncRevisitReminders(treeStore.trees);
					if (backupReminderState.loaded) {
						void syncBackupReminderNotification(treeStore.trees, {
							lastExportAt: backupReminderState.lastExportAt
						});
					}
				}
				if (isAndroidApp()) {
					void resumeIncomingArchiveIfNeeded({
						base: options.base,
						getRouteId: options.getRouteId
					});
				}
			} else {
				clearBackupPasswordMemoryCache();
			}
		}).then((listener) => {
			appStateListener = listener;
		});

		void App.addListener('resume', () => {
			handleBillingAppResume();
			if (isAndroidApp()) {
				void resumeIncomingArchiveIfNeeded({
					base: options.base,
					getRouteId: options.getRouteId
				});
			}
		}).then((listener) => {
			resumeListener = listener;
		});

		if (isAndroidApp()) {
			void listenRevisitNotificationTaps((treeId) => {
				void goto(`${options.base}/tree/${encodeURIComponent(treeId)}`);
			}).then((cleanup) => {
				notificationTapCleanup = cleanup;
			});
			void listenBackupNotificationTaps(() => {
				void goto(`${options.base}/settings#backup-export`);
			}).then((cleanup) => {
				backupNotificationTapCleanup = cleanup;
			});
			void initIncomingBackupListener(() => {
				void handleIncomingArchiveReady({
					base: options.base,
					getRouteId: options.getRouteId
				});
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
	void initSupportBilling().then((sync) => {
		if (sync.consumed > 0) {
			showOkToast(m.support_purchase_success());
		}
	});
	void initParking();

	void initSecuritySettings()
		.then(() => Promise.all([initTrees(), initBackupPasswordSettings(), initApiSettings()]))
		.then(() => {
			// Labels refresh persists trees; only run once thumbs hydration finished
			// (mediaHydration !== 'full' persists are media-safe).
			if (!treeStore.loaded) return;
			void syncRevisitReminders(treeStore.trees);
			if (backupReminderState.loaded) {
				void syncBackupReminderNotification(treeStore.trees, {
					lastExportAt: backupReminderState.lastExportAt
				});
			}
			return import('$lib/utils/refreshLocationLabels').then((mod) =>
				mod.refreshLocationLabelsForUiLocale(appearanceSettingsState.locale)
			);
		})
		.catch((error) => {
			console.error('App security/data boot failed:', error);
			// Ensure tree boot still runs if security init rejected before .then(initTrees).
			void initTrees();
			void initBackupPasswordSettings();
		});

	scheduleDeferredBoot();

	const cleanupOnline = initOnlineState();

	return () => {
		cleanupOnline();
		cleanupViewportInsets?.();
		incomingBackupCleanup?.();
		notificationTapCleanup?.();
		backupNotificationTapCleanup?.();
		removeVisibilityListener?.();
		void backListener?.remove();
		void appStateListener?.remove();
		void resumeListener?.remove();
	};
}
