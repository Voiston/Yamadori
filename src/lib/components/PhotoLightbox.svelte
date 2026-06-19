<script lang="ts">
	let {
		open = $bindable(false),
		src = '',
		alt = ''
	}: {
		open?: boolean;
		src?: string;
		alt?: string;
	} = $props();

	function close() {
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

{#if open && src}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Photo en plein écran"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<button
			type="button"
			onclick={close}
			class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-95"
			aria-label="Fermer"
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
		<img {src} {alt} class="max-h-full max-w-full object-contain" />
	</div>
{/if}
