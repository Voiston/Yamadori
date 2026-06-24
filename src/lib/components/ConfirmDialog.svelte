<script lang="ts">

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import * as m from '$lib/paraglide/messages.js';

	import { portal } from '$lib/utils/portal';



	let {

		open = $bindable(false),

		title,

		message,

		confirmLabel,

		variant = 'danger',

		onconfirm,

		oncancel

	}: {

		open?: boolean;

		title?: string;

		message?: string;

		confirmLabel?: string;

		variant?: 'danger' | 'default';

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



	function close() {

		open = false;

		oncancel?.();

	}



	function handleConfirm() {

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

		use:portal

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

			<h2 id="dialog-title" class="text-lg font-semibold text-forest-900">{resolvedTitle}</h2>

			<p id="dialog-message" class="mt-2 text-base text-muted">{resolvedMessage}</p>



			<div class="mt-6 flex gap-3">

				<button

					type="button"

					onclick={close}

					class="flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-200 text-base font-medium text-forest-900 transition active:scale-[0.98]"

				>

					{m.action_cancel()}

				</button>

				<button

					type="button"

					onclick={handleConfirm}

					class="flex h-12 flex-1 items-center justify-center rounded-xl text-base font-semibold text-white transition active:scale-[0.98] {variant ===

					'danger'

						? 'bg-red-600'

						: 'bg-forest-800'}"

				>

					{resolvedConfirmLabel}

				</button>

			</div>

		</div>

	</div>

{/if}

