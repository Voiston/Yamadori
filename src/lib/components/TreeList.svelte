<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Tree } from '$lib/types/tree';
	import { resolve } from '$app/paths';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import TreeCard from './TreeCard.svelte';
	import AppLogoImage from './AppLogoImage.svelte';

	let {
		trees,
		distanceByTreeId = {},
		emptyTitle,
		emptyMessage,
		showCaptureCta = true,
		emptyKind = 'first-use',
		emptyActions
	}: {
		trees: Tree[];
		distanceByTreeId?: Record<string, number>;
		emptyTitle?: string;
		emptyMessage?: string;
		showCaptureCta?: boolean;
		emptyKind?: 'first-use' | 'no-results';
		emptyActions?: Snippet;
	} = $props();

	let resolvedEmptyTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return emptyTitle ?? m.list_no_trees();
	});

	let resolvedEmptyMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		return emptyMessage ?? m.list_empty_hint();
	});

	let isNoResults = $derived(emptyKind === 'no-results');
</script>

{#if trees.length === 0}
	<div
		class="flex flex-col items-center justify-center px-6 py-20 text-center"
		role="status"
		aria-live="polite"
		aria-atomic="true"
	>
		{#if isNoResults}
			<div
				class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-muted"
				aria-hidden="true"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="h-10 w-10"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="M21 21l-4.35-4.35" stroke-linecap="round" />
				</svg>
			</div>
		{:else}
			<div
				class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-forest-800/10 text-forest-800"
			>
				<AppLogoImage class="h-12 w-12 object-contain" />
			</div>
		{/if}
		<h2 class="text-xl font-semibold text-forest-900">{resolvedEmptyTitle}</h2>
		<p class="mt-2 max-w-xs text-base text-muted">{resolvedEmptyMessage}</p>
		{#if isNoResults && emptyActions}
			<div class="mt-6 flex flex-col items-center gap-3">
				{@render emptyActions()}
			</div>
		{:else if showCaptureCta}
			<a href={resolve('/capture')} class="btn-primary btn-primary--inline mt-6">
				{m.nav_add()}
			</a>
		{/if}
	</div>
{:else}
	<ul class="tree-list flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
		{#each trees as tree (tree.id)}
			<li class="tree-list-item">
				<TreeCard {tree} distanceMeters={distanceByTreeId[tree.id] ?? null} />
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
