<script lang="ts">
	let {
		displayRotation,
		needleColor,
		compact = false
	}: {
		displayRotation: number;
		needleColor: string;
		compact?: boolean;
	} = $props();
</script>

<div
	class="relative flex items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm {compact
		? 'h-24 w-24'
		: 'h-64 w-64 md:h-80 md:w-80'}"
>
	<div class="absolute inset-3 rounded-full border border-dashed border-gray-200"></div>
	<span class="absolute top-2 text-[10px] font-medium text-muted">N</span>
	<div style:transform="rotate({displayRotation}deg)" aria-hidden="true">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 64 64"
			class={compact ? 'h-14 w-14' : 'h-24 w-24'}
		>
			<path d="M32 6 L40 44 L32 38 L24 44 Z" fill={needleColor} />
		</svg>
	</div>
</div>
