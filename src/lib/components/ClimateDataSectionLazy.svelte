<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type ClimateDataSection from './ClimateDataSection.svelte';

	type ClimateDataSectionProps = ComponentProps<typeof ClimateDataSection>;

	let {
		open = $bindable(false),
		...rest
	}: ClimateDataSectionProps = $props();

	let ClimateDataSectionComponent = $state<typeof ClimateDataSection | null>(null);
	let loadFailed = $state(false);

	$effect(() => {
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
	<ClimateDataSectionComponent bind:open {...rest} />
{:else}
	<details class="rounded-lg border border-gray-200 bg-white" bind:open>
		<summary class="cursor-pointer px-4 py-3 font-medium text-forest-900 select-none">
			{m.climate_section_title()}
		</summary>
		<div class="border-t border-gray-100 px-4 py-3">
			{#if loadFailed}
				<p
					class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
					role="alert"
				>
					{m.capture_climate_error()}
				</p>
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
