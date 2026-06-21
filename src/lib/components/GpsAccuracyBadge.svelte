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
	<p class="text-sm text-muted" role="status">Localisation en cours…</p>
{:else if accuracyMeters !== null}
	<div class="mt-1 flex items-center gap-2" role="status">
		<span
			class="inline-block h-3 w-3 shrink-0 rounded-full"
			class:bg-green-500={quality === 'excellent'}
			class:bg-amber-500={quality === 'fair'}
			class:bg-red-500={quality === 'poor'}
			class:bg-gray-400={quality === 'unknown'}
			aria-hidden="true"
		></span>

		<p class="text-sm text-forest-800">
			{#if quality === 'excellent'}
				Signal excellent ({formatAccuracy(accuracyMeters)})
			{:else if quality === 'fair'}
				Signal moyen ({formatAccuracy(accuracyMeters)}) — attends un peu…
			{:else}
				Signal mauvais ({formatAccuracy(accuracyMeters)}) — mets-toi à la clairière !
			{/if}
		</p>
	</div>
{/if}
