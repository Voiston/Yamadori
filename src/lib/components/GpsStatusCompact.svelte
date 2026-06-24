<script lang="ts">
	import { formatAccuracy, getGpsSignalQuality } from '$lib/utils/gps';
	import * as m from '$lib/paraglide/messages.js';

	let {
		accuracyMeters = null,
		locationLabel = null,
		loading = false,
		locationLoading = false
	}: {
		accuracyMeters?: number | null;
		locationLabel?: string | null;
		loading?: boolean;
		locationLoading?: boolean;
	} = $props();

	const quality = $derived(getGpsSignalQuality(accuracyMeters));
</script>

<p class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-forest-700" role="status">
	{#if loading}
		<span class="text-muted">{m.capture_location_identifying()}</span>
	{:else if accuracyMeters !== null}
		<span class="inline-flex items-center gap-1.5">
			<span
				class="inline-block h-2 w-2 shrink-0 rounded-full"
				class:bg-green-500={quality === 'excellent'}
				class:bg-amber-500={quality === 'fair'}
				class:bg-red-500={quality === 'poor'}
				class:bg-gray-400={quality === 'unknown'}
				aria-hidden="true"
			></span>
			<span class="font-medium tabular-nums">{formatAccuracy(accuracyMeters)}</span>
		</span>
		{#if locationLabel}
			<span class="min-w-0 truncate text-forest-800">· {locationLabel}</span>
		{:else if locationLoading}
			<span class="text-muted">· …</span>
		{/if}
	{/if}
</p>
