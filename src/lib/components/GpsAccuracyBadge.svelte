<script lang="ts">
	import { formatAccuracy, getGpsSignalQuality } from '$lib/utils/gps';

	let {
		accuracyMeters,
		loading = false
	}: {
		accuracyMeters: number | null;
		loading?: boolean;
	} = $props();

	const quality = $derived(getGpsSignalQuality(accuracyMeters));
</script>

{#if loading}
	<p class="text-base text-muted" role="status">Localisation en cours…</p>
{:else if accuracyMeters !== null}
	<div
		class="mt-2 flex items-center gap-3"
		role="status"
		aria-label="Précision GPS {formatAccuracy(accuracyMeters)}"
	>
		<span
			class="inline-block h-4 w-4 shrink-0 rounded-full"
			class:bg-green-500={quality === 'excellent'}
			class:bg-amber-500={quality === 'fair'}
			class:bg-red-500={quality === 'poor'}
			class:bg-gray-400={quality === 'unknown'}
			aria-hidden="true"
		></span>

		<p class="text-lg font-semibold tabular-nums text-forest-800">{formatAccuracy(accuracyMeters)}</p>
	</div>
{/if}
