<script lang="ts">
	import type { Tree } from '$lib/types/tree';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import TreeCard from './TreeCard.svelte';

	let {
		trees,
		distanceByTreeId = {},
		emptyTitle,
		emptyMessage
	}: {
		trees: Tree[];
		distanceByTreeId?: Record<string, number>;
		emptyTitle?: string;
		emptyMessage?: string;
	} = $props();

	let resolvedEmptyTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return emptyTitle ?? m.list_no_trees();
	});

	let resolvedEmptyMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		return emptyMessage ?? m.list_empty_hint();
	});
</script>

{#if trees.length === 0}
	<div class="flex flex-col items-center justify-center px-6 py-20 text-center">
		<div
			class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-forest-800/10 text-forest-800"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				class="h-10 w-10"
				aria-hidden="true"
			>
				<path
					d="M12 2C8.5 2 6 4.5 6 8c0 2 1 3.8 2.5 5-2.5 1.2-4.5 4-4.5 7.5 0 4.1 3.4 7.5 7.5 7.5s7.5-3.4 7.5-7.5c0-3.5-2-6.3-4.5-7.5C17 11.8 18 10 18 8c0-3.5-2.5-6-6-6z"
				/>
			</svg>
		</div>
		<h2 class="text-xl font-semibold text-forest-900">{resolvedEmptyTitle}</h2>
		<p class="mt-2 max-w-xs text-base text-muted">{resolvedEmptyMessage}</p>
	</div>
{:else}
	<ul class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
		{#each trees as tree (tree.id)}
			<li>
				<TreeCard {tree} distanceMeters={distanceByTreeId[tree.id] ?? null} />
			</li>
		{/each}
	</ul>
{/if}
