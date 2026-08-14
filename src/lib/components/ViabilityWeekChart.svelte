<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { ViabilityDay, WeeklyViability } from '$lib/types/agri';
	import type { YrsDecision } from '$lib/types/yrs';
	import { resolveHarvestCalendarPrior } from '$lib/geo/harvestWindowPrior';
	import * as m from '$lib/paraglide/messages.js';

	let {
		viability,
		species = '',
		latitude = 0,
		longitude = 0
	}: {
		viability: WeeklyViability;
		species?: string;
		latitude?: number;
		longitude?: number;
	} = $props();

	const WIDTH = 300;
	const HEIGHT = 120;
	const PAD = { top: 12, right: 12, bottom: 28, left: 34 };

	type ChartPoint = {
		x: number;
		y: number;
		day: ViabilityDay;
		index: number;
		outsideCalendar: boolean;
	};

	type ChartModel = {
		path: string;
		points: ChartPoint[];
		todayY: number;
		yTicks: { value: number; y: number }[];
		xLabels: { label: string; x: number; isToday: boolean }[];
		bestIndex: number;
		outsideCount: number;
	};

	let selectedIndex = $state<number | null>(null);

	const yrsDecisionLabels = $derived.by((): Record<YrsDecision, string> => {
		void appearanceSettingsState.locale;
		return {
			OPTIMAL: m.yrs_decision_optimal(),
			ACCEPTABLE: m.yrs_decision_acceptable(),
			RISK: m.yrs_decision_risk(),
			NO_GO: m.yrs_decision_no_go()
		};
	});

	function formatDayLabel(isoDate: string): string {
		const [, month, day] = isoDate.split('-');
		return `${day}/${month}`;
	}

	function pointColor(decision: YrsDecision): string {
		if (decision === 'OPTIMAL') return 'fill-emerald-600';
		if (decision === 'ACCEPTABLE') return 'fill-amber-500';
		if (decision === 'RISK') return 'fill-orange-500';
		return 'fill-red-500';
	}

	function dotBgClass(decision: YrsDecision): string {
		if (decision === 'OPTIMAL') return 'bg-emerald-600';
		if (decision === 'ACCEPTABLE') return 'bg-amber-500';
		if (decision === 'RISK') return 'bg-orange-500';
		return 'bg-red-500';
	}

	function isOutsideCalendar(isoDate: string): boolean {
		if (!species.trim()) return false;
		const prior = resolveHarvestCalendarPrior(
			species,
			latitude,
			longitude,
			new Date(`${isoDate}T12:00:00`)
		);
		return prior.applicable && !prior.inWindow;
	}

	function selectPoint(index: number) {
		selectedIndex = index;
	}

	function onPointKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectPoint(index);
		}
	}

	const chart = $derived.by((): ChartModel | null => {
		void appearanceSettingsState.locale;
		const days = viability.days;
		if (days.length === 0) return null;

		const innerWidth = WIDTH - PAD.left - PAD.right;
		const innerHeight = HEIGHT - PAD.top - PAD.bottom;
		const xStep = days.length > 1 ? innerWidth / (days.length - 1) : 0;
		const min = 0;
		const max = 100;
		const range = max - min;

		const toY = (score: number): number =>
			PAD.top + innerHeight - ((score - min) / range) * innerHeight;

		const toPoint = (day: ViabilityDay, index: number): ChartPoint => ({
			x: PAD.left + index * xStep,
			y: toY(day.score),
			day,
			index,
			outsideCalendar: isOutsideCalendar(day.date)
		});

		const points = days.map(toPoint);
		const path = points
			.map((point, index) =>
				index === 0
					? `M${point.x.toFixed(1)},${point.y.toFixed(1)}`
					: `L${point.x.toFixed(1)},${point.y.toFixed(1)}`
			)
			.join(' ');

		const bestIndex = days.findIndex((day) => day.date === viability.bestDayDate);
		const todayDate = days[0]?.date ?? '';

		return {
			path,
			points,
			todayY: toY(viability.todayScore),
			yTicks: [0, 50, 100].map((value) => ({ value, y: toY(value) })),
			xLabels: days.map((day, index) => ({
				label: day.date === todayDate ? m.yrs_today_short() : formatDayLabel(day.date),
				x: PAD.left + index * xStep,
				isToday: day.date === todayDate
			})),
			bestIndex: bestIndex >= 0 ? bestIndex : 0,
			outsideCount: points.filter((point) => point.outsideCalendar).length
		};
	});

	$effect(() => {
		const bestDate = viability.bestDayDate;
		const days = viability.days;
		if (days.length === 0) {
			selectedIndex = null;
			return;
		}
		const bestIndex = days.findIndex((day) => day.date === bestDate);
		selectedIndex = bestIndex >= 0 ? bestIndex : 0;
	});

	const selectedPoint = $derived(
		selectedIndex !== null && chart ? (chart.points[selectedIndex] ?? null) : null
	);

	const ariaLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		const best = viability.days.find((day) => day.date === viability.bestDayDate);
		return m.yrs_chart_aria({
			today: viability.todayScore,
			best: best?.score ?? viability.bestDayScore
		});
	});
