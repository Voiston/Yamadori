<script lang="ts">
	import { formatAccuracy, getGpsSignalQuality, type GpsSignalQuality } from '$lib/utils/gps';
	import * as m from '$lib/paraglide/messages.js';

	let {
		accuracyMeters,
		bestAccuracyMeters = undefined,
		loading = false
	}: {
		accuracyMeters: number | null;
		bestAccuracyMeters?: number | null;
		loading?: boolean;
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

{#snippet accuracyBadge(label: string, meters: number | null, qualityValue: GpsSignalQuality)}
	<div class="flex items-center gap-2">
		<span
			class="inline-block h-4 w-4 shrink-0 rounded-full {qualityClasses(qualityValue)}"
			aria-hidden="true"
		></span>
		<p class="text-lg font-semibold tabular-nums text-forest-800">
			<span class="sr-only">{label}</span>
			<span aria-hidden="true" class="mr-1.5 text-sm font-medium text-forest-600">{label}</span>
			{formatAccuracy(meters)}
		</p>
	</div>
{/snippet}

{#if loading}
	<p class="text-base text-muted" role="status">{m.gps_locating()}</p>
{:else if accuracyMeters !== null}
	<div
		class="mt-2 flex flex-row flex-wrap items-center gap-4"
		role="status"
		aria-label={dualMode && bestAccuracyMeters !== undefined
			? m.gps_accuracy_dual_aria({
					current: formatAccuracy(accuracyMeters),
					best: formatAccuracy(bestAccuracyMeters)
				})
			: m.gps_accuracy_aria({ accuracy: formatAccuracy(accuracyMeters) })}
	>
		{#if dualMode && bestQuality !== null}
			{@render accuracyBadge(m.gps_accuracy_current(), accuracyMeters, quality)}
			{@render accuracyBadge(m.gps_accuracy_best(), bestAccuracyMeters ?? null, bestQuality)}
		{:else}
			<span
				class="inline-block h-4 w-4 shrink-0 rounded-full {qualityClasses(quality)}"
				aria-hidden="true"
			></span>
			<p class="text-lg font-semibold tabular-nums text-forest-800">{formatAccuracy(accuracyMeters)}</p>
		{/if}
	</div>
{/if}
