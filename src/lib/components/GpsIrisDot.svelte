<script lang="ts">
	import type { GpsSignalQuality } from '$lib/utils/gps';

	let {
		quality,
		size = 'md'
	}: {
		quality: GpsSignalQuality;
		size?: 'sm' | 'md';
	} = $props();
</script>

<span
	class={['gps-iris', size === 'sm' && 'gps-iris--sm', `gps-iris--${quality}`]}
	aria-hidden="true"
>
	<span class="gps-iris__dot"></span>
	{#if quality !== 'unknown'}
		<span class="gps-iris__ring"></span>
	{/if}
</span>
