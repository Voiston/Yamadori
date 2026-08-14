<script lang="ts">
	import OnboardingStepPanel from '$lib/components/OnboardingStepPanel.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import BackupPasswordFormDialog, {
		type BackupPasswordFormResult
	} from '$lib/components/BackupPasswordFormDialog.svelte';
	import {
		backupPasswordSettingsState,
		initBackupPasswordSettings,
		setupBackupPassword
	} from '$lib/stores/backupPasswordSettings.svelte';
	import type { ArchiveDeliveryMode, ArchiveDeliveryResult } from '$lib/utils/archive/delivery';
	import { exportAppBackup } from '$lib/utils/backupExport';
	import * as m from '$lib/paraglide/messages.js';
	import { isAndroidApp } from '$lib/utils/platform';
	import { portal, BODY_PORTAL_TARGET, ONBOARDING_PANEL_CLASS } from '$lib/utils/portal';
	import { sheetBackdrop, sheetPanel } from '$lib/utils/motion';
	import { onMount, tick } from 'svelte';

	let {
		captureSavedTree = false,
		onphasecomplete
	}: {
		captureSavedTree?: boolean;
		onphasecomplete: (options: { enableLocalEncryption: boolean }) => void;
	} = $props();

	type StepId = 'protection' | 'protection_setup';

	const stepIds: StepId[] = ['protection', 'protection_setup'];

	let stepIndex = $state(0);
	let enableLocalEncryption = $state(false);
	let working = $state(false);
	let feedback = $state('');
	let feedbackError = $state(false);
	let showPasswordFormDialog = $state(false);
	let passwordFormError = $state<string | null>(null);
	let exportPassword = $state<string | undefined>(undefined);
	let setupView = $state<'password' | 'export'>('password');
	let dismissed = $state(false);

	onMount(() => {
		void initBackupPasswordSettings();
	});

	let currentStepId = $derived(stepIds[stepIndex]!);

	let currentTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (currentStepId === 'protection_setup') {
			return m.onboarding_protection_setup_title();
		}
		return m.onboarding_protection_title();
	});

	let currentDescription = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (currentStepId === 'protection_setup') {
			return setupView === 'export'
				? m.onboarding_protection_setup_desc()
				: m.onboarding_protection_password_setup();
		}
		if (captureSavedTree) {
			return m.onboarding_protection_congrats_desc();
		}
		return m.onboarding_protection_desc();
	});

	function showFeedback(message: string, isError = false) {
		feedback = message;
		feedbackError = isError;
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

	async function dismissAndComplete() {
		dismissed = true;
		await tick();
		await tick();
		onphasecomplete({ enableLocalEncryption });
	}

	async function finishProtectionPhase() {
		working = true;
		try {
			await dismissAndComplete();
		} finally {
			working = false;
		}
	}

	function startProtectNow() {
		enableLocalEncryption = true;
		stepIndex = 1;
		setupView = 'password';
		feedback = '';
		showPasswordFormDialog = true;
	}

	function chooseLater() {
		enableLocalEncryption = false;
		void finishProtectionPhase();
	}

	async function handleExportBackup(mode: ArchiveDeliveryMode) {
		working = true;
		feedback = '';
		feedbackError = false;
		try {
			const { delivery } = await exportAppBackup(mode, {
				password: exportPassword
			});
			showFeedback(formatExportSuccessMessage(delivery));
			await dismissAndComplete();
		} catch (error) {
			showFeedback(
				error instanceof Error ? error.message : m.onboarding_protection_export_failed(),
				true
			);
		} finally {
			working = false;
		}
	}

	async function handlePasswordFormConfirm(result: BackupPasswordFormResult) {
		if (result.mode !== 'setup') {
			return;
		}
		passwordFormError = null;
		try {
			await setupBackupPassword(result.password, result.hint);
			exportPassword = result.password;
			showPasswordFormDialog = false;
			showFeedback(m.onboarding_protection_password_configured());
			setupView = 'export';
		} catch (error) {
			passwordFormError =
				error instanceof Error ? error.message : m.settings_backup_password_too_short();
		}
	}
</script>

{#if !dismissed}
	<div
		use:portal={BODY_PORTAL_TARGET}
		data-yamadori-onboarding-overlay
		class="fixed inset-0 z-50 flex items-end pb-onboarding-sheet pt-safe sm:items-center sm:justify-center sm:px-4"
		role="presentation"
	>
		<div class="absolute inset-0 bg-black/50" transition:sheetBackdrop role="presentation"></div>
		<div
			class="relative z-10 w-full"
			transition:sheetPanel
			role="dialog"
			aria-modal="true"
			aria-labelledby="onboarding-protection-title"
		>
			<OnboardingStepPanel
				progress={m.onboarding_step({
					current: stepIndex + 1,
					total: stepIds.length
				})}
				title={currentTitle}
				titleId="onboarding-protection-title"
				description={currentDescription}
				panelClass="{ONBOARDING_PANEL_CLASS} w-full"
			>
				{#snippet middle()}
					{#if feedback}
						<p
							class="rounded-xl px-3 py-2 text-sm {feedbackError
								? 'bg-red-50 text-red-800'
								: 'bg-green-50 text-green-800'}"
							role="status"
						>
							{feedback}
						</p>
					{/if}
				{/snippet}

				{#snippet actions()}
					{#if currentStepId === 'protection'}
						<button
							type="button"
							onclick={startProtectNow}
							disabled={working}
							class="btn-primary"
						>
							{m.onboarding_protection_now()}
						</button>
						<button
							type="button"
							onclick={chooseLater}
							disabled={working}
							class="rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium text-muted transition active:scale-[0.98] disabled:opacity-50"
						>
							{m.onboarding_protection_later()}
						</button>
					{:else if setupView === 'password'}
						<button
							type="button"
							onclick={() => {
								showPasswordFormDialog = true;
							}}
							disabled={working}
							class="btn-primary"
						>
							{m.onboarding_protection_password_setup()}
						</button>
						<button
							type="button"
							onclick={chooseLater}
							disabled={working}
							class="rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium text-muted transition active:scale-[0.98] disabled:opacity-50"
						>
							{m.onboarding_protection_later()}
						</button>
					{:else}
						<button
							type="button"
							onclick={() => void handleExportBackup('share')}
							disabled={working}
							class="btn-primary"
						>
							{working ? m.climate_loading() : m.action_export()}
						</button>
						<button
							type="button"
							onclick={() => void handleExportBackup('local')}
							disabled={working}
							class="btn-secondary"
						>
							{working
								? m.action_saving()
								: isAndroidApp()
									? m.settings_save_downloads()
									: m.settings_download_backup()}
						</button>
						<button
							type="button"
							onclick={() => void finishProtectionPhase()}
							disabled={working}
							class="rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium text-muted transition active:scale-[0.98] disabled:opacity-50"
						>
							{m.onboarding_protection_export_later()}
						</button>
					{/if}
				{/snippet}
			</OnboardingStepPanel>
		</div>
	</div>
{/if}

<BackupPasswordFormDialog
	bind:open={showPasswordFormDialog}
	trapFocus={false}
	mode="setup"
	initialHint={backupPasswordSettingsState.hint ?? ''}
	bind:error={passwordFormError}
	onconfirm={(result) => void handlePasswordFormConfirm(result)}
	oncancel={() => {
		showPasswordFormDialog = false;
	}}
/>
