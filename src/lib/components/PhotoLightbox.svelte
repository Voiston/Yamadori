<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { hapticError, hapticSuccess } from '$lib/utils/haptics';
	import { modalFocus } from '$lib/utils/modalFocus';
	import { downloadPhoto } from '$lib/utils/photoDownload';

	let {
		open = $bindable(false),
		src = '',
		alt = ''
	}: {
		open?: boolean;
		src?: string;
		alt?: string;
	} = $props();

	let saving = $state(false);
	let feedback = $state<{ type: 'ok' | 'error'; message: string } | null>(null);

	let dialogLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return alt.trim() ? `${m.photo_fullscreen()} — ${alt}` : m.photo_fullscreen();
	});

	let downloadLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.photo_download();
	});

	function close() {
		feedback = null;
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

	function stopBubble(event: MouseEvent) {
		event.stopPropagation();
	}

	async function handleDownload(event: MouseEvent) {
		event.stopPropagation();
		if (!src || saving) return;

		saving = true;
		feedback = null;
		try {
			const result = await downloadPhoto(src);
			if (result === 'failed') {
				feedback = { type: 'error', message: m.feedback_photo_download_failed() };
				void hapticError();
			} else {
				feedback = { type: 'ok', message: m.feedback_photo_downloaded() };
				void hapticSuccess();
			}
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open && src}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
		role="dialog"
		aria-modal="true"
		aria-label={dialogLabel}
		tabindex="-1"
		use:modalFocus
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<button
			type="button"
			onclick={close}
			class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-95"
			aria-label={m.action_close()}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-6 w-6"
				aria-hidden="true"
			>
				<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
			</svg>
		</button>

		<div
			class="flex max-h-full max-w-full flex-col items-center gap-3"
			onclick={stopBubble}
			onkeydown={handleKeydown}
			role="presentation"
		>
			<img {src} {alt} class="max-h-[min(70vh,100%)] max-w-full object-contain" />

			<button
				type="button"
				onclick={handleDownload}
				disabled={saving}
				class="flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-medium text-white transition active:scale-95 disabled:opacity-50"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="h-5 w-5"
					aria-hidden="true"
				>
					<path d="M12 3v12" stroke-linecap="round" />
					<path d="M8 11l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
					<path d="M5 19h14" stroke-linecap="round" />
				</svg>
				{downloadLabel}
			</button>

			{#if feedback}
				<p
					class="max-w-sm text-center text-sm font-medium {feedback.type === 'ok'
						? 'text-green-300'
						: 'text-red-300'}"
					role="status"
					aria-live="polite"
				>
					{feedback.message}
				</p>
			{/if}
		</div>
	</div>
{/if}
