<script lang="ts">
	import { base } from '$app/paths';
	import {
		appearanceSettingsState,
		initAppearanceSettings,
		restoreAppearanceSettings,
		setAppLocale,
		setDarkMode,
		setOutdoorMode
	} from '$lib/stores/appearanceSettings.svelte';
	import {
		initLocationSettings,
		locationSettingsState,
		restoreLocationSettings,
		setBackgroundTrackingEnabled
	} from '$lib/stores/locationSettings.svelte';
	import { openBackgroundLocationSettings } from '$lib/utils/backgroundLocation';
	import { getAppVersionLabel } from '$lib/utils/nativeInit';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PasswordPromptDialog from '$lib/components/PasswordPromptDialog.svelte';
	import BackupPasswordFormDialog, {
		type BackupPasswordFormMode,
		type BackupPasswordFormResult
	} from '$lib/components/BackupPasswordFormDialog.svelte';
	import {
		backupPasswordSettingsState,
		changeBackupPassword,
		getBackupPasswordForExport,
		getBackupPasswordHint,
		initBackupPasswordSettings,
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
	import {
		archiveFilename,
		ArchiveError,
		buildArchive,
		clearPendingIncomingBackup,
		consumePendingIncomingBackup,
		deliverArchive,
		incomingBackupState,
		isLegacyJsonBackupFile,
		isPasswordProtectedBlob,
		isZipArchiveFile,
		parseArchive,
		parseLegacyBackup,
		readPendingBackupBlob,
		type ArchiveDeliveryMode,
		type ArchiveDeliveryResult,
		type RebuiltArchive,
		type YamadoriLegacyBackup
	} from '$lib/utils/archive';
	import { hapticSuccess } from '$lib/utils/haptics';
	import { onMount } from 'svelte';
	import pkg from '../../../package.json';
	import {
		clearTileCache,
		formatTileCacheSize,
		getTileCacheStats
	} from '$lib/utils/map/tileCache';
	import { clearWeatherCache, getWeatherCacheStats } from '$lib/utils/weatherCache';
	import { clearCadastreCache, getCadastreCacheStats } from '$lib/utils/cadastre';
	import { resetOnboarding } from '$lib/utils/onboarding';
	import { markBackupExported } from '$lib/utils/backupReminder.svelte';
	import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
	import { stopWatchingPosition, userPositionState } from '$lib/utils/userPosition.svelte';
	import { LOCALE_OPTIONS } from '$lib/utils/i18n/locale';
	import { getIntlLocale } from '$lib/utils/i18n/locale';
	import * as m from '$lib/paraglide/messages.js';

	let feedback = $state<{ type: 'ok' | 'error'; message: string } | null>(null);
	let backupFeedback = $state<{ type: 'ok' | 'error' | 'info'; message: string } | null>(null);
	let backupFeedbackTimeout: ReturnType<typeof setTimeout> | undefined;
	let appVersion = $state<string | null>(null);
	let tileCacheCount = $state<number | null>(null);
	let tileCacheBytes = $state<number | null>(null);
	let weatherCacheCount = $state<number | null>(null);
	let cadastreCacheCount = $state<number | null>(null);
	let clearingCache = $state(false);
	let clearingWeatherCache = $state(false);
	let clearingCadastreCache = $state(false);
	let backingUp = $state(false);
	let restoring = $state(false);
	let showLegacyJsonInput = $state(false);
	let showReplaceBackupDialog = $state(false);
	let pendingArchive = $state<RebuiltArchive | null>(null);
	let pendingLegacyBackup = $state<YamadoriLegacyBackup | null>(null);
	let importMode = $state<'merge' | 'replace'>('merge');
	let showPasswordFormDialog = $state(false);
	let passwordFormMode = $state<BackupPasswordFormMode>('setup');
	let passwordFormError = $state<string | null>(null);
	let showPasswordResetDialog = $state(false);
	let showPasswordImportDialog = $state(false);
	let passwordImportError = $state<string | null>(null);
	let pendingPasswordBlob = $state<Blob | null>(null);
	let pendingPasswordImportMode = $state<'merge' | 'replace'>('merge');
	let backupInput: HTMLInputElement | undefined = $state();
	let legacyBackupInput: HTMLInputElement | undefined = $state();

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

	$effect(() => {
		void initLocationSettings();
		void initAppearanceSettings();
		void initBackupPasswordSettings();
		void refreshTileCacheStats();
		void refreshWeatherCacheStats();
		void refreshCadastreCacheStats();

		if (isNativeApp()) {
			void getAppVersionLabel().then((version) => {
				appVersion = version;
			});
		}
	});

	async function handleBackgroundTrackingChange(enabled: boolean) {
		feedback = null;
		await setBackgroundTrackingEnabled(enabled);
		stopWatchingPosition();
		if (enabled) {
			feedback = { type: 'ok', message: m.settings_bg_enabled() };
		} else {
			feedback = { type: 'ok', message: m.settings_bg_disabled() };
		}
	}

	async function handleOpenLocationSettings() {
		await openBackgroundLocationSettings();
	}

	async function handleResetOnboarding() {
		await resetOnboarding();
		feedback = { type: 'ok', message: m.settings_onboarding_reset() };
	}

	async function handleLocaleChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		await setAppLocale(value as (typeof LOCALE_OPTIONS)[number]['value']);
	}

	function archiveAppVersion(): string {
		return appVersion ?? pkg.version;
	}

	function showBackupFeedback(
		type: 'ok' | 'error' | 'info',
		message: string,
		options: { haptic?: boolean } = {}
	): void {
		if (backupFeedbackTimeout) {
			clearTimeout(backupFeedbackTimeout);
			backupFeedbackTimeout = undefined;
		}

		backupFeedback = { type, message };
		if (type === 'ok' && options.haptic !== false) {
			void hapticSuccess();
		}

		if (type === 'ok' || type === 'error') {
			backupFeedbackTimeout = setTimeout(() => {
				backupFeedback = null;
				backupFeedbackTimeout = undefined;
			}, type === 'ok' ? 4000 : 6000);
		}
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
				showBackupFeedback('ok', m.settings_backup_password_setup_ok());
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
				showBackupFeedback('ok', m.settings_backup_password_change_ok());
				return;
			}

			const ok = await removeBackupPassword(result.oldPassword);
			if (!ok) {
				passwordFormError = m.settings_backup_password_wrong();
				return;
			}
			showPasswordFormDialog = false;
			showBackupFeedback('ok', m.settings_backup_password_remove_ok());
		} catch (error) {
			passwordFormError =
				error instanceof Error ? error.message : m.settings_backup_failed();
		}
	}

	async function handlePasswordResetConfirm() {
		await resetBackupPasswordConfig();
		showPasswordResetDialog = false;
		showBackupFeedback('ok', m.settings_backup_password_reset_ok());
	}

	async function handleExportBackup(mode: ArchiveDeliveryMode) {
		if (!treeStore.loaded) {
			feedback = { type: 'error', message: m.settings_loading_wait() };
			return;
		}

		backingUp = true;
		backupFeedback = null;
		try {
			let exportPassword: string | undefined;
			if (backupPasswordSettingsState.configured) {
				const stored = await getBackupPasswordForExport();
				if (!stored) {
					showBackupFeedback('error', m.settings_backup_password_unavailable(), {
						haptic: false
					});
					return;
				}
				exportPassword = stored;
			}

			const filename = archiveFilename();
			const blob = await buildArchive(
				{
					trees: treeStore.trees,
					parking: parkingStore.position,
					appearanceSettings: {
						outdoorMode: appearanceSettingsState.outdoorMode,
						darkMode: appearanceSettingsState.darkMode,
						simpleMode: appearanceSettingsState.simpleMode,
						locale: appearanceSettingsState.locale
					},
					locationSettings: {
						backgroundTrackingEnabled: locationSettingsState.backgroundTrackingEnabled
					},
					appVersion: archiveAppVersion()
				},
				{ password: exportPassword }
			);
			const result = await deliverArchive(blob, filename, mode);
			showBackupFeedback('ok', formatExportSuccessMessage(result));
			await markBackupExported(treeStore.trees, parkingStore.position);
		} catch (error) {
			showBackupFeedback(
				'error',
				error instanceof Error ? error.message : m.settings_backup_failed(),
				{ haptic: false }
			);
		} finally {
			backingUp = false;
		}
	}

	function openBackupImport(mode: 'merge' | 'replace') {
		importMode = mode;
		backupInput?.click();
	}

	function openLegacyBackupImport(mode: 'merge' | 'replace') {
		importMode = mode;
		legacyBackupInput?.click();
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
		await restoreAppearanceSettings(data.appearanceSettings);
		await restoreLocationSettings(data.locationSettings);
		await reloadLocalData();
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
		const needsPassword = await isPasswordProtectedBlob(blob);
		if (needsPassword && !password) {
			const stored = await getBackupPasswordForExport();
			if (stored) {
				try {
					await importBackupFromBlob(blob, mode, stored);
					return;
				} catch (error) {
					if (
						!(error instanceof ArchiveError && error.code === 'ARCHIVE_WRONG_PASSWORD')
					) {
						throw error;
					}
				}
			}

			pendingPasswordBlob = blob;
			pendingPasswordImportMode = mode;
			passwordImportError = null;
			showPasswordImportDialog = true;
			return;
		}

		restoring = true;
		backupFeedback = null;
		try {
			const archive = await parseArchive(blob, password ? { password } : undefined);
			showPasswordImportDialog = false;
			pendingPasswordBlob = null;
			passwordImportError = null;
			if (mode === 'replace') {
				pendingArchive = archive;
				pendingLegacyBackup = null;
				showReplaceBackupDialog = true;
				showBackupFeedback('info', formatImportConfirmMessage(archive.preview.treeCount), {
					haptic: false
				});
				return;
			}
			const treeCount = await applyArchiveData(archive, 'merge');
			showBackupFeedback('ok', formatImportSuccessMessage(treeCount, 'merge'));
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
			showBackupFeedback('error', message, { haptic: false });
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
			showBackupFeedback('error', m.settings_backup_not_found(), { haptic: false });
			clearPendingIncomingBackup();
			return;
		}

		importMode = mode;
		await importBackupFromBlob(pending.blob, mode);
		if (mode === 'merge') {
			clearPendingIncomingBackup();
		}
	}

	function dismissIncomingBackup(): void {
		clearPendingIncomingBackup();
		backupFeedback = null;
	}

	onMount(() => {
		if (!isAndroidApp()) {
			return;
		}

		void consumePendingIncomingBackup();
	});

	async function handleBackupFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		if (isLegacyJsonBackupFile(file) && !isZipArchiveFile(file)) {
			restoring = true;
			backupFeedback = null;
			try {
				const legacy = parseLegacyBackup(await file.text());
				if (importMode === 'replace') {
					pendingLegacyBackup = legacy;
					pendingArchive = null;
					showReplaceBackupDialog = true;
					showBackupFeedback('info', formatImportConfirmMessage(legacy.trees.length), {
						haptic: false
					});
					return;
				}
				const treeCount = await applyLegacyBackup(legacy, 'merge');
				showBackupFeedback('ok', formatImportSuccessMessage(treeCount, 'merge'));
			} catch (error) {
				showBackupFeedback(
					'error',
					error instanceof Error ? error.message : m.settings_restore_failed(),
					{ haptic: false }
				);
			} finally {
				restoring = false;
			}
			return;
		}

		await importBackupFromBlob(file, importMode);
	}

	async function handleLegacyBackupFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		restoring = true;
		backupFeedback = null;
		try {
			const legacy = parseLegacyBackup(await file.text());
			if (importMode === 'replace') {
				pendingLegacyBackup = legacy;
				pendingArchive = null;
				showReplaceBackupDialog = true;
				return;
			}
			const treeCount = await applyLegacyBackup(legacy, 'merge');
			showBackupFeedback('ok', formatImportSuccessMessage(treeCount, 'merge'));
		} catch (error) {
			showBackupFeedback(
				'error',
				error instanceof Error ? error.message : m.settings_restore_failed(),
				{ haptic: false }
			);
		} finally {
			restoring = false;
		}
	}

	async function handleReplaceBackup() {
		restoring = true;
		backupFeedback = null;
		try {
			if (pendingArchive) {
				const treeCount = await applyArchiveData(pendingArchive, 'replace');
				showBackupFeedback('ok', formatImportSuccessMessage(treeCount, 'replace'));
			} else if (pendingLegacyBackup) {
				const treeCount = await applyLegacyBackup(pendingLegacyBackup, 'replace');
				showBackupFeedback('ok', formatImportSuccessMessage(treeCount, 'replace'));
			}
		} catch (error) {
			showBackupFeedback(
				'error',
				error instanceof Error ? error.message : m.settings_restore_failed(),
				{ haptic: false }
			);
		} finally {
			restoring = false;
			clearPendingBackup();
			clearPendingIncomingBackup();
		}
	}

	async function handleClearWeatherCache() {
		clearingWeatherCache = true;
		feedback = null;
		try {
			await clearWeatherCache();
			await refreshWeatherCacheStats();
			feedback = { type: 'ok', message: m.settings_weather_cache_cleared() };
		} catch (error) {
			feedback = {
				type: 'error',
				message:
					error instanceof Error ? error.message : m.settings_weather_cache_clear_failed()
			};
		} finally {
			clearingWeatherCache = false;
		}
	}

	async function handleClearTileCache() {
		clearingCache = true;
		feedback = null;
		try {
			await clearTileCache();
			await refreshTileCacheStats();
			feedback = { type: 'ok', message: m.settings_map_cache_cleared() };
		} catch (error) {
			feedback = {
				type: 'error',
				message: error instanceof Error ? error.message : m.settings_map_cache_clear_failed()
			};
		} finally {
			clearingCache = false;
		}
	}

	async function handleClearCadastreCache() {
		clearingCadastreCache = true;
		feedback = null;
		try {
			await clearCadastreCache();
			await refreshCadastreCacheStats();
			feedback = { type: 'ok', message: m.settings_cadastre_cache_cleared() };
		} catch (error) {
			feedback = {
				type: 'error',
				message:
					error instanceof Error ? error.message : m.settings_cadastre_cache_clear_failed()
			};
		} finally {
			clearingCadastreCache = false;
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-lg font-semibold text-forest-900">{m.settings_display()}</h2>
		<p class="mt-1 text-sm text-muted">{m.settings_display_hint()}</p>
	</div>

	<label class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
		<input
			type="checkbox"
			class="mt-1 h-4 w-4 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
			checked={appearanceSettingsState.outdoorMode}
			onchange={(event) => void setOutdoorMode(event.currentTarget.checked)}
		/>
		<span class="text-sm">
			<span class="font-medium text-forest-900">{m.settings_outdoor_mode()}</span>
			<span class="mt-0.5 block text-muted">
				{m.settings_outdoor_hint()}
				{#if isNativeApp()}
					{m.settings_outdoor_android_brightness()}
				{/if}
			</span>
		</span>
	</label>

	<label class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
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

	<div class="flex flex-col gap-2">
		<label for="app-locale" class="text-sm font-medium text-forest-900">{m.settings_language()}</label>
		<select
			id="app-locale"
			class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-forest-900"
			value={appearanceSettingsState.locale}
			onchange={(event) => void handleLocaleChange(event)}
		>
			{#each LOCALE_OPTIONS as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>

	{#if isNativeApp()}
		<div>
			<h2 class="text-lg font-semibold text-forest-900">{m.settings_android_app()}</h2>
			<p class="mt-1 text-sm text-muted">
				{#if appVersion}
					{appVersion}
				{:else}
					{m.settings_version_loading()}
				{/if}
				{#if tileCacheCount !== null}
					· {m.settings_offline_tiles({ count: tileCacheCount.toLocaleString(intlLocale) })}
				{/if}
			</p>
		</div>
	{/if}

	<div>
		<h2 class="text-lg font-semibold text-forest-900">{m.settings_offline_map()}</h2>
		<p class="mt-1 text-sm text-muted">{m.settings_offline_map_hint()}</p>
		<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
			<li>{m.settings_offline_tip_1()}</li>
			<li>{m.settings_offline_tip_2()}</li>
			<li>{m.settings_offline_tip_3()}</li>
		</ul>
		{#if tileCacheCount !== null}
			<p class="mt-3 text-sm font-medium text-forest-800">
				{m.settings_tiles_count({ count: tileCacheCount.toLocaleString(intlLocale) })}
				{#if tileCacheBytes !== null}
					· {formatTileCacheSize(tileCacheBytes)}
				{/if}
			</p>
		{/if}
		{#if isNativeApp() && tileCacheCount !== null && tileCacheCount > 0}
			<button
				type="button"
				onclick={() => void handleClearTileCache()}
				disabled={clearingCache}
				class="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
			>
				{clearingCache ? m.action_clearing() : m.settings_clear_map_cache()}
			</button>
		{/if}
	</div>

	<div>
		<h2 class="text-lg font-semibold text-forest-900">{m.settings_weather_offline()}</h2>
		<p class="mt-1 text-sm text-muted">{m.settings_weather_offline_hint()}</p>
		{#if weatherCacheCount !== null}
			<p class="mt-3 text-sm font-medium text-forest-800">
				{weatherCacheCount.toLocaleString(intlLocale)}
				{weatherCacheCount === 1
					? m.settings_forecast_cached_one()
					: m.settings_forecast_cached_many()}
			</p>
		{/if}
		{#if weatherCacheCount !== null && weatherCacheCount > 0}
			<button
				type="button"
				onclick={() => void handleClearWeatherCache()}
				disabled={clearingWeatherCache}
				class="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
			>
				{clearingWeatherCache ? m.action_clearing() : m.settings_clear_weather_cache()}
			</button>
		{/if}
	</div>

	<div>
		<h2 class="text-lg font-semibold text-forest-900">{m.settings_cadastre_offline()}</h2>
		<p class="mt-1 text-sm text-muted">{m.settings_cadastre_offline_hint()}</p>
		{#if cadastreCacheCount !== null}
			<p class="mt-3 text-sm font-medium text-forest-800">
				{cadastreCacheCount.toLocaleString(intlLocale)}
				{cadastreCacheCount === 1
					? m.settings_cadastre_cached_one()
					: m.settings_cadastre_cached_many()}
			</p>
		{/if}
		{#if cadastreCacheCount !== null && cadastreCacheCount > 0}
			<button
				type="button"
				onclick={() => void handleClearCadastreCache()}
				disabled={clearingCadastreCache}
				class="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
			>
				{clearingCadastreCache ? m.action_clearing() : m.settings_clear_cadastre_cache()}
			</button>
		{/if}
	</div>

	<div>
		<h2 class="text-lg font-semibold text-forest-900">{m.settings_backup()}</h2>
		<p class="mt-1 text-sm text-muted">
			{m.settings_backup_hint(treePluralArgs(treeStore.trees.length))}
		</p>
		<div class="mt-3 flex flex-col gap-3">
			{#if isAndroidApp() && incomingBackupState.pending}
				<div class="rounded-xl border border-forest-200 bg-forest-50 px-4 py-3">
					<p class="text-sm font-medium text-forest-900">{m.settings_backup_received()}</p>
					<p class="mt-1 text-sm text-forest-800">
						{m.settings_backup_received_hint({ name: incomingBackupState.pending.displayName })}
					</p>
					<div class="mt-3 flex flex-col gap-2 sm:flex-row">
						<button
							type="button"
							onclick={() => void handleIncomingImport('merge')}
							disabled={restoring}
							class="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-forest-800 disabled:opacity-50"
						>
							{m.action_merge()}
						</button>
						<button
							type="button"
							onclick={() => void handleIncomingImport('replace')}
							disabled={restoring}
							class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 disabled:opacity-50"
						>
							{m.settings_replace_all()}
						</button>
						<button
							type="button"
							onclick={dismissIncomingBackup}
							disabled={restoring}
							class="rounded-xl px-4 py-2.5 text-sm font-medium text-muted disabled:opacity-50"
						>
							{m.action_ignore()}
						</button>
					</div>
				</div>
			{/if}
			<div class="rounded-xl border border-gray-200 bg-white px-4 py-3">
				{#if backupPasswordSettingsState.configured}
					<p class="text-sm font-medium text-forest-900">
						{m.settings_backup_password_configured()}
					</p>
					<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						<button
							type="button"
							onclick={() => openPasswordForm('change')}
							class="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-forest-800"
						>
							{m.settings_backup_password_change()}
						</button>
						<button
							type="button"
							onclick={() => openPasswordForm('remove')}
							class="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-forest-800"
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
								<span class="font-semibold text-forest-900"
									>{backupPasswordSettingsState.hint}</span
								>
							</p>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-muted">{m.settings_backup_password_hint_help()}</p>
					<button
						type="button"
						onclick={() => openPasswordForm('setup')}
						class="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-forest-800"
					>
						{m.settings_backup_password_setup()}
					</button>
				{/if}
			</div>
			<button
				type="button"
				onclick={() => void handleExportBackup('share')}
				disabled={backingUp || !treeStore.loaded}
				class="rounded-xl bg-forest-800 px-4 py-3 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
			>
				{backingUp ? m.action_exporting() : m.action_export()}
			</button>
			<button
				type="button"
				onclick={() => void handleExportBackup('local')}
				disabled={backingUp || !treeStore.loaded}
				class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
			>
				{backingUp
					? m.action_saving()
					: isAndroidApp()
						? m.settings_save_downloads()
						: m.settings_download_backup()}
			</button>
			<button
				type="button"
				onclick={() => openBackupImport('merge')}
				disabled={restoring}
				class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
			>
				{restoring ? m.action_importing() : m.action_import()}
			</button>
			<button
				type="button"
				onclick={() => openBackupImport('replace')}
				disabled={restoring}
				class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 transition active:scale-[0.98] disabled:opacity-50"
			>
				{m.settings_import_replace()}
			</button>
			<button
				type="button"
				onclick={() => {
					showLegacyJsonInput = !showLegacyJsonInput;
				}}
				class="text-left text-xs font-medium text-muted underline-offset-2 hover:underline"
			>
				{showLegacyJsonInput ? m.settings_hide_legacy_json() : m.settings_show_legacy_json()}
			</button>
			{#if showLegacyJsonInput}
				<div class="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
					<p class="text-xs text-muted">{m.settings_legacy_json_hint()}</p>
					<button
						type="button"
						onclick={() => openLegacyBackupImport('merge')}
						disabled={restoring}
						class="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-forest-800"
					>
						{m.settings_import_json_merge()}
					</button>
					<button
						type="button"
						onclick={() => openLegacyBackupImport('replace')}
						disabled={restoring}
						class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900"
					>
						{m.settings_import_json_replace()}
					</button>
				</div>
			{/if}
		</div>
		<input
			bind:this={backupInput}
			type="file"
			accept="application/zip,.zip,.yamadori.zip,application/json,.json"
			class="hidden"
			onchange={(event) => void handleBackupFileSelected(event)}
		/>
		<input
			bind:this={legacyBackupInput}
			type="file"
			accept="application/json,.json"
			class="hidden"
			onchange={(event) => void handleLegacyBackupFileSelected(event)}
		/>
	</div>

	{#if isNativeApp() && isAndroidApp()}
		<div>
			<h2 class="text-lg font-semibold text-forest-900">{m.settings_gps_android()}</h2>
			<p class="mt-1 text-sm text-muted">{m.settings_gps_android_hint()}</p>
			<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
				<li>{m.settings_gps_tip_precise()}</li>
				<li>{m.settings_gps_tip_offline()}</li>
				<li>{m.settings_gps_tip_still()}</li>
			</ul>
			<p class="mt-3 text-sm text-muted">{m.location_bg_message()}</p>
		</div>

		<label class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
			<input
				type="checkbox"
				checked={locationSettingsState.backgroundTrackingEnabled}
				onchange={(event) =>
					void handleBackgroundTrackingChange((event.currentTarget as HTMLInputElement).checked)}
				class="h-4 w-4 rounded"
			/>
			<span class="text-sm text-forest-900">{m.settings_bg_tracking()}</span>
		</label>

		<p class="-mt-4 text-xs text-muted">{m.settings_bg_tracking_hint()}</p>

		<button
			type="button"
			onclick={handleOpenLocationSettings}
			class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98]"
		>
			{m.settings_open_location()}
		</button>

		<button
			type="button"
			onclick={() => void handleResetOnboarding()}
			class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98]"
		>
			{m.settings_reset_onboarding()}
		</button>

		{#if userPositionState.error}
			<p class="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
				{userPositionState.error}
			</p>
		{/if}
	{/if}

	<a href="{base}/" class="text-center text-sm font-medium text-forest-800">{m.layout_back()}</a>
</div>

{#if backupFeedback}
	<p
		class="bottom-safe-toast fixed left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-medium shadow-lg {backupFeedback.type ===
		'ok'
			? 'bg-green-800 text-white'
			: backupFeedback.type === 'info'
				? 'bg-amber-600 text-white'
				: 'bg-red-800 text-white'}"
		role="status"
		aria-live="polite"
	>
		{backupFeedback.message}
	</p>
{/if}

<ConfirmDialog
	bind:open={showReplaceBackupDialog}
	title={m.settings_replace_title()}
	message={m.settings_replace_message()}
	confirmLabel={m.action_replace()}
	onconfirm={() => void handleReplaceBackup()}
	oncancel={() => {
		clearPendingBackup();
		clearPendingIncomingBackup();
	}}
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
