<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { AgriRiskLevel } from '$lib/types/agri';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import {
		excludeYrsBreakdownItems,
		formatYrsPoints,
		getYrsPointsClass,
		type YrsBreakdownItemId,
		type YrsLayerBreakdown
	} from '$lib/utils/yrs';
	import * as m from '$lib/paraglide/messages.js';

	const RISK_PILL_CLASS: Record<Exclude<AgriRiskLevel, 'Excellent'>, string> = {
		Passable: 'bg-orange-100 text-orange-900',
		Dangereux: 'bg-red-100 text-red-800'
	};

	let {
		label,
		hint = '',
		displayValue,
		breakdown,
		mappedItemIds = [],
		isPenalty = false,
		open = false,
		interactive = true,
		riskLevel,
		ontoggle,
		onlockedclick,
		children
	}: {
		label: string;
		hint?: string;
		displayValue: string;
		breakdown: YrsLayerBreakdown;
		mappedItemIds?: readonly YrsBreakdownItemId[];
		isPenalty?: boolean;
		open?: boolean;
		interactive?: boolean;
		riskLevel?: AgriRiskLevel;
		ontoggle?: () => void;
		onlockedclick?: () => void;
		children?: Snippet;
	} = $props();

	const riskPillLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (riskLevel === 'Passable') return m.yrs_risk_passable();
		if (riskLevel === 'Dangereux') return m.yrs_risk_critical();
		return '';
	});

	const scoreDetailAria = $derived.by(() => {
		void appearanceSettingsState.locale;
		const detail = m.yrs_score_detail({ label });
		if (riskPillLabel) {
			return `${detail} — ${riskPillLabel}`;
		}
		return detail;
	});

	const emptyMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		return isPenalty ? m.yrs_no_penalty() : m.yrs_no_points();
	});

	const leftoverHeading = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.yrs_other_contributions();
	});

	const leftoverItems = $derived(excludeYrsBreakdownItems(breakdown, mappedItemIds));
	const showLeftoverHeading = $derived(
		leftoverItems.length > 0 && leftoverItems.length < breakdown.items.length
	);
	const showEmpty = $derived(breakdown.items.length === 0 && leftoverItems.length === 0 && !children);
	const scoreKind = $derived(isPenalty ? 'penalty' : 'points');

	const showRiskPill = $derived(riskLevel === 'Passable' || riskLevel === 'Dangereux');

	function handleClick(event: MouseEvent): void {
		event.stopPropagation();
		if (interactive) {
			ontoggle?.();
			return;
		}
		onlockedclick?.();
	}
</script>

<div
	class="rounded-lg bg-white {open && interactive ? 'ring-2 ring-forest-600/30' : ''}"
>
	<button
		type="button"
		class="flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left transition active:scale-[0.99]"
		aria-expanded={interactive ? open : undefined}
		aria-label={scoreDetailAria}
		onclick={handleClick}
	>
		<span class="min-w-0 flex-1">
			<span class="block text-sm font-medium text-forest-900">{label}</span>
			{#if hint}
				<span class="mt-0.5 block text-xs text-muted">{hint}</span>
			{/if}
		</span>
		{#if showRiskPill && riskLevel && riskLevel !== 'Excellent'}
			<span
				class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold {RISK_PILL_CLASS[riskLevel]}"
			>
				{riskPillLabel}
			</span>
		{/if}
		<span class="shrink-0 text-sm font-semibold {isPenalty ? 'text-red-700' : 'text-forest-800'}">
			{displayValue}
		</span>
		<svg
			class="h-4 w-4 shrink-0 text-muted transition-transform {open && interactive
				? 'rotate-180'
				: ''}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</button>

	{#if interactive && open}
		<div role="region" aria-label={scoreDetailAria} class="border-t border-gray-100 px-3 pb-3 pt-2">
			{#if showEmpty}
				<p class="text-sm text-muted">{emptyMessage}</p>
			{:else if leftoverItems.length > 0}
				{#if showLeftoverHeading}
					<p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
						{leftoverHeading}
					</p>
				{/if}
				<ul class="flex flex-col gap-1.5 text-sm">
					{#each leftoverItems as item (item.id)}
						<li class="flex items-start justify-between gap-2">
							<span class="text-forest-800">{item.label}</span>
							<span
								class="shrink-0 font-semibold tabular-nums {getYrsPointsClass(item.points, scoreKind)}"
							>
								{formatYrsPoints(item.points, scoreKind)}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
			{#if children}
				<div class="mt-3 flex flex-col gap-3">
					{@render children()}
				</div>
			{/if}
		</div>
	{/if}
</div>
