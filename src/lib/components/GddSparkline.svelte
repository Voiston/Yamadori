<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { GddDailyPoint } from '$lib/types/gdd';
	import * as m from '$lib/paraglide/messages.js';

	let { history }: { history: GddDailyPoint[] } = $props();

	const WIDTH = 280;
	const HEIGHT = 84;
	const PAD = { top: 10, right: 10, bottom: 24, left: 38 };

	type ChartPoint = { x: number; y: number };

	type ChartModel = {
		path: string;
		yTicks: { value: number; y: number }[];
		xLabels: { label: string; x: number }[];
	};

	function formatDayLabel(isoDate: string): string {
		const [, month, day] = isoDate.split('-');
		return `${day}/${month}`;
	}

	function buildPath(values: number[], toPoint: (value: number, index: number) => ChartPoint): string {
		if (values.length === 0) return '';

		let current = '';
		for (let index = 0; index < values.length; index += 1) {
			const value = values[index];
			const point = toPoint(value, index);
			current += current ? ` L${point.x.toFixed(1)},${point.y.toFixed(1)}` : `M${point.x.toFixed(1)},${point.y.toFixed(1)}`;
		}
		return current;
	}

	const chart = $derived.by((): ChartModel | null => {
		if (history.length === 0) return null;

		const values = history.map((point) => point.cumulativeGdd);
		const min = 0;
		const max = Math.max(...values, 1);
		const range = max - min || 1;
		const innerWidth = WIDTH - PAD.left - PAD.right;
		const innerHeight = HEIGHT - PAD.top - PAD.bottom;
		const xStep = history.length > 1 ? innerWidth / (history.length - 1) : 0;

		const toPoint = (value: number, index: number): ChartPoint => ({
			x: PAD.left + index * xStep,
			y: PAD.top + innerHeight - ((value - min) / range) * innerHeight
		});

		const yTicks = [min, max / 2, max].map((value) => ({
			value: Math.round(value),
			y: PAD.top + innerHeight - ((value - min) / range) * innerHeight
		}));

		const labelIndices = history.length <= 5
			? history.map((_, index) => index)
			: [0, Math.floor(history.length / 2), history.length - 1];

		return {
			path: buildPath(values, toPoint),
			yTicks,
			xLabels: labelIndices.map((index) => ({
				label: formatDayLabel(history[index].date),
				x: PAD.left + index * xStep
			}))
		};
	});

	const sparklineAria = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.gdd_sparkline_aria();
	});
</script>

{#if chart}
	<svg
		viewBox="0 0 {WIDTH} {HEIGHT}"
		class="mt-2 h-auto w-full"
		role="img"
		aria-label={sparklineAria}
	>
		{#each chart.yTicks as tick (tick.value)}
			<line
				x1={PAD.left}
				y1={tick.y}
				x2={WIDTH - PAD.right}
				y2={tick.y}
				class="stroke-gray-200"
				stroke-width="1"
			/>
			<text x={PAD.left - 6} y={tick.y + 3} text-anchor="end" class="fill-gray-500 text-[9px]">
				{tick.value}
			</text>
		{/each}

		{#if chart.path}
			<path d={chart.path} fill="none" class="stroke-violet-700" stroke-width="2" stroke-linecap="round" />
		{/if}

		{#each chart.xLabels as label (label.label)}
			<text x={label.x} y={HEIGHT - 6} text-anchor="middle" class="fill-gray-500 text-[9px]">
				{label.label}
			</text>
		{/each}
	</svg>
{:else}
	<p class="mt-2 text-xs text-muted">{m.gdd_history_unavailable()}</p>
{/if}
