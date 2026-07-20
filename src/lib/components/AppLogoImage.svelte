<script lang="ts">
	import { base } from '$app/paths';

	let { class: className = '', decorative = true }: { class?: string; decorative?: boolean } =
		$props();
</script>

<img
	src="{base}/icons/icon.png"
	alt=""
	class={className}
	{...(decorative ? { 'aria-hidden': 'true' } : {})}
/>
