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
	import { portal, BODY_PORTAL_TARGET, ONBOARDING_OVERLAY_CLASS, ONBOARDING_PANEL_CLASS } from '$lib/utils/portal';
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
	let enableLocalEncryption = $state(true);
	let working = $state(false);
	let feedback = $state('');
	let feedbackError = $state(false);
	let showPasswordFormDialog = $state(false);
	let passwordFormError = $state<string | null>(null);
	let exportPassword = $state<string | undefined>(undefined);
	let setupView = $state<'choices' | 'export'>('choices');
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
			return m.onboarding_protection_setup_desc();
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

	async function handleExportBackup(mode: ArchiveDeliveryMode) {
		working = true;
		feedback = '';
		feedbackError = false;
		try {
			const result = await exportAppBackup(mode, { password: exportPassword });
			showFeedback(formatExportSuccessMessage(result));
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

	function advanceToSetup() {
		stepIndex = 1;
		setupView = 'choices';
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
	class={ONBOARDING_OVERLAY_CLASS}
	role="dialog"
	aria-modal="true"
	aria-labelledby="onboarding-protection-title"
>
	<OnboardingStepPanel
		progress={m.onboarding_step({ current: stepIndex + 1, total: stepIds.length })}
		title={currentTitle}
		titleId="onboarding-protection-title"
		description={currentDescription}
		panelClass="{ONBOARDING_PANEL_CLASS} w-full"
	>
		{#snippet middle()}
			{#if currentStepId === 'protection'}
				<label class="flex items-start gap-3 rounded-xl border border-gray-200 bg-forest-50 px-3 py-3">
					<input
						type="checkbox"
						bind:checked={enableLocalEncryption}
						disabled={working}
						class="mt-0.5 h-4 w-4 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
					/>
					<span class="text-sm text-forest-900">
						<span class="font-medium">{m.onboarding_protection_encryption_label()}</span>
						<span class="mt-1 block text-muted">{m.onboarding_protection_encryption_hint()}</span>
					</span>
				</label>
			{/if}

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
					onclick={advanceToSetup}
					disabled={working}
					class="rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
				>
					{m.onboarding_continue()}
				</button>
			{:else if setupView === 'choices'}
				<button
					type="button"
					onclick={() => {
						showPasswordFormDialog = true;
					}}
					disabled={working}
					class="rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
				>
					{m.onboarding_protection_password_setup()}
				</button>
				<button
					type="button"
					onclick={() => {
						setupView = 'export';
					}}
					disabled={working}
					class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
				>
					{m.onboarding_protection_password_skip()}
				</button>
			{:else}
				<button
					type="button"
					onclick={() => void handleExportBackup('share')}
					disabled={working}
					class="rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
				>
					{working ? m.climate_loading() : m.action_export()}
				</button>
				<button
					type="button"
					onclick={() => void handleExportBackup('local')}
					disabled={working}
					class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
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
					class="rounded-xl px-4 py-2 text-sm font-medium text-muted transition active:scale-[0.98] disabled:opacity-50"
				>
					{m.onboarding_protection_export_later()}
				</button>
			{/if}
		{/snippet}
	</OnboardingStepPanel>
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
