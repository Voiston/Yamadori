<script lang="ts">
	let {
		needleColor,
		aligned = false
	}: {
		needleColor: string;
		aligned?: boolean;
	} = $props();
</script>

<div
	class="flex h-11 w-11 items-center justify-center rounded-full border bg-white/95 shadow-md backdrop-blur-sm {aligned
		? 'border-forest-600'
		: 'border-gray-200'}"
	aria-hidden="true"
>
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="h-7 w-7">
		<path d="M32 6 L40 44 L32 38 L24 44 Z" fill={needleColor} />
	</svg>
</div>
