<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type TopoMap from './TopoMap.svelte';

	let props: ComponentProps<typeof TopoMap> = $props();

	let TopoMapComponent = $state<typeof TopoMap | null>(null);

	$effect(() => {
		let cancelled = false;
		void import('./TopoMap.svelte').then((module) => {
			if (!cancelled) {
				TopoMapComponent = module.default;
			}
		});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if TopoMapComponent}
	<TopoMapComponent {...props} />
{:else}
	<div
		class="flex min-h-[12rem] flex-1 items-center justify-center bg-forest-50/80"
		role="status"
		aria-busy="true"
	>
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700"></div>
	</div>
{/if}
