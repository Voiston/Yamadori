<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { SoilDailySample } from '$lib/types/agri';
	import * as m from '$lib/paraglide/messages.js';

	let { history }: { history: SoilDailySample[] } = $props();

	const WIDTH = 280;
	const HEIGHT = 84;
	const PAD = { top: 10, right: 10, bottom: 24, left: 34 };

	type ChartPoint = { x: number; y: number };

	type ChartModel = {
		path6: string;
		path18: string;
		yTicks: { value: number; y: number }[];
		xLabels: { label: string; x: number }[];
	};

	function formatDayLabel(isoDate: string): string {
		const [, month, day] = isoDate.split('-');
		return `${day}/${month}`;
	}

	function buildPath(values: (number | null)[], toPoint: (value: number, index: number) => ChartPoint): string {
		const segments: string[] = [];
		let current = '';

		for (let index = 0; index < values.length; index += 1) {
			const value = values[index];
			if (value === null) {
				if (current) {
					segments.push(current);
					current = '';
				}
				continue;
			}

			const point = toPoint(value, index);
			current += current ? ` L${point.x.toFixed(1)},${point.y.toFixed(1)}` : `M${point.x.toFixed(1)},${point.y.toFixed(1)}`;
		}

		if (current) segments.push(current);
		return segments.join(' ');
	}

	const chart = $derived.by((): ChartModel | null => {
		if (history.length === 0) return null;

		const values6 = history.map((sample) => sample.mean6cmC);
		const values18 = history.map((sample) => sample.mean18cmC);
		const allValues = [...values6, ...values18].filter((value): value is number => value !== null);
		if (allValues.length === 0) return null;

		const min = Math.min(...allValues) - 1;
		const max = Math.max(...allValues) + 1;
		const range = max - min || 1;
		const innerWidth = WIDTH - PAD.left - PAD.right;
		const innerHeight = HEIGHT - PAD.top - PAD.bottom;
		const xStep = history.length > 1 ? innerWidth / (history.length - 1) : 0;

		const toPoint = (value: number, index: number): ChartPoint => ({
			x: PAD.left + index * xStep,
			y: PAD.top + innerHeight - ((value - min) / range) * innerHeight
		});

		const yTicks = [min, (min + max) / 2, max].map((value) => ({
			value: Math.round(value * 10) / 10,
			y: PAD.top + innerHeight - ((value - min) / range) * innerHeight
		}));

		return {
			path6: buildPath(values6, toPoint),
			path18: buildPath(values18, toPoint),
			yTicks,
			xLabels: history.map((sample, index) => ({
				label: formatDayLabel(sample.date),
				x: PAD.left + index * xStep
			}))
		};
	});

	const sparklineAria = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.soil_sparkline_aria();
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
			<text
				x={PAD.left - 6}
				y={tick.y + 3}
				text-anchor="end"
				class="fill-gray-500 text-[9px]"
			>
				{tick.value}°
			</text>
		{/each}

		{#if chart.path6}
			<path d={chart.path6} fill="none" class="stroke-emerald-700" stroke-width="2" stroke-linecap="round" />
		{/if}
		{#if chart.path18}
			<path
				d={chart.path18}
				fill="none"
				class="stroke-amber-700"
				stroke-width="2"
				stroke-linecap="round"
				stroke-dasharray="5 3"
			/>
		{/if}

		{#each chart.xLabels as label (label.label)}
			<text x={label.x} y={HEIGHT - 6} text-anchor="middle" class="fill-gray-500 text-[9px]">
				{label.label}
			</text>
		{/each}
	</svg>

	<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted">
		<span class="inline-flex items-center gap-1.5">
			<span class="inline-block h-0.5 w-4 rounded bg-emerald-700" aria-hidden="true"></span>
			6 cm
		</span>
		<span class="inline-flex items-center gap-1.5">
			<span
				class="inline-block h-0 w-4 border-t-2 border-dashed border-amber-700"
				aria-hidden="true"
			></span>
			18 cm
		</span>
	</div>
{:else}
	<p class="mt-2 text-xs text-muted">{m.soil_history_unavailable()}</p>
{/if}
