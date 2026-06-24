<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { YrsLayerBreakdown } from '$lib/utils/yrs';
	import * as m from '$lib/paraglide/messages.js';

	let {
		label,
		displayValue,
		breakdown,
		isPenalty = false,
		open = false,
		ontoggle
	}: {
		label: string;
		displayValue: string;
		breakdown: YrsLayerBreakdown;
		isPenalty?: boolean;
		open?: boolean;
		ontoggle?: () => void;
	} = $props();

	const scoreDetailAria = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.yrs_score_detail({ label });
	});

	const emptyMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		return isPenalty ? m.yrs_no_penalty() : m.yrs_no_points();
	});

	function formatPoints(points: number): string {
		if (isPenalty) return `−${points}`;
		return points > 0 ? `+${points}` : `${points}`;
	}
</script>

<div class="relative">
	<button
		type="button"
		class="w-full rounded-lg bg-white px-3 py-2 text-left transition active:scale-[0.98] {open
			? 'ring-2 ring-forest-600/30'
			: ''}"
		aria-expanded={open}
		aria-label={scoreDetailAria}
		onclick={(event) => {
			event.stopPropagation();
			ontoggle?.();
		}}
	>
		<p class="text-muted">{label}</p>
		<p class="font-semibold {isPenalty ? 'text-red-700' : 'text-forest-800'}">{displayValue}</p>
	</button>

	{#if open}
		<div
			role="region"
			aria-label={scoreDetailAria}
			class="absolute top-full right-0 left-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg"
		>
			{#if breakdown.items.length === 0}
				<p class="text-muted">{emptyMessage}</p>
			{:else}
				<ul class="flex flex-col gap-1.5">
					{#each breakdown.items as item (item.label)}
						<li class="flex items-start justify-between gap-2">
							<span class="text-forest-800">{item.label}</span>
							<span
								class="shrink-0 font-semibold {isPenalty
									? 'text-red-700'
									: 'text-forest-700'}"
							>
								{formatPoints(item.points)}
							</span>
						</li>
					{/each}
				</ul>
				{#if breakdown.max !== undefined}
					<p class="mt-2 border-t border-gray-100 pt-2 font-medium text-forest-900">
						Total : {displayValue}
					</p>
				{/if}
			{/if}
		</div>
	{/if}
</div>
