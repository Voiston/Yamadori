<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { Snippet } from 'svelte';
	import type { AgriRiskLevel } from '$lib/types/agri';
	import { getAgriMetricCardClass } from '$lib/utils/agri';
	import * as m from '$lib/paraglide/messages.js';

	let {
		title,
		helpText,
		riskLevel = 'Excellent',
		class: className = '',
		children
	}: {
		title: string;
		helpText: string;
		riskLevel?: AgriRiskLevel;
		class?: string;
		children?: Snippet;
	} = $props();

	let helpOpen = $state(false);
	const helpId = $derived(`agri-help-${title.toLowerCase().replace(/\s+/g, '-')}`);
	const cardClass = $derived(`${getAgriMetricCardClass(riskLevel)} ${className}`.trim());

	const helpAriaLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.agri_help_prefix({ title });
	});
</script>

<article class="rounded-lg px-4 py-3 {cardClass}">
	<div class="flex items-start justify-between gap-2">
		<p class="text-sm font-medium text-forest-900">{title}</p>
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
</article>
