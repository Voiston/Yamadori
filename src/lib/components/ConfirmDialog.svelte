<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { portal, APP_SHELL_PORTAL_TARGET } from '$lib/utils/portal';
	import { modalFocus } from '$lib/utils/modalFocus';
	import { hapticSuccess, hapticWarning } from '$lib/utils/haptics';
	import { sheetBackdrop, sheetPanel } from '$lib/utils/motion';

	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel,
		cancelLabel,
		variant = 'danger',
		trapFocus = true,
		onconfirm,
		oncancel
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'danger' | 'default';
		trapFocus?: boolean;
		onconfirm?: () => void;
		oncancel?: () => void;
	} = $props();

	let resolvedTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return title ?? m.action_confirm();
	});

	let resolvedMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		return message ?? m.confirm_default_message();
	});

	let resolvedConfirmLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return confirmLabel ?? m.action_confirm();
	});

	let resolvedCancelLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return cancelLabel ?? m.action_cancel();
	});

	function close() {
		open = false;
		void hapticWarning();
		oncancel?.();
	}

	function handleConfirm() {
		if (variant === 'danger') {
			void hapticWarning();
		} else {
			void hapticSuccess();
		}
		onconfirm?.();
		open = false;
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
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<div
		use:portal={APP_SHELL_PORTAL_TARGET}
		data-yamadori-portal
		class="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
		role="presentation"
	>
		<div
			class="absolute inset-0 bg-forest-900/40"
			role="presentation"
			transition:sheetBackdrop
			onclick={handleBackdropClick}
		></div>
		<div
			class="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
			aria-describedby="dialog-message"
			transition:sheetPanel
			use:modalFocus={trapFocus}
		>
			<div class="sheet-grabber sm:hidden" aria-hidden="true"></div>
			<h2 id="dialog-title" class="text-lg font-semibold text-forest-900">{resolvedTitle}</h2>
			<p id="dialog-message" class="mt-2 text-base text-muted">{resolvedMessage}</p>

			<div class="mt-6 flex gap-3">
				<button type="button" onclick={close} class="btn-secondary flex-1">
					{resolvedCancelLabel}
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					class="flex-1 {variant === 'danger' ? 'btn-danger' : 'btn-primary'}"
				>
					{resolvedConfirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