</script>

{#if chart}
	<svg
		viewBox="0 0 {WIDTH} {HEIGHT}"
		class="mt-2 h-auto w-full"
		role="group"
		aria-label={ariaLabel}
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

		<line
			x1={PAD.left}
			y1={chart.todayY}
			x2={WIDTH - PAD.right}
			y2={chart.todayY}
			class="stroke-forest-400"
			stroke-width="1"
			stroke-dasharray="4 3"
		/>

		{#if chart.path}
			<path
				d={chart.path}
				fill="none"
				class="stroke-forest-700"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{/if}

		{#each chart.points as point (point.day.date)}
			{@const isBest = point.index === chart.bestIndex}
			{@const isSelected = point.index === selectedIndex}
			<circle
				cx={point.x}
				cy={point.y}
				r={14}
				fill="transparent"
				class="cursor-pointer"
				role="button"
				tabindex="0"
				aria-label={chart.xLabels[point.index]?.label ?? formatDayLabel(point.day.date)}
				aria-pressed={isSelected}
				onclick={() => selectPoint(point.index)}
				onkeydown={(event) => onPointKeydown(event, point.index)}
			/>
			<circle
				cx={point.x}
				cy={point.y}
				r={isSelected ? 6 : isBest ? 5 : 3.5}
				class="{pointColor(point.day.yrsDecision)} {isSelected || isBest
					? 'stroke-forest-900'
					: ''} {point.outsideCalendar ? 'opacity-50' : ''} pointer-events-none"
				stroke-width={isSelected ? 2 : isBest ? 1.5 : 0}
			/>
			{#if point.outsideCalendar}
				<text
					x={point.x}
					y={point.y - 8}
					text-anchor="middle"
					class="fill-orange-700 pointer-events-none text-[8px] font-semibold"
				>
					!
				</text>
			{/if}
		{/each}

		{#each chart.xLabels as label (label.label + label.x)}
			<text
				x={label.x}
				y={HEIGHT - 6}
				text-anchor="middle"
				class="text-[9px] {label.isToday ? 'fill-forest-800 font-semibold' : 'fill-gray-500'}"
			>
				{label.label}
			</text>
		{/each}
	</svg>

	<div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
		{#each ['OPTIMAL', 'ACCEPTABLE', 'RISK', 'NO_GO'] as decision (decision)}
			<span class="inline-flex items-center gap-1.5">
				<span
					class="inline-block h-2 w-2 rounded-full {dotBgClass(decision as YrsDecision)}"
					aria-hidden="true"
				></span>
				{yrsDecisionLabels[decision as YrsDecision]}
			</span>
		{/each}
		{#if chart.outsideCount > 0}
			<span class="inline-flex items-center gap-1.5 text-orange-800">
				<span class="font-semibold">!</span>
				{m.yrs_chart_outside_calendar()}
			</span>
		{/if}
	</div>

	{#if selectedPoint}
		{@const day = selectedPoint.day}
		{@const delta = day.deltaFromToday}
		<div
			class="mt-3 rounded-lg border border-forest-100 bg-forest-50/60 px-3 py-2 text-xs text-forest-900"
			role="status"
		>
			<p class="font-medium">
				{chart.xLabels[selectedPoint.index]?.label ?? formatDayLabel(day.date)} · {yrsDecisionLabels[
					day.yrsDecision
				]} · {day.score}/100
			</p>
			<p class="mt-0.5 text-forest-700">Δ {delta > 0 ? '+' : ''}{delta}</p>
			{#if day.reason}
				<p class="mt-1 text-forest-800/80">{day.reason}</p>
			{/if}
		</div>
	{/if}
{/if}
