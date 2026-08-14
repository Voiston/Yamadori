<script lang="ts">
	import { appToastState } from '$lib/stores/appToast.svelte';
	import { toastIn, toastOut } from '$lib/utils/motion';

	const toast = $derived(appToastState.current);

	const toastClass = $derived.by(() => {
		if (!toast) return '';
		if (toast.type === 'ok') return 'bg-[var(--color-success)] text-white';
		if (toast.type === 'info') return 'bg-[var(--color-warning)] text-white';
		return 'bg-[var(--color-danger)] text-white';
	});
</script>

{#if toast}
	<div
		class="bottom-safe-toast pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
		aria-hidden="true"
	>
		<p
			class="pointer-events-auto w-max max-w-[calc(100vw-2rem)] rounded-2xl px-5 py-2.5 text-center text-sm font-medium shadow-lg {toastClass}"
			role="status"
			aria-live="polite"
			in:toastIn
			out:toastOut
		>
			{toast.message}
		</p>
	</div>
{/if}
