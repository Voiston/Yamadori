<script lang="ts">
	import type { Tree } from '$lib/types/tree';
	import { resolve } from '$app/paths';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { treeStore } from '$lib/stores/trees.svelte';
	import { canAddTree, isTreeAccessible } from '$lib/utils/featurePolicy';
	import { openProPaywall } from '$lib/stores/proPaywall.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import TreeCard from './TreeCard.svelte';
	import AppLogoImage from './AppLogoImage.svelte';

	let {
		trees,
		distanceByTreeId = {},
		emptyTitle,
		emptyMessage,
		showCaptureCta = true
	}: {
		trees: Tree[];
		distanceByTreeId?: Record<string, number>;
		emptyTitle?: string;
		emptyMessage?: string;
		showCaptureCta?: boolean;
	} = $props();

	let resolvedEmptyTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return emptyTitle ?? m.list_no_trees();
	});

	let resolvedEmptyMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		return emptyMessage ?? m.list_empty_hint();
	});

	let captureBlocked = $derived(!canAddTree(treeStore.trees.length));

	function onCaptureBlocked() {
		openProPaywall('tree_limit');
	}
</script>

{#if trees.length === 0}
	<div class="flex flex-col items-center justify-center px-6 py-20 text-center">
		<div
			class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-forest-800/10 text-forest-800"
		>
			<AppLogoImage class="h-12 w-12 object-contain" />
		</div>
		<h2 class="text-xl font-semibold text-forest-900">{resolvedEmptyTitle}</h2>
		<p class="mt-2 max-w-xs text-base text-muted">{resolvedEmptyMessage}</p>
		{#if showCaptureCta}
			{#if captureBlocked}
				<button
					type="button"
					class="btn-primary btn-primary--inline mt-6"
					onclick={onCaptureBlocked}
				>
					{m.nav_add()}
				</button>
			{:else}
				<a href={resolve('/capture')} class="btn-primary btn-primary--inline mt-6">
					{m.nav_add()}
				</a>
			{/if}
		{/if}
	</div>
{:else}
	<ul class="tree-list flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
		{#each trees as tree (tree.id)}
			<li class="tree-list-item">
				<TreeCard
					{tree}
					distanceMeters={distanceByTreeId[tree.id] ?? null}
					locked={!isTreeAccessible(tree.id, treeStore.trees)}
				/>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.tree-list-item {
		content-visibility: auto;
		contain-intrinsic-size: auto 7.5rem;
	}
</style>
