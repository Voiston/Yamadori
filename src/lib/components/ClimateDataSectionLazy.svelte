<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { climateChunkErrorCopy } from '$lib/utils/errorCopy';
	import type ClimateDataSection from './ClimateDataSection.svelte';

	type ClimateDataSectionProps = ComponentProps<typeof ClimateDataSection>;

	let {
		open = $bindable(false),
		embedded = false,
		...rest
	}: ClimateDataSectionProps = $props();

	let ClimateDataSectionComponent = $state<typeof ClimateDataSection | null>(null);
	let loadFailed = $state(false);
	let retryNonce = $state(0);

	$effect(() => {
		void retryNonce;
		if (!open) {
			return;
		}
		if (ClimateDataSectionComponent) {
			return;
		}

		let cancelled = false;
		loadFailed = false;
		void import('./ClimateDataSection.svelte')
			.then((module) => {
				if (!cancelled) {
					ClimateDataSectionComponent = module.default;
				}
			})
			.catch(() => {
				if (!cancelled) {
					loadFailed = true;
				}
			});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if ClimateDataSectionComponent}
	<ClimateDataSectionComponent bind:open {embedded} {...rest} />
{:else if embedded}
	{#if open}
		<div class="app-card px-4 py-3">
			{#if loadFailed}
				<ErrorBanner
					copy={climateChunkErrorCopy()}
					tone="warning"
					onretry={() => {
						loadFailed = false;
						retryNonce += 1;
					}}
				/>
			{:else}
				<div
					class="flex min-h-[3rem] items-center justify-center gap-2"
					role="status"
					aria-busy="true"
					aria-label={m.climate_analyzing()}
				>
					<div
						class="h-5 w-5 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700"
					></div>
					<span class="text-sm text-muted">{m.climate_analyzing()}</span>
				</div>
			{/if}
		</div>
	{/if}
{:else}
	<details class="rounded-lg border border-gray-200 bg-white" bind:open>
		<summary class="cursor-pointer px-4 py-3 font-medium text-forest-900 select-none">
			{m.climate_section_title()}
		</summary>
		<div class="border-t border-gray-100 px-4 py-3">
			{#if loadFailed}
				<ErrorBanner
					copy={climateChunkErrorCopy()}
					tone="warning"
					onretry={() => {
						loadFailed = false;
						retryNonce += 1;
					}}
				/>
			{:else if open}
				<div
					class="flex min-h-[3rem] items-center justify-center gap-2"
					role="status"
					aria-busy="true"
					aria-label={m.climate_analyzing()}
				>
					<div
						class="h-5 w-5 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700"
					></div>
					<span class="text-sm text-muted">{m.climate_analyzing()}</span>
				</div>
			{/if}
		</div>
	</details>
{/if}
