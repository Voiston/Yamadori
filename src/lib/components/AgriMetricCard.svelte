<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { Snippet } from 'svelte';
	import type { AgriRiskLevel } from '$lib/types/agri';
	import { getAgriMetricCardClass } from '$lib/utils/agri';
	import {
		formatYrsPoints,
		getYrsPointsClass,
		type YrsMetricScoreKind,
		type YrsScoreBreakdownItem
	} from '$lib/utils/yrs';
	import * as m from '$lib/paraglide/messages.js';

	let {
		title,
		helpText,
		riskLevel = 'Excellent',
		class: className = '',
		scoreItems = [],
		scoreKind = 'points',
		children
	}: {
		title: string;
		helpText: string;
		riskLevel?: AgriRiskLevel;
		class?: string;
		scoreItems?: YrsScoreBreakdownItem[];
		scoreKind?: YrsMetricScoreKind;
		children?: Snippet;
	} = $props();

	let helpOpen = $state(false);
	const helpId = $derived(`agri-help-${title.toLowerCase().replace(/\s+/g, '-')}`);
	const cardClass = $derived(`${getAgriMetricCardClass(riskLevel)} ${className}`.trim());

	const helpAriaLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.agri_help_prefix({ title });
	});

	const contextLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.yrs_points_context();
	});

	const headerItem = $derived(scoreKind !== 'context' && scoreItems.length === 1 ? scoreItems[0] : null);
	const showItemList = $derived(
		scoreKind !== 'context' &&
			(scoreItems.length > 1 || (scoreItems.length === 1 && (scoreItems[0]?.points ?? 0) <= 0))
	);
</script>

<article class="rounded-lg px-4 py-3 {cardClass}">
	<div class="flex items-start justify-between gap-2">
		<p class="min-w-0 text-sm font-medium text-forest-900">{title}</p>
		<div class="flex shrink-0 items-center gap-2">
			{#if scoreKind === 'context'}
				<span
					class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium leading-tight text-gray-700"
				>
					{contextLabel}
				</span>
			{:else if headerItem}
				<span
					class="text-sm font-semibold tabular-nums {getYrsPointsClass(headerItem.points, scoreKind)}"
				>
					{formatYrsPoints(headerItem.points, scoreKind)}
				</span>
			{/if}
			<button
				type="button"
				class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-forest-700 transition active:scale-95"
				aria-expanded={helpOpen}
				aria-controls={helpId}
				aria-label={helpAriaLabel}
				onclick={() => (helpOpen = !helpOpen)}
			>
				?
			</button>
		</div>
	</div>

	{#if helpOpen}
		<p id={helpId} class="mt-2 text-xs leading-relaxed text-muted" role="note">
			<span class="font-medium text-forest-800">{m.yrs_recommendation()}</span>
			{helpText}
		</p>
	{/if}

	{#if children}
		<div class="mt-2">
			{@render children()}
		</div>
	{/if}

	{#if showItemList}
		<ul class="mt-2 flex flex-col gap-1 border-t border-gray-100/80 pt-2 text-sm">
			{#each scoreItems as item (item.id)}
				<li class="flex items-start justify-between gap-2">
					<span class="text-forest-800">{item.label}</span>
					<span class="shrink-0 font-semibold tabular-nums {getYrsPointsClass(item.points, scoreKind)}">
						{formatYrsPoints(item.points, scoreKind)}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</article>
