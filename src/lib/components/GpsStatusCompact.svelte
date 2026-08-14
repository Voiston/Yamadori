<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { formatAccuracy, getGpsSignalQuality, type GpsSignalQuality } from '$lib/utils/gps';
	import * as m from '$lib/paraglide/messages.js';

	let {
		accuracyMeters = null,
		bestAccuracyMeters = undefined,
		locationLabel = null,
		loading = false,
		locationLoading = false
	}: {
		accuracyMeters?: number | null;
		bestAccuracyMeters?: number | null;
		locationLabel?: string | null;
		loading?: boolean;
		locationLoading?: boolean;
	} = $props();

	const quality = $derived(getGpsSignalQuality(accuracyMeters));
	const bestQuality = $derived(
		bestAccuracyMeters !== undefined ? getGpsSignalQuality(bestAccuracyMeters) : null
	);
	const dualMode = $derived(bestAccuracyMeters !== undefined);

	function qualityClasses(qualityValue: GpsSignalQuality): string {
		return [
			qualityValue === 'excellent' && 'bg-green-500',
			qualityValue === 'fair' && 'bg-amber-500',
			qualityValue === 'poor' && 'bg-red-500',
			qualityValue === 'unknown' && 'bg-gray-400'
		]
			.filter(Boolean)
			.join(' ');
	}
</script>

{#snippet compactBadge(label: string, meters: number | null, qualityValue: GpsSignalQuality)}
	<span class="inline-flex items-center gap-1.5">
		<span
			class="inline-block h-2 w-2 shrink-0 rounded-full {qualityClasses(qualityValue)}"
			aria-hidden="true"
		></span>
		<span class="font-medium tabular-nums">
			<span class="sr-only">{label}</span>
			<span aria-hidden="true" class="mr-1 text-xs font-medium text-forest-600">{label}</span>
			{formatAccuracy(meters)}
		</span>
	</span>
{/snippet}

<p
	class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-forest-700"
	role="status"
	aria-label={!loading && accuracyMeters !== null
		? dualMode && bestAccuracyMeters !== undefined
			? m.gps_accuracy_dual_aria({
					current: formatAccuracy(accuracyMeters),
					best: formatAccuracy(bestAccuracyMeters)
				})
			: m.gps_accuracy_aria({ accuracy: formatAccuracy(accuracyMeters) })
		: loading
			? m.capture_location_identifying()
			: undefined}
>
	{#if loading}
		<span class="inline-flex items-center gap-1.5">
			<Skeleton class="h-2 w-2 shrink-0 rounded-full" decorative />
			<Skeleton class="h-3 w-16 rounded" decorative />
			<span class="text-muted">{m.capture_location_identifying()}</span>
		</span>
	{:else if accuracyMeters !== null}
		{#if dualMode && bestQuality !== null}
			{@render compactBadge(m.gps_accuracy_current(), accuracyMeters, quality)}
			{@render compactBadge(m.gps_accuracy_best(), bestAccuracyMeters ?? null, bestQuality)}
		{:else}
			<span class="inline-flex items-center gap-1.5">
				<span
					class="inline-block h-2 w-2 shrink-0 rounded-full {qualityClasses(quality)}"
					aria-hidden="true"
				></span>
				<span class="font-medium tabular-nums">{formatAccuracy(accuracyMeters)}</span>
			</span>
		{/if}
		{#if locationLabel}
			<span class="min-w-0 truncate text-forest-800">· {locationLabel}</span>
		{:else if locationLoading}
			<span class="inline-flex items-center gap-1 text-muted">
				·
				<Skeleton class="h-3 w-12 rounded" decorative />
			</span>
		{/if}
	{/if}
</p>
