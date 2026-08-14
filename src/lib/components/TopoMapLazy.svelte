<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Skeleton from './Skeleton.svelte';
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
	<div class="flex min-h-[12rem] flex-1 items-center justify-center bg-forest-50/80 p-4">
		<Skeleton class="h-full min-h-[10rem] w-full rounded-[var(--radius-card)]" label={m.climate_loading()} />
	</div>
{/if}
