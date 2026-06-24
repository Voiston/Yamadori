<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getEnvironmentExposureHints,
		getEnvironmentExposureOptions
	} from '$lib/constants/environment-exposure';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { EnvironmentExposure } from '$lib/types/environment';
	import * as m from '$lib/paraglide/messages.js';

	const TOOLTIP_DURATION_MS = 4500;

	let {
		value = $bindable<EnvironmentExposure>('OPEN'),
		disabled = false,
		onchange
	}: {
		value?: EnvironmentExposure;
		disabled?: boolean;
		onchange?: (value: EnvironmentExposure) => void;
	} = $props();

	let tooltip = $state<{ label: string; hint: string } | null>(null);
	let tooltipVisible = $state(false);
	let tooltipTimer: ReturnType<typeof setTimeout> | undefined;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	const exposureOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getEnvironmentExposureOptions();
	});

	const exposureHints = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getEnvironmentExposureHints();
	});

	function clearTooltipTimers() {
		if (tooltipTimer) {
			clearTimeout(tooltipTimer);
			tooltipTimer = undefined;
		}
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = undefined;
		}
	}

	function hideTooltip() {
		tooltipVisible = false;
		hideTimer = setTimeout(() => {
			tooltip = null;
			hideTimer = undefined;
		}, 200);
	}

	function showTooltipFor(option: (typeof exposureOptions)[number]) {
		clearTooltipTimers();
		tooltip = {
			label: option.label,
			hint: exposureHints[option.value]
		};
		tooltipVisible = true;
		tooltipTimer = setTimeout(() => {
			hideTooltip();
			tooltipTimer = undefined;
		}, TOOLTIP_DURATION_MS);
	}

	function selectExposure(next: EnvironmentExposure) {
		value = next;
		const option = exposureOptions.find((entry) => entry.value === next);
		if (option) {
			showTooltipFor(option);
		}
		onchange?.(next);
	}

	onMount(() => () => clearTooltipTimers());
</script>

<div class="relative">
	<div class="flex items-center gap-2">
		<span class="shrink-0 text-xs font-medium text-forest-900">{m.exposure_label()}</span>
		<div class="flex min-w-0 flex-1 gap-1">
			{#each exposureOptions as option (option.value)}
				<button
					type="button"
					{disabled}
					aria-label={option.label}
					aria-pressed={value === option.value}
					aria-describedby={tooltip && value === option.value ? 'exposure-tooltip' : undefined}
					onclick={() => selectExposure(option.value)}
					class="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-xs transition active:scale-[0.98] disabled:opacity-50 {value ===
					option.value
						? 'bg-forest-800 text-white'
						: 'border border-gray-200 bg-white text-forest-900'}"
				>
					<span class="shrink-0" aria-hidden="true">{option.icon}</span>
					<span class="truncate">{option.shortLabel}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if tooltip}
		<div
			id="exposure-tooltip"
			role="tooltip"
			class="pointer-events-none absolute inset-x-0 top-full z-20 mt-1.5 rounded-lg border border-forest-100 bg-forest-900 px-3 py-2 text-white shadow-lg transition-all duration-200 {tooltipVisible
				? 'translate-y-0 opacity-100'
				: '-translate-y-1 opacity-0'}"
		>
			<p class="text-xs font-medium">{tooltip.label}</p>
			<p class="mt-0.5 text-[11px] leading-snug text-forest-100">{tooltip.hint}</p>
		</div>
	{/if}
</div>
