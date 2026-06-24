<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import { MAX_BACKUP_PASSWORD_HINT_LENGTH } from '$lib/stores/backupPasswordSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { portal } from '$lib/utils/portal';

	export type BackupPasswordFormMode = 'setup' | 'change' | 'remove';

	export type BackupPasswordFormResult =
		| { mode: 'setup'; password: string; hint?: string }
		| { mode: 'change'; oldPassword: string; newPassword: string; hint?: string }
		| { mode: 'remove'; oldPassword: string };

	let {
		open = $bindable(false),
		mode = $bindable('setup' as BackupPasswordFormMode),
		initialHint = '',
		error = $bindable(null as string | null),
		onconfirm,
		oncancel
	}: {
		open?: boolean;
		mode?: BackupPasswordFormMode;
		initialHint?: string;
		error?: string | null;
		onconfirm?: (result: BackupPasswordFormResult) => void;
		oncancel?: () => void;
	} = $props();

	let oldPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let hint = $state('');

	let title = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (mode === 'change') return m.settings_backup_password_change();
		if (mode === 'remove') return m.settings_backup_password_remove();
		return m.settings_backup_password_setup();
	});

	$effect(() => {
		if (open) {
			oldPassword = '';
			newPassword = '';
			confirmPassword = '';
			hint = initialHint;
			error = null;
		}
	});

	function close() {
		open = false;
		oldPassword = '';
		newPassword = '';
		confirmPassword = '';
		hint = '';
		error = null;
		oncancel?.();
	}

	function validate(): string | null {
		if (mode === 'remove') {
			if (!oldPassword.trim()) return m.settings_backup_password_wrong();
			return null;
		}

		if (mode === 'change' && !oldPassword.trim()) {
			return m.settings_backup_password_wrong();
		}

		const password = mode === 'setup' ? newPassword : newPassword;
		if (password.length < 8) return m.settings_backup_password_too_short();
		if (password !== confirmPassword) return m.settings_backup_password_mismatch();
		return null;
	}

	function handleConfirm() {
		const validationError = validate();
		if (validationError) {
			error = validationError;
			return;
		}

		const trimmedHint = hint.trim().slice(0, MAX_BACKUP_PASSWORD_HINT_LENGTH) || undefined;

		if (mode === 'setup') {
			onconfirm?.({ mode: 'setup', password: newPassword, hint: trimmedHint });
			return;
		}

		if (mode === 'change') {
			onconfirm?.({
				mode: 'change',
				oldPassword,
				newPassword,
				hint: trimmedHint
			});
			return;
		}

		onconfirm?.({ mode: 'remove', oldPassword });
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		handleConfirm();
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[100] flex items-end justify-center bg-forest-900/40 p-4 sm:items-center"
		role="presentation"
		onclick={handleBackdropClick}
	>
		<div
			class="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="backup-password-form-title"
		>
			<h2 id="backup-password-form-title" class="text-lg font-semibold text-forest-900">
				{title}
			</h2>

			<form class="mt-4 space-y-3" onsubmit={handleSubmit}>
				{#if mode === 'change' || mode === 'remove'}
					{#if initialHint}
						<p class="text-sm text-muted">
							{m.settings_backup_password_hint_display({ hint: initialHint })}
						</p>
					{/if}
					<PasswordInput
						label={m.settings_backup_password_old()}
						autocomplete="current-password"
						bind:value={oldPassword}
					/>
				{/if}

				{#if mode === 'setup' || mode === 'change'}
					<p class="text-xs text-muted">{m.settings_backup_password_hint()}</p>
					<PasswordInput
						label={mode === 'change'
							? m.settings_backup_password_new()
							: m.settings_backup_password_label()}
						autocomplete="new-password"
						bind:value={newPassword}
					/>
					<PasswordInput
						label={m.settings_backup_password_confirm()}
						autocomplete="new-password"
						bind:value={confirmPassword}
					/>
					<label class="block">
						<span class="text-sm font-medium text-forest-800"
							>{m.settings_backup_password_hint_label()}</span
						>
						<input
							type="text"
							bind:value={hint}
							maxlength={MAX_BACKUP_PASSWORD_HINT_LENGTH}
							placeholder={m.settings_backup_password_hint_placeholder()}
							class="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-forest-900"
						/>
					</label>
					<p class="text-xs text-muted">{m.settings_backup_password_hint_help()}</p>
				{/if}

				{#if error}
					<p class="text-sm text-red-600" role="alert">{error}</p>
				{/if}

				<div class="flex gap-3 pt-2">
					<button
						type="button"
						onclick={close}
						class="flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-200 text-base font-medium text-forest-900 transition active:scale-[0.98]"
					>
						{m.action_cancel()}
					</button>
					<button
						type="submit"
						class="flex h-12 flex-1 items-center justify-center rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.98]"
					>
						{m.action_confirm()}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
