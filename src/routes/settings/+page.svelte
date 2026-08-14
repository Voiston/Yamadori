<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		appearanceSettingsState,
		initAppearanceSettings,
		restoreAppearanceSettings,
		setAppLocale,
		setDarkMode,
		setOutdoorMode,
		setSimpleMode
	} from '$lib/stores/appearanceSettings.svelte';
	import {
		apiSettingsState,
		getApiSettingsSnapshot,
		initApiSettings,
		restoreApiSettings,
		setApiEnabled,
		type ApiService
	} from '$lib/stores/apiSettings.svelte';
	import {
		compassSettingsState,
		initCompassSettings,
		setCompassGpsProfile,
		type CompassGpsProfile
	} from '$lib/stores/compassSettings.svelte';
	import {
		initPowerSavingMode,
		powerSavingModeState,
		setPowerSavingMode
	} from '$lib/stores/powerSavingMode.svelte';
	import {
		captureSettingsState,
		setTerrainModeEnabled
	} from '$lib/stores/captureSettings.svelte';
	import SettingsApiToggle from '$lib/components/SettingsApiToggle.svelte';
	import { getAppVersionLabel } from '$lib/utils/nativeInit';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PasswordPromptDialog from '$lib/components/PasswordPromptDialog.svelte';
	import { portal, APP_SHELL_PORTAL_TARGET } from '$lib/utils/portal';
	import { modalFocus } from '$lib/utils/modalFocus';
	import BackupPasswordFormDialog, {
		type BackupPasswordFormMode,
		type BackupPasswordFormResult
	} from '$lib/components/BackupPasswordFormDialog.svelte';
	import {
		backupPasswordSettingsState,
		changeBackupPassword,
		getBackupPasswordHint,
		initBackupPasswordSettings,
		verifyBackupPassword,
		removeBackupPassword,
		resetBackupPasswordConfig,
		setupBackupPassword,
	} from '$lib/stores/backupPasswordSettings.svelte';
	import { initParking, parkingStore, restoreParking } from '$lib/stores/parking.svelte';
	import {
		initTrees,
		mergeTreesFromBackup,
		replaceAllTrees,
		treeStore
	} from '$lib/stores/trees.svelte';
	import { exportAppBackup } from '$lib/utils/backupExport';
	import {
		archiveFilename,
		ArchiveError,
		analyzeArchiveConfidentiality,
		clearPendingIncomingBackup,
		consumePendingIncomingBackup,
		deliverArchive,
		dismissPendingIncomingBackup,
		formatIncomingBackupSize,
		incomingBackupState,
		isLegacyJsonBackupFile,
		isPasswordProtectedBlob,
		isZipArchiveFile,
		parseArchive,
		parseLegacyBackup,
		readPendingBackupBlob,
		reexportArchiveWithPassword,
		type ArchiveDeliveryMode,
		type ArchiveDeliveryResult,
		type RebuiltArchive,
		type YamadoriLegacyBackup
	} from '$lib/utils/archive';
	import { dismissAppToast, showSettingsToast } from '$lib/stores/appToast.svelte';
	import SettingsCacheSection from '$lib/components/settings/SettingsCacheSection.svelte';
	import { processLegacyImport } from '$lib/utils/settings/legacy-backup-import';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import pkg from '../../../package.json';
	import {
		clearTileCache,
		getTileCacheStats
	} from '$lib/utils/map/tileCache';
	import { clearWeatherCache, getWeatherCacheStats } from '$lib/utils/weatherCache';
	import { clearCadastreCache, getCadastreCacheStats } from '$lib/utils/cadastre';
	import { clearClimateCache, getClimateCacheStats } from '$lib/utils/climateCache';
	import { clearGddArchiveCache, getGddArchiveCacheStats } from '$lib/utils/gddArchiveCache';
	import { clearGeocodeCache, getGeocodeCacheStats } from '$lib/utils/geocodingCache';
	import {
		clearMairieContactCache,
		getMairieContactCacheStats
	} from '$lib/utils/mairieContactCache';
	import {
		clearProtectedAreasPersistentCache,
		getProtectedAreasCacheStats
	} from '$lib/utils/protectedAreasCache';
	import { clearProtectedAreasMemoryCache } from '$lib/utils/protectedAreas';
	import { clearProtectedAreasDispatchMemoryCache } from '$lib/geo/providers/protected/dispatch';
	import { resetOnboardingFlow } from '$lib/stores/onboarding.svelte';
	import {
		formatMigrationErrorMessage,
		initSecuritySettings,
		isLocalEncryptionAvailable,
		securitySettingsState,
		setLocalEncryptionEnabled
	} from '$lib/stores/securitySettings.svelte';
	import { initBackupReminder, markBackupExported } from '$lib/utils/backupReminder.svelte';
	import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
	import ProPurchaseCta from '$lib/components/ProPurchaseCta.svelte';
	import { proEntitlementState } from '$lib/stores/proEntitlement.svelte';
	import {
		devProOverrideState,
		setDevProOverride
	} from '$lib/stores/devProOverride.svelte';
	import { getHiddenTreeCount, isProUnlocked } from '$lib/utils/featurePolicy';
	import { LOCALE_OPTIONS } from '$lib/utils/i18n/locale';
	import { getIntlLocale } from '$lib/utils/i18n/locale';
	import * as m from '$lib/paraglide/messages.js';
	import { scheduleCadastreBackfill } from '$lib/utils/cadastreBackfill';
	import { onlineState } from '$lib/utils/online.svelte';

	let appVersion = $state<string | null>(null);
	let tileCacheCount = $state<number | null>(null);
	let tileCacheBytes = $state<number | null>(null);
	let weatherCacheCount = $state<number | null>(null);
	let cadastreCacheCount = $state<number | null>(null);
	let apiCachesCount = $state<number | null>(null);
	let clearingCache = $state(false);
	let clearingWeatherCache = $state(false);
	let clearingCadastreCache = $state(false);
	let clearingApiCaches = $state(false);
	let backingUp = $state(false);
	let restoring = $state(false);
	let showReplaceBackupDialog = $state(false);
	let pendingArchive = $state<RebuiltArchive | null>(null);
	let pendingLegacyBackup = $state<YamadoriLegacyBackup | null>(null);
	let importMode = $state<'merge' | 'replace'>('merge');
	let showPasswordFormDialog = $state(false);
	let passwordFormMode = $state<BackupPasswordFormMode>('setup');
	let passwordFormError = $state<string | null>(null);
	let showPasswordResetDialog = $state(false);
	let showPasswordImportDialog = $state(false);
	let showPasswordExportDialog = $state(false);
	let passwordImportError = $state<string | null>(null);
	let passwordExportError = $state<string | null>(null);
	/** When true, next export asks for a password (default: unprotected). */
	let exportProtectWithPassword = $state(false);
	/** verify = configured backup password; oneshot = password for this export only. */
	let exportPasswordMode = $state<'verify' | 'oneshot'>('verify');
	let showLocalEncryptionConfirm = $state(false);
	let showLegalDisclaimerDialog = $state(false);
	let storageLocked = $derived(securitySettingsState.migrationPending);
	let pendingPasswordBlob = $state<Blob | null>(null);
	let pendingPasswordImportMode = $state<'merge' | 'replace'>('merge');
	let pendingExportMode = $state<ArchiveDeliveryMode>('share');
	let legacyReexportInput: HTMLInputElement | undefined = $state();
	let showLegacyReexportPasswordDialog = $state(false);
	let pendingLegacyReexportBlob = $state<Blob | null>(null);
	let legacyReexportPasswordError = $state<string | null>(null);
	let backupInput: HTMLInputElement | undefined = $state();

	let intlLocale = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getIntlLocale();
	});

	let pageTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.title_settings();
	});

	function treePluralArgs(count: number) {
		const trees = count === 1 ? m.settings_tree_one() : m.settings_trees_many();
		return {
			count,
			trees,
			s: count === 1 ? '' : 's',
			en: count === 1 ? '' : 'en',
			'o/i': count === 1 ? 'o' : 'i',
			es: count === 1 ? '' : 'es'
		};
	}

	function scrollToHash(hash: string): void {
		const id = hash.replace(/^#/, '');
		if (!id) return;
		requestAnimationFrame(() => {
			document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}

	function closeLegalDisclaimerDialog() {
		showLegalDisclaimerDialog = false;
	}

	function handleLegalDisclaimerKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeLegalDisclaimerDialog();
		}
	}

	const apiToggles: {
		service: ApiService;
		provider: () => string;
		title: () => string;
		description: () => string;
		disabledConsequence: () => string;
	}[] = [
		{
			service: 'ignMap',
			provider: () => m.settings_api_provider_ign(),
			title: () => m.settings_api_ign_map_title(),
			description: () => m.settings_api_ign_map_desc(),
			disabledConsequence: () => m.settings_api_ign_map_disabled()
		},
		{
			service: 'ignCadastre',
			provider: () => m.settings_api_provider_ign(),
			title: () => m.settings_api_ign_cadastre_title(),
			description: () => m.settings_api_ign_cadastre_desc(),
			disabledConsequence: () => m.settings_api_ign_cadastre_disabled()
		},
		{
			service: 'ignProtectedAreas',
			provider: () => m.settings_api_provider_ign(),
			title: () => m.settings_api_ign_protected_areas_title(),
			description: () => m.settings_api_ign_protected_areas_desc(),
			disabledConsequence: () => m.settings_api_ign_protected_areas_disabled()
		},
		{
			service: 'openMeteoForecast',
			provider: () => m.settings_api_provider_open_meteo(),
			title: () => m.settings_api_open_meteo_forecast_title(),
			description: () => m.settings_api_open_meteo_forecast_desc(),
			disabledConsequence: () => m.settings_api_open_meteo_forecast_disabled()
		},
		{
			service: 'openMeteoArchive',
			provider: () => m.settings_api_provider_open_meteo(),
			title: () => m.settings_api_open_meteo_archive_title(),
			description: () => m.settings_api_open_meteo_archive_desc(),
			disabledConsequence: () => m.settings_api_open_meteo_archive_disabled()
		},
		{
			service: 'nominatim',
			provider: () => m.settings_api_provider_osm(),
			title: () => m.settings_api_nominatim_title(),
			description: () => m.settings_api_nominatim_desc(),
			disabledConsequence: () => m.settings_api_nominatim_disabled()
		},
		{
			service: 'servicePublicAnnuaire',
			provider: () => m.settings_api_provider_service_public(),
			title: () => m.settings_api_service_public_annuaire_title(),
			description: () => m.settings_api_service_public_annuaire_desc(),
			disabledConsequence: () => m.settings_api_service_public_annuaire_disabled()
		}
	];

	async function refreshTileCacheStats(): Promise<void> {
		const stats = await getTileCacheStats();
		tileCacheCount = stats.count;
		tileCacheBytes = stats.bytes;
	}

	async function refreshWeatherCacheStats(): Promise<void> {
		const stats = await getWeatherCacheStats();
		weatherCacheCount = stats.count;
	}

	async function refreshCadastreCacheStats(): Promise<void> {
		const stats = await getCadastreCacheStats();
		cadastreCacheCount = stats.count;
	}

	async function refreshApiCachesStats(): Promise<void> {
		const [protectedStats, climateStats, gddStats, geocodeStats, mairieStats] = await Promise.all([
			getProtectedAreasCacheStats(),
			getClimateCacheStats(),
			getGddArchiveCacheStats(),
			getGeocodeCacheStats(),
			getMairieContactCacheStats()
		]);
		apiCachesCount =
			protectedStats.count +
			climateStats.count +
			gddStats.count +
			geocodeStats.count +
			mairieStats.count;
	}

	$effect(() => {
		void initAppearanceSettings();
		void initApiSettings();
		void initCompassSettings();
		void initPowerSavingMode();
		void initBackupPasswordSettings();
		void initSecuritySettings();
		void refreshTileCacheStats();
		void refreshWeatherCacheStats();
		void refreshCadastreCacheStats();
		void refreshApiCachesStats();

		if (isNativeApp()) {
			void getAppVersionLabel().then((version) => {
				appVersion = version;
			});
		}
	});

	async function reloadSensitiveStores(): Promise<void> {
		await Promise.all([
			initTrees(),
			initParking(),
			initBackupPasswordSettings(),
			initBackupReminder()
		]);
	}

	async function applyLocalEncryption(enabled: boolean): Promise<void> {
		const success = await setLocalEncryptionEnabled(enabled);
		if (success) {
			await reloadSensitiveStores();
			showSettingsToast(
				'ok',
				enabled ? m.settings_local_encryption_enabled() : m.settings_local_encryption_disabled()
			);
			return;
		}
		const lastError = securitySettingsState.lastError;
		showSettingsToast(
			'error',
			lastError
				? formatMigrationErrorMessage(new Error(lastError))
				: m.settings_local_encryption_migration_failed()
		);
	}

	function handleLocalEncryptionToggle(enabled: boolean): void {
		if (enabled) {
			showLocalEncryptionConfirm = true;
			return;
		}
		void applyLocalEncryption(false);
	}

	async function confirmLocalEncryption(): Promise<void> {
		showLocalEncryptionConfirm = false;
		await applyLocalEncryption(true);
	}

	async function handleResetOnboarding() {
		await resetOnboardingFlow();
		showSettingsToast('ok', m.settings_onboarding_reset());
	}

	async function handleLocaleChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		await setAppLocale(value as (typeof LOCALE_OPTIONS)[number]['value']);
	}

	function archiveAppVersion(): string {
		return appVersion ?? pkg.version;
	}

	function notifyStorageLocked(): void {
		showSettingsToast('info', m.settings_storage_locked());
	}

	function guardStorageLocked(): boolean {
		if (storageLocked) {
			notifyStorageLocked();
			return true;
		}
		return false;
	}

	function formatExportSuccessMessage(result: ArchiveDeliveryResult): string {
		if (result === 'saved') {
			return m.settings_export_saved();
		}
		if (result === 'shared') {
			return m.settings_export_shared();
		}
		return m.settings_export_downloaded();
	}

	function formatImportSuccessMessage(treeCount: number, mode: 'merge' | 'replace'): string {
		const args = treePluralArgs(treeCount);
		if (mode === 'replace') {
			return m.settings_import_restored(args);
		}
		return m.settings_import_merged(args);
	}

	function formatImportConfirmMessage(treeCount: number): string {
		const { trees } = treePluralArgs(treeCount);
		return `${treeCount} ${trees} — ${m.confirm_default_message()}`;
	}

	function openPasswordForm(mode: BackupPasswordFormMode) {
		if (guardStorageLocked()) return;
		passwordFormMode = mode;
		passwordFormError = null;
		showPasswordFormDialog = true;
	}

	function passwordResetMessage(): string {
		return m.settings_backup_password_reset_message();
	}

	async function handlePasswordFormConfirm(result: BackupPasswordFormResult) {
		passwordFormError = null;
		try {
			if (result.mode === 'setup') {
				await setupBackupPassword(result.password, result.hint);
				showPasswordFormDialog = false;
				showSettingsToast('ok', m.settings_backup_password_setup_ok());
				return;
			}

			if (result.mode === 'change') {
				const ok = await changeBackupPassword(
					result.oldPassword,
					result.newPassword,
					result.hint
				);
				if (!ok) {
					passwordFormError = m.settings_backup_password_wrong();
					return;
				}
				showPasswordFormDialog = false;
				showSettingsToast('ok', m.settings_backup_password_change_ok());
				return;
			}

			const ok = await removeBackupPassword(result.oldPassword);
			if (!ok) {
				passwordFormError = m.settings_backup_password_wrong();
				return;
			}
			showPasswordFormDialog = false;
			showSettingsToast('ok', m.settings_backup_password_remove_ok());
		} catch (error) {
			passwordFormError =
				error instanceof Error ? error.message : m.settings_backup_failed();
		}
	}

	async function handlePasswordResetConfirm() {
		await resetBackupPasswordConfig();
		showPasswordResetDialog = false;
		showSettingsToast('ok', m.settings_backup_password_reset_ok());
	}

	async function runExportBackup(mode: ArchiveDeliveryMode, exportPassword?: string) {
		const { delivery } = await exportAppBackup(mode, {
			password: exportPassword
		});
		showSettingsToast('ok', formatExportSuccessMessage(delivery));
	}

	async function handleExportBackup(mode: ArchiveDeliveryMode) {
		if (guardStorageLocked()) return;
		if (!treeStore.loaded) {
			showSettingsToast('error', m.settings_loading_wait());
			return;
		}

		if (exportProtectWithPassword) {
			pendingExportMode = mode;
			passwordExportError = null;
			exportPasswordMode = backupPasswordSettingsState.configured ? 'verify' : 'oneshot';
			showPasswordExportDialog = true;
			return;
		}

		backingUp = true;
		dismissAppToast();
		try {
			await runExportBackup(mode);
		} catch (error) {
			showSettingsToast(
				'error',
				error instanceof Error ? error.message : m.settings_backup_failed()
			);
		} finally {
			backingUp = false;
		}
	}

	async function handlePasswordExportConfirm(password: string) {
		backingUp = true;
		passwordExportError = null;
		dismissAppToast();
		try {
			if (exportPasswordMode === 'verify') {
				if (!(await verifyBackupPassword(password))) {
					passwordExportError = m.archive_wrong_password();
					return;
				}
			} else if (password.length < 8) {
				passwordExportError = m.settings_backup_password_too_short();
				return;
			}
			showPasswordExportDialog = false;
			await runExportBackup(pendingExportMode, password);
		} catch (error) {
			showSettingsToast(
				'error',
				error instanceof Error ? error.message : m.settings_backup_failed()
			);
		} finally {
			backingUp = false;
		}
	}

	function cancelPasswordExport() {
		passwordExportError = null;
		showPasswordExportDialog = false;
	}

	function openBackupImport(mode: 'merge' | 'replace') {
		if (guardStorageLocked()) return;
		importMode = mode;
		backupInput?.click();
	}

	function clearPendingBackup(): void {
		pendingArchive = null;
		pendingLegacyBackup = null;
	}

	async function reloadLocalData(): Promise<void> {
		await Promise.all([initTrees(), initParking()]);
	}

	async function applyArchiveData(
		data: RebuiltArchive,
		mode: 'merge' | 'replace'
	): Promise<number> {
		if (mode === 'replace') {
			await replaceAllTrees(data.trees);
		} else {
			await mergeTreesFromBackup(data.trees);
		}
		await restoreParking(data.parking);
		if (data.apiSettings) {
			await restoreApiSettings(data.apiSettings);
		}
		// Reload before appearance restore so any later label refresh sees a settled store.
		await reloadLocalData();
		// Never refresh labels during import — it races thumbs-only memory and can wipe media.
		await restoreAppearanceSettings(data.appearanceSettings, { skipLabelRefresh: true });
		return treeStore.trees.length;
	}

	async function applyLegacyBackup(
		backup: YamadoriLegacyBackup,
		mode: 'merge' | 'replace'
	): Promise<number> {
		if (mode === 'replace') {
			await replaceAllTrees(backup.trees);
		} else {
			await mergeTreesFromBackup(backup.trees);
		}
		await restoreParking(backup.parking);
		await reloadLocalData();
		return treeStore.trees.length;
	}

	async function importBackupFromBlob(
		blob: Blob,
		mode: 'merge' | 'replace',
		password?: string
	): Promise<void> {
		if (guardStorageLocked()) return;
		const needsPassword = await isPasswordProtectedBlob(blob);
		if (needsPassword && !password) {
			pendingPasswordBlob = blob;
			pendingPasswordImportMode = mode;
			passwordImportError = null;
			showPasswordImportDialog = true;
			return;
		}

		restoring = true;
		dismissAppToast();
		try {
			const archive = await parseArchive(blob, password ? { password } : undefined);
			showPasswordImportDialog = false;
			pendingPasswordBlob = null;
			passwordImportError = null;
			if (mode === 'replace') {
				pendingArchive = archive;
				pendingLegacyBackup = null;
				showReplaceBackupDialog = true;
				showSettingsToast('info', formatImportConfirmMessage(archive.preview.treeCount));
				return;
			}
			const treeCount = await applyArchiveData(archive, 'merge');
			showSettingsToast('ok', formatImportSuccessMessage(treeCount, 'merge'));
		} catch (error) {
			if (error instanceof ArchiveError && error.code === 'ARCHIVE_WRONG_PASSWORD') {
				passwordImportError = error.message;
				pendingPasswordBlob = blob;
				pendingPasswordImportMode = mode;
				showPasswordImportDialog = true;
				return;
			}
			showPasswordImportDialog = false;
			pendingPasswordBlob = null;
			passwordImportError = null;
			const message =
				error instanceof ArchiveError
					? error.message
					: error instanceof Error
						? error.message
						: m.settings_restore_failed();
			showSettingsToast('error', message);
		} finally {
			restoring = false;
		}
	}

	async function handlePasswordImportConfirm(password: string) {
		if (!pendingPasswordBlob) return;
		await importBackupFromBlob(pendingPasswordBlob, pendingPasswordImportMode, password);
	}

	function cancelPasswordImport() {
		pendingPasswordBlob = null;
		passwordImportError = null;
		showPasswordImportDialog = false;
	}

	async function handleIncomingImport(mode: 'merge' | 'replace') {
		const pending = await readPendingBackupBlob();
		if (!pending) {
			showSettingsToast('error', m.settings_backup_not_found());
			clearPendingIncomingBackup();
			return;
		}

		importMode = mode;
		await importBackupFromBlob(pending.blob, mode);
		if (mode === 'merge') {
			await dismissPendingIncomingBackup();
		}
	}

	async function dismissIncomingBackup(): Promise<void> {
		await dismissPendingIncomingBackup();
		dismissAppToast();
	}

	function openLegacyArchiveReexport(): void {
		if (guardStorageLocked()) return;
		legacyReexportInput?.click();
	}

	async function handleLegacyReexportFileSelected(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || !isZipArchiveFile(file)) {
			return;
		}

		backingUp = true;
		dismissAppToast();
		try {
			const blob = file;
			const analysis = await analyzeArchiveConfidentiality(blob);
			if (analysis.kind === 'password_protected') {
				showSettingsToast('info', m.settings_legacy_archive_reexport_none());
				return;
			}
			if (analysis.kind === 'invalid') {
				showSettingsToast('error', analysis.message);
				return;
			}
			// weak (legacy crypto-theater) or honest plaintext → offer password envelope

			pendingLegacyReexportBlob = blob;
			legacyReexportPasswordError = null;
			showLegacyReexportPasswordDialog = true;
		} catch (error) {
			showSettingsToast(
				'error',
				error instanceof Error ? error.message : m.settings_backup_failed()
			);
		} finally {
			backingUp = false;
		}
	}

	async function handleLegacyReexportPasswordConfirm(password: string): Promise<void> {
		if (!pendingLegacyReexportBlob) return;
		backingUp = true;
		legacyReexportPasswordError = null;
		dismissAppToast();
		try {
			const blob = await reexportArchiveWithPassword(
				pendingLegacyReexportBlob,
				password,
				archiveAppVersion()
			);
			const filename = archiveFilename();
			await deliverArchive(blob, filename, 'share');
			showLegacyReexportPasswordDialog = false;
			pendingLegacyReexportBlob = null;
			showSettingsToast('ok', m.settings_legacy_archive_reexport_ok());
		} catch (error) {
			legacyReexportPasswordError =
				error instanceof Error ? error.message : m.settings_backup_failed();
		} finally {
			backingUp = false;
		}
	}

	function cancelLegacyReexportPassword(): void {
		pendingLegacyReexportBlob = null;
		legacyReexportPasswordError = null;
		showLegacyReexportPasswordDialog = false;
	}

	async function importLegacyBackupText(legacyText: string): Promise<void> {
		restoring = true;
		dismissAppToast();
		try {
			const legacy = parseLegacyBackup(legacyText);
			const result = await processLegacyImport(legacy, importMode, applyLegacyBackup);
			if (result.kind === 'replace_requested') {
				pendingLegacyBackup = result.request.legacy;
				pendingArchive = null;
				showReplaceBackupDialog = true;
				showSettingsToast('info', formatImportConfirmMessage(result.request.treeCount));
				return;
			}
			showSettingsToast('ok', formatImportSuccessMessage(result.treeCount, 'merge'));
		} catch (error) {
			showSettingsToast(
				'error',
				error instanceof Error ? error.message : m.settings_restore_failed()
			);
		} finally {
			restoring = false;
		}
	}

	async function handleBackupFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		if (isLegacyJsonBackupFile(file) && !isZipArchiveFile(file)) {
			await importLegacyBackupText(await file.text());
			return;
		}

		await importBackupFromBlob(file, importMode);
	}

	onMount(() => {
		if (isAndroidApp()) {
			void consumePendingIncomingBackup();
		}
		scrollToHash(page.url.hash);
	});

	$effect(() => {
		if (!treeStore.loaded || !onlineState.online) return;
		scheduleCadastreBackfill();
	});

	afterNavigate(({ to }) => {
		if (to?.url.hash) {
			scrollToHash(to.url.hash);
		}
	});

	let hiddenTreeCount = $derived(getHiddenTreeCount(treeStore.trees));
	let isPro = $derived(isProUnlocked());
	let devProTestActive = $derived(
		devProOverrideState.available && devProOverrideState.enabled && !proEntitlementState.isPro
	);

	async function handleReplaceBackup() {
		restoring = true;
		dismissAppToast();
		try {
			if (pendingArchive) {
				const treeCount = await applyArchiveData(pendingArchive, 'replace');
				showSettingsToast('ok', formatImportSuccessMessage(treeCount, 'replace'));
			} else if (pendingLegacyBackup) {
				const treeCount = await applyLegacyBackup(pendingLegacyBackup, 'replace');
				showSettingsToast('ok', formatImportSuccessMessage(treeCount, 'replace'));
			}
		} catch (error) {
			showSettingsToast(
				'error',
				error instanceof Error ? error.message : m.settings_restore_failed()
			);
		} finally {
			restoring = false;
			clearPendingBackup();
			await dismissPendingIncomingBackup();
		}
	}

	async function handleClearWeatherCache() {
		clearingWeatherCache = true;
		try {
			await clearWeatherCache();
			await refreshWeatherCacheStats();
			showSettingsToast('ok', m.settings_weather_cache_cleared());
		} catch (error) {
			showSettingsToast(
				'error',
				error instanceof Error ? error.message : m.settings_weather_cache_clear_failed()
			);
		} finally {
			clearingWeatherCache = false;
		}
	}

	async function handleClearTileCache() {
		clearingCache = true;
		try {
			await clearTileCache();
			await refreshTileCacheStats();
			showSettingsToast('ok', m.settings_map_cache_cleared());
		} catch (error) {
			showSettingsToast(
				'error',
				error instanceof Error ? error.message : m.settings_map_cache_clear_failed()
			);
		} finally {
			clearingCache = false;
		}
	}

	async function handleClearCadastreCache() {
		clearingCadastreCache = true;
		try {
			await clearCadastreCache();
			await refreshCadastreCacheStats();
			showSettingsToast('ok', m.settings_cadastre_cache_cleared());
		} catch (error) {
			showSettingsToast(
				'error',
				error instanceof Error ? error.message : m.settings_cadastre_cache_clear_failed()
			);
		} finally {
			clearingCadastreCache = false;
		}
	}

	async function handleClearApiCaches() {
		clearingApiCaches = true;
		try {
			await Promise.all([
				clearProtectedAreasPersistentCache(),
				clearClimateCache(),
				clearGddArchiveCache(),
				clearGeocodeCache(),
				clearMairieContactCache()
			]);
			clearProtectedAreasMemoryCache();
			clearProtectedAreasDispatchMemoryCache();
			await refreshApiCachesStats();
			showSettingsToast('ok', m.settings_api_caches_cleared());
		} catch (error) {
			showSettingsToast(
				'error',
				error instanceof Error ? error.message : m.settings_api_caches_clear_failed()
			);
		} finally {
			clearingApiCaches = false;
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<section class="flex flex-col gap-3">
		<div>
			<h2 class="text-lg font-semibold text-forest-900">{m.settings_display()}</h2>
		</div>

		<div class="app-section-list">
			{#if isAndroidApp()}
				<label class="app-section-row">
					<input
						type="checkbox"
						class="mt-1 h-4 w-4 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
						checked={captureSettingsState.terrainModeEnabled}
						onchange={(event) => void setTerrainModeEnabled(event.currentTarget.checked)}
					/>
					<span class="text-sm">
						<span class="font-medium text-forest-900">{m.settings_terrain_mode()}</span>
						<span class="mt-0.5 block text-muted">{m.settings_terrain_mode_hint()}</span>
					</span>
				</label>
			{/if}

			<label class="app-section-row">
				<input
					type="checkbox"
					class="mt-1 h-4 w-4 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
					checked={appearanceSettingsState.simpleMode}
					onchange={(event) => void setSimpleMode(event.currentTarget.checked)}
				/>
				<span class="text-sm">
					<span class="font-medium text-forest-900">{m.simple_mode_label()}</span>
					<span class="mt-0.5 block text-muted">{m.settings_simple_mode_hint()}</span>
				</span>
			</label>

			<label class="app-section-row" class:opacity-60={powerSavingModeState.active}>
				<input
					type="checkbox"
					class="mt-1 h-4 w-4 rounded border-gray-300 text-forest-800 focus:ring-forest-600 disabled:cursor-not-allowed"
					checked={appearanceSettingsState.outdoorMode}
					disabled={powerSavingModeState.active}
					onchange={(event) => void setOutdoorMode(event.currentTarget.checked)}
				/>
				<span class="text-sm">
					<span class="font-medium text-forest-900">{m.settings_outdoor_mode()}</span>
					<span class="mt-0.5 block text-muted">
						{m.settings_outdoor_hint()}
						{#if isNativeApp()}
							{m.settings_outdoor_android_brightness()}
						{/if}
						{#if powerSavingModeState.active}
							{m.settings_power_saving_outdoor_blocked()}
						{/if}
					</span>
				</span>
			</label>

			<label class="app-section-row">
				<input
					type="checkbox"
					class="mt-1 h-4 w-4 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
					checked={appearanceSettingsState.darkMode}
					onchange={(event) => void setDarkMode(event.currentTarget.checked)}
				/>
				<span class="text-sm">
					<span class="font-medium text-forest-900">{m.settings_dark_mode()}</span>
					<span class="mt-0.5 block text-muted">{m.settings_dark_hint()}</span>
				</span>
			</label>

			<label class="app-section-row">
				<input
					type="checkbox"
					class="mt-1 h-4 w-4 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
					checked={powerSavingModeState.active}
					onchange={(event) => void setPowerSavingMode(event.currentTarget.checked)}
				/>
				<span class="text-sm">
					<span class="font-medium text-forest-900">{m.settings_power_saving_mode()}</span>
					<span class="mt-0.5 block text-muted">{m.settings_power_saving_hint()}</span>
				</span>
			</label>

			<div class="flex flex-col gap-2 px-4 py-3">
				<label for="app-locale" class="text-sm font-medium text-forest-900"
					>{m.settings_language()}</label
				>
				<select
					id="app-locale"
					class="rounded-[var(--radius-control)] border border-gray-200 bg-white px-4 py-3 text-sm text-forest-900"
					value={appearanceSettingsState.locale}
					onchange={(event) => void handleLocaleChange(event)}
				>
					{#each LOCALE_OPTIONS as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<div>
			<h2 class="text-lg font-semibold text-forest-900">{m.settings_backup()}</h2>
			<p class="mt-1 text-sm text-muted">
				{m.settings_backup_hint()}
			</p>
		</div>

		{#if isAndroidApp() && incomingBackupState.pending}
			<div class="app-card border-forest-200 bg-forest-50 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">{m.settings_backup_received()}</p>
				<p class="mt-1 text-sm text-forest-800">
					{m.settings_backup_received_hint({ name: incomingBackupState.pending.displayName })}
				</p>
				<p class="mt-1 font-mono text-xs text-forest-700">
					{m.settings_backup_received_meta({
						size: formatIncomingBackupSize(incomingBackupState.pending.fileSizeBytes),
						hash: incomingBackupState.pending.sha256Prefix
					})}
				</p>
				<div class="mt-3 flex flex-col gap-2 sm:flex-row">
					<button
						type="button"
						onclick={() => void handleIncomingImport('merge')}
						disabled={restoring || storageLocked}
						class="btn-secondary !h-11 text-sm sm:!w-auto"
					>
						{m.action_merge()}
					</button>
					<button
						type="button"
						onclick={() => void handleIncomingImport('replace')}
						disabled={restoring || storageLocked}
						class="!h-11 rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-900 transition active:scale-[0.98] disabled:opacity-50 sm:w-auto"
					>
						{m.settings_replace_all()}
					</button>
					<button
						type="button"
						onclick={() => void dismissIncomingBackup()}
						disabled={restoring || storageLocked}
						class="rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-medium text-muted disabled:opacity-50"
					>
						{m.action_ignore()}
					</button>
				</div>
			</div>
		{/if}

		<div class="app-section-list">
			<div id="backup-export" class="scroll-mt-4 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">{m.settings_backup_export()}</p>
				<label class="mt-3 flex items-start gap-3">
					<input
						type="checkbox"
						class="mt-1 h-4 w-4 rounded border-forest-300 text-forest-700 focus:ring-forest-500"
						bind:checked={exportProtectWithPassword}
						disabled={backingUp || storageLocked}
					/>
					<span>
						<span class="block text-sm text-forest-900">{m.settings_backup_export_protect()}</span>
						<span class="mt-0.5 block text-xs text-muted">{m.settings_backup_export_protect_hint()}</span>
						{#if !exportProtectWithPassword}
							<span class="mt-1 block text-xs text-amber-800">{m.settings_backup_export_unprotected_warning()}</span>
						{/if}
					</span>
				</label>
				<div class="mt-3 flex flex-col gap-2">
					<button
						type="button"
						onclick={() => void handleExportBackup('share')}
						disabled={backingUp || !treeStore.loaded || storageLocked}
						class="btn-primary !h-11 text-sm"
					>
						{backingUp ? m.action_exporting() : m.action_export()}
					</button>
					<button
						type="button"
						onclick={() => void handleExportBackup('local')}
						disabled={backingUp || !treeStore.loaded || storageLocked}
						class="btn-secondary !h-11 text-sm"
					>
						{backingUp
							? m.action_saving()
							: isAndroidApp()
								? m.settings_save_downloads()
								: m.settings_download_backup()}
					</button>
				</div>
			</div>

			<div id="backup-import" class="scroll-mt-4 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">{m.settings_backup_import()}</p>
				<p class="mt-1 text-xs text-muted">{m.settings_backup_import_hint()}</p>
				<div class="mt-3 flex flex-col gap-2">
					<button
						type="button"
						onclick={() => openBackupImport('merge')}
						disabled={restoring || storageLocked}
						class="btn-secondary !h-11 text-sm"
					>
						{restoring ? m.action_importing() : m.action_import()}
					</button>
					<button
						type="button"
						onclick={() => openBackupImport('replace')}
						disabled={restoring || storageLocked}
						class="!h-11 rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-900 transition active:scale-[0.98] disabled:opacity-50"
					>
						{m.settings_import_replace()}
					</button>
				</div>
			</div>
		</div>

		<div class="app-card px-4 py-3">
			{#if backupPasswordSettingsState.configured}
				<p class="text-sm font-medium text-forest-900">
					{m.settings_backup_password_configured()}
				</p>
				<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
					<button
						type="button"
						onclick={() => openPasswordForm('change')}
						class="btn-secondary !h-11 text-sm sm:!w-auto"
					>
						{m.settings_backup_password_change()}
					</button>
					<button
						type="button"
						onclick={() => openPasswordForm('remove')}
						class="btn-secondary !h-11 text-sm sm:!w-auto"
					>
						{m.settings_backup_password_remove()}
					</button>
				</div>
				<div class="mt-3">
					<button
						type="button"
						onclick={() => {
							showPasswordResetDialog = true;
						}}
						class="text-left text-xs font-medium text-muted underline-offset-2 hover:underline"
					>
						{m.settings_backup_password_forgot()}
					</button>
					{#if backupPasswordSettingsState.hint}
						<p class="mt-1.5 text-xs text-muted">
							{m.settings_backup_password_hint_prefix()}
							<span class="font-semibold text-forest-900">{backupPasswordSettingsState.hint}</span>
						</p>
					{/if}
				</div>
			{:else}
				<p class="text-xs text-amber-800">{m.settings_backup_password_recommended()}</p>
				<button
					type="button"
					onclick={() => openPasswordForm('setup')}
					class="btn-secondary mt-3 !h-11 text-sm sm:!w-auto"
				>
					{m.settings_backup_password_setup()}
				</button>
			{/if}
		</div>

		<div class="app-section-list">
			<div class="px-4 py-3">
				<p class="text-sm font-medium text-forest-900">{m.settings_legacy_archive_reexport_title()}</p>
				<p class="mt-1 text-xs text-muted">{m.settings_legacy_archive_reexport_body()}</p>
				<button
					type="button"
					onclick={openLegacyArchiveReexport}
					disabled={backingUp || storageLocked}
					class="btn-secondary mt-3 !h-11 text-sm sm:!w-auto"
				>
					{m.settings_legacy_archive_reexport_action()}
				</button>
			</div>
		</div>

		<input
			bind:this={backupInput}
			type="file"
			accept="application/zip,.zip,.yamadori.zip,application/json,.json"
			class="hidden"
			onchange={(event) => void handleBackupFileSelected(event)}
		/>
		<input
			bind:this={legacyReexportInput}
			type="file"
			accept="application/zip,.zip,.yamadori.zip"
			class="hidden"
			onchange={(event) => void handleLegacyReexportFileSelected(event)}
		/>
	</section>

	<section class="flex flex-col gap-3">
		<div>
			<h2 class="text-lg font-semibold text-forest-900">{m.settings_compass_gps_title()}</h2>
			<p class="mt-1 text-sm text-muted">{m.settings_compass_gps_hint()}</p>
		</div>

		<div class="app-section-list">
			{#each [
				{ value: 'watch' as CompassGpsProfile, label: m.settings_compass_gps_watch_label(), hint: m.settings_compass_gps_watch_hint() },
				{ value: 'proximity' as CompassGpsProfile, label: m.settings_compass_gps_proximity_label(), hint: m.settings_compass_gps_proximity_hint() }
			] as option (option.value)}
				<label class="app-section-row">
					<input
						type="radio"
						name="compass-gps-profile"
						class="mt-1 h-4 w-4 border-gray-300 text-forest-800 focus:ring-forest-600"
						checked={compassSettingsState.gpsProfile === option.value}
						onchange={() => void setCompassGpsProfile(option.value)}
					/>
					<span class="text-sm">
						<span class="font-medium text-forest-900">{option.label}</span>
						<span class="mt-0.5 block text-muted">{option.hint}</span>
					</span>
				</label>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<div>
			<h2 class="text-lg font-semibold text-forest-900">{m.pro_title()}</h2>
			<p class="mt-1 text-sm text-muted">{m.pro_features_hint()}</p>
			{#if devProTestActive}
				<p
					class="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
				>
					{m.pro_dev_test_active()}
				</p>
			{/if}
		</div>
		<div class="pro-surface">
			<div class="pro-surface-hero">
				<span class="pro-badge">{m.pro_badge_short()}</span>
				<p class="mt-2 text-sm font-medium text-white/90">
					{isPro ? m.pro_status_active() : m.pro_status_free()}
				</p>
			</div>
			<div class="px-4 py-3">
				<p class="text-sm text-muted">
					{#if isPro}
						{m.pro_trees_count_pro({ count: String(treeStore.trees.length) })}
					{:else if hiddenTreeCount > 0}
						{m.pro_trees_count({
							visible: String(treeStore.trees.length - hiddenTreeCount),
							hidden: String(hiddenTreeCount)
						})}
					{:else}
						{m.pro_trees_count_pro({ count: String(treeStore.trees.length) })}
					{/if}
				</p>
				{#if !isPro}
					<div class="mt-3">
						<ProPurchaseCta active={!isPro} />
					</div>
				{/if}
				{#if devProOverrideState.available}
					<div class="mt-3 border-t border-gray-100 pt-3">
						<button
							type="button"
							class="w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] {devProOverrideState.enabled
								? 'border-amber-400 bg-amber-50 text-amber-900'
								: 'border-gray-300 bg-white text-forest-800'}"
							onclick={() => void setDevProOverride(!devProOverrideState.enabled)}
						>
							{devProOverrideState.enabled
								? m.pro_dev_test_disable()
								: m.pro_dev_test_enable()}
						</button>
						<p class="mt-1 text-xs text-muted">{m.pro_dev_test_hint()}</p>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<SettingsCacheSection
		{tileCacheCount}
		{tileCacheBytes}
		{weatherCacheCount}
		{cadastreCacheCount}
		{apiCachesCount}
		{clearingCache}
		{clearingWeatherCache}
		{clearingCadastreCache}
		{clearingApiCaches}
		onClearTileCache={handleClearTileCache}
		onClearWeatherCache={handleClearWeatherCache}
		onClearCadastreCache={handleClearCadastreCache}
		onClearApiCaches={handleClearApiCaches}
	/>

	<section class="flex flex-col gap-3">
		<div>
			<h2 class="text-lg font-semibold text-forest-900">{m.settings_online_services()}</h2>
			<p class="mt-1 text-sm text-muted">{m.settings_online_services_hint()}</p>
		</div>
		<div class="app-section-list">
			{#each apiToggles as toggle (toggle.service)}
				<SettingsApiToggle
					title={toggle.title()}
					description={toggle.description()}
					disabledConsequence={toggle.disabledConsequence()}
					provider={toggle.provider()}
					checked={apiSettingsState[toggle.service]}
					onchange={(enabled) => void setApiEnabled(toggle.service, enabled)}
				/>
			{/each}
		</div>
	</section>

	{#if isNativeApp()}
		<section class="flex flex-col gap-3">
			<div>
				<h2 class="text-lg font-semibold text-forest-900">{m.settings_app_version()}</h2>
				<p class="mt-1 text-sm text-muted">
					{#if appVersion}
						{appVersion}
					{:else}
						{m.settings_version_loading()}
					{/if}
				</p>
			</div>
		</section>
	{/if}

	<section class="flex flex-col gap-3">
		<div>
			<h2 class="text-lg font-semibold text-forest-900">{m.settings_security_privacy()}</h2>
			<p class="mt-1 text-sm text-muted">{m.settings_privacy_hint()}</p>
		</div>

		<div class="app-section-list">
			{#if isLocalEncryptionAvailable()}
				<label class="app-section-row">
					<input
						type="checkbox"
						class="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-forest-800 focus:ring-forest-600 disabled:cursor-not-allowed"
						checked={securitySettingsState.localEncryptionEnabled}
						disabled={securitySettingsState.migrationPending}
						onchange={(event) => {
							const input = event.currentTarget as HTMLInputElement;
							const requested = input.checked;
							input.checked = securitySettingsState.localEncryptionEnabled;
							handleLocalEncryptionToggle(requested);
						}}
					/>
					<span class="min-w-0 flex-1 text-sm">
						<span class="font-medium text-forest-900">{m.settings_local_encryption()}</span>
						<span class="mt-0.5 block text-muted">{m.settings_local_encryption_hint()}</span>
						{#if !securitySettingsState.localEncryptionEnabled}
							<span class="mt-1 block text-xs text-amber-800">{m.settings_local_encryption_off_warning()}</span>
						{/if}
					</span>
				</label>
			{/if}

			{#if isAndroidApp()}
				<button
					type="button"
					onclick={() => void handleResetOnboarding()}
					class="w-full px-4 py-3 text-center text-sm font-medium text-forest-800 transition active:scale-[0.98]"
				>
					{m.settings_reset_onboarding()}
				</button>
			{/if}

			<a
				href={resolve('/settings/privacy')}
				class="block px-4 py-3 text-center text-sm font-medium text-forest-800 transition active:scale-[0.98]"
			>
				{m.settings_privacy_policy_link()}
			</a>

			<button
				type="button"
				onclick={() => {
					showLegalDisclaimerDialog = true;
				}}
				class="w-full px-4 py-3 text-center text-sm font-medium text-forest-800 transition active:scale-[0.98]"
			>
				{m.settings_legal_disclaimer_link()}
			</button>
		</div>
	</section>

	<a href={resolve('/')} class="text-center text-sm font-medium text-forest-800">{m.layout_back()}</a>
</div>

<ConfirmDialog
	bind:open={showLocalEncryptionConfirm}
	title={m.settings_local_encryption_confirm_title()}
	message={m.settings_local_encryption_confirm_body()}
	confirmLabel={m.action_confirm()}
	onconfirm={() => void confirmLocalEncryption()}
	oncancel={() => {
		showLocalEncryptionConfirm = false;
	}}
/>

<svelte:window
	onkeydown={showLegalDisclaimerDialog ? handleLegalDisclaimerKeydown : undefined}
/>

{#if showLegalDisclaimerDialog}
	<div
		use:portal={APP_SHELL_PORTAL_TARGET}
		data-yamadori-portal
		class="fixed inset-0 z-[100] flex items-end justify-center bg-forest-900/40 p-4 sm:items-center"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				closeLegalDisclaimerDialog();
			}
		}}
	>
		<div
			class="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="legal-disclaimer-dialog-title"
			aria-describedby="legal-disclaimer-dialog-body"
			use:modalFocus={true}
		>
			<h2 id="legal-disclaimer-dialog-title" class="text-lg font-semibold text-forest-900">
				{m.settings_legal_disclaimer_link()}
			</h2>
			<p id="legal-disclaimer-dialog-body" class="mt-3 text-sm leading-relaxed text-muted">
				{m.veto_disclaimer_body()}
			</p>
			<button
				type="button"
				onclick={closeLegalDisclaimerDialog}
				class="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.98]"
			>
				{m.action_close()}
			</button>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={showReplaceBackupDialog}
	title={m.settings_replace_title()}
	message={m.settings_replace_message()}
	confirmLabel={m.action_replace()}
	onconfirm={() => void handleReplaceBackup()}
	oncancel={() => {
		clearPendingBackup();
		void dismissPendingIncomingBackup();
	}}
/>

<PasswordPromptDialog
	bind:open={showPasswordExportDialog}
	bind:error={passwordExportError}
	title={exportPasswordMode === 'oneshot'
		? m.settings_backup_export_oneshot_title()
		: m.settings_backup_export_password_title()}
	message={exportPasswordMode === 'oneshot'
		? m.settings_backup_export_oneshot_message()
		: m.settings_backup_export_password_message()}
	hint={exportPasswordMode === 'verify' ? getBackupPasswordHint() : null}
	onconfirm={(password) => void handlePasswordExportConfirm(password)}
	oncancel={cancelPasswordExport}
/>

<PasswordPromptDialog
	bind:open={showLegacyReexportPasswordDialog}
	bind:error={legacyReexportPasswordError}
	title={m.settings_legacy_archive_reexport_password_title()}
	message={m.settings_legacy_archive_reexport_password_message()}
	onconfirm={(password) => void handleLegacyReexportPasswordConfirm(password)}
	oncancel={cancelLegacyReexportPassword}
/>

<PasswordPromptDialog
	bind:open={showPasswordImportDialog}
	bind:error={passwordImportError}
	hint={getBackupPasswordHint()}
	onconfirm={(password) => void handlePasswordImportConfirm(password)}
	oncancel={cancelPasswordImport}
/>

<BackupPasswordFormDialog
	bind:open={showPasswordFormDialog}
	bind:mode={passwordFormMode}
	bind:error={passwordFormError}
	initialHint={backupPasswordSettingsState.hint ?? ''}
	onconfirm={(result) => void handlePasswordFormConfirm(result)}
	oncancel={() => {
		passwordFormError = null;
	}}
/>

<ConfirmDialog
	bind:open={showPasswordResetDialog}
	title={m.settings_backup_password_reset_title()}
	message={passwordResetMessage()}
	confirmLabel={m.action_confirm()}
	variant="danger"
	onconfirm={() => void handlePasswordResetConfirm()}
/>
