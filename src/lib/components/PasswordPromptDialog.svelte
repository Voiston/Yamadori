<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { portal } from '$lib/utils/portal';
	import PasswordInput from '$lib/components/PasswordInput.svelte';

	let {
		open = $bindable(false),
		title,
		message,
		error = $bindable(null as string | null),
		hint = null as string | null,
		onconfirm,
		oncancel
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		error?: string | null;
		hint?: string | null;
		onconfirm?: (password: string) => void;
		oncancel?: () => void;
	} = $props();

	let password = $state('');

	let resolvedTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return title ?? m.archive_password_required();
	});

	let resolvedMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		return message ?? m.archive_password_required();
	});

	$effect(() => {
		if (open) {
			password = '';
			error = null;
		}
	});

	function close() {
		open = false;
		password = '';
		error = null;
		oncancel?.();
	}

	function handleConfirm() {
		if (!password.trim()) return;
		onconfirm?.(password);
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
			class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="password-dialog-title"
			aria-describedby="password-dialog-message"
		>
			<h2 id="password-dialog-title" class="text-lg font-semibold text-forest-900">
				{resolvedTitle}
			</h2>
			<p id="password-dialog-message" class="mt-2 text-base text-muted">{resolvedMessage}</p>

			<form class="mt-4" onsubmit={handleSubmit}>
				<PasswordInput
					id="backup-password"
					label={m.settings_backup_password_label()}
					autocomplete="current-password"
					bind:value={password}
					inputClass="text-base"
				/>
				{#if hint}
					<p class="mt-2 text-sm text-muted">{m.settings_backup_password_hint_display({ hint })}</p>
				{/if}
				{#if error}
					<p class="mt-2 text-sm text-red-600" role="alert">{error}</p>
				{/if}

				<div class="mt-6 flex gap-3">
					<button
						type="button"
						onclick={close}
						class="flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-200 text-base font-medium text-forest-900 transition active:scale-[0.98]"
					>
						{m.action_cancel()}
					</button>
					<button
						type="submit"
						disabled={!password.trim()}
						class="flex h-12 flex-1 items-center justify-center rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
					>
						{m.action_confirm()}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
