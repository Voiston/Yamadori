<script lang="ts">
	let {
		open = $bindable(false),
		title = 'Confirmer',
		message = 'Êtes-vous sûr ?',
		confirmLabel = 'Confirmer',
		onconfirm
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		onconfirm?: () => void;
	} = $props();

	function close() {
		open = false;
	}

	function handleConfirm() {
		onconfirm?.();
		close();
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
		class="fixed inset-0 z-[100] flex items-end justify-center bg-forest-900/40 p-4 sm:items-center"
		role="presentation"
		onclick={handleBackdropClick}
	>
		<div
			class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
			aria-describedby="dialog-message"
		>
			<h2 id="dialog-title" class="text-lg font-semibold text-forest-900">{title}</h2>
			<p id="dialog-message" class="mt-2 text-base text-muted">{message}</p>

			<div class="mt-6 flex gap-3">
				<button
					type="button"
					onclick={close}
					class="flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-200 text-base font-medium text-forest-900 transition active:scale-[0.98]"
				>
					Annuler
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					class="flex h-12 flex-1 items-center justify-center rounded-xl bg-red-600 text-base font-semibold text-white transition active:scale-[0.98]"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
