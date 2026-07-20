<script lang="ts">
	import { appToastState } from '$lib/stores/appToast.svelte';

	const toast = $derived(appToastState.current);

	const toastClass = $derived.by(() => {
		if (!toast) return '';
		if (toast.type === 'ok') return 'bg-green-800 text-white';
		if (toast.type === 'info') return 'bg-amber-600 text-white';
		return 'bg-red-800 text-white';
	});
</script>

{#if toast}
	<p
		class="bottom-safe-toast fixed left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-medium shadow-lg {toastClass}"
		role="status"
		aria-live="polite"
	>
		{toast.message}
	</p>
{/if}
