<script lang="ts">
	import type { NavIcon } from '$lib/navigation';

	let { icon, class: className = 'h-6 w-6' }: { icon: NavIcon; class?: string } = $props();
</script>

{#if icon === 'list'}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		class={className}
		aria-hidden="true"
	>
		<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke-linecap="round" />
	</svg>
{:else if icon === 'map'}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		class={className}
		aria-hidden="true"
	>
		<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
		<path d="M8 2v16M16 6v16" />
	</svg>
{:else}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		class={className}
		aria-hidden="true"
	>
		<path d="M12 5v14M5 12h14" stroke-linecap="round" />
	</svg>
{/if}
