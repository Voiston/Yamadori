<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import {
		LASSO_CLOSE_PX,
		SAMPLE_MIN_DISTANCE_PX,
		START_TARGET_RADIUS_PX,
		buildScreenDownloadRing,
		distancePx,
		isNearLassoClose,
		screenRingToLngLats,
		snapLassoClose,
		svgEvenOddMaskPath,
		svgPathFromPoints,
		type LngLat,
		type ScreenPoint
	} from '$lib/utils/map/downloadRegion';
	import { hapticLight, hapticSelection, hapticSuccess, hapticWarning } from '$lib/utils/haptics';
	import * as m from '$lib/paraglide/messages.js';

	let {
		active,
		downloading,
		progress,
		sheetOpen = false,
		unproject,
		onCancel,
		onPrepare,
		onRegionChange
	}: {
		active: boolean;
		downloading: boolean;
		progress: string;
		sheetOpen?: boolean;
		unproject: (point: [number, number]) => { lng: number; lat: number };
		onCancel: () => void;
		onPrepare: () => void;
		onRegionChange: (ring: LngLat[] | null) => void;
	} = $props();

	let surfaceEl: HTMLDivElement | undefined;
	let surfaceWidth = $state(0);
	let surfaceHeight = $state(0);
	let screenPoints = $state.raw<ScreenPoint[]>([]);
	let completedRing = $state.raw<ScreenPoint[] | null>(null);
	let drawing = $state(false);
	let tooSmall = $state(false);
	let activePointerId: number | null = null;
	let closeSnapArmed = false;

	let downloadLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return downloading ? progress || m.map_downloading() : m.map_offline_prepare();
	});

	let outdoorMode = $derived(appearanceSettingsState.outdoorMode);
	let hasPath = $derived(screenPoints.length > 0 || completedRing !== null);
	let snappingClose = $derived(drawing && isNearLassoClose(screenPoints));
	let startPoint = $derived(screenPoints[0] ?? completedRing?.[0] ?? null);
	let strokePath = $derived.by(() => {
		if (completedRing && completedRing.length > 0) {
			return svgPathFromPoints(completedRing, true);
		}
		if (screenPoints.length > 0) {
			return svgPathFromPoints(screenPoints, snappingClose);
		}
		return '';
	});
	let maskPath = $derived.by(() => {
		if (!completedRing || completedRing.length === 0 || surfaceWidth <= 0 || surfaceHeight <= 0) {
			return '';
		}
		return svgEvenOddMaskPath(completedRing, surfaceWidth, surfaceHeight);
	});
	let strokeClass = $derived(outdoorMode ? 'stroke-black' : 'stroke-forest-600');
	let fillClass = $derived(outdoorMode ? 'fill-black/20' : 'fill-forest-600/30');
	let maskClass = $derived(outdoorMode ? 'fill-white/90' : 'fill-[rgba(26,46,26,0.28)]');
	let outlineStrokeWidth = $derived(outdoorMode ? 5 : 3);

	function pointFromEvent(event: PointerEvent): ScreenPoint | null {
		if (!surfaceEl) {
			return null;
		}
		const rect = surfaceEl.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
	}

	function resetDrawing(): void {
		screenPoints = [];
		completedRing = null;
		drawing = false;
		tooSmall = false;
		activePointerId = null;
		closeSnapArmed = false;
		onRegionChange(null);
	}

	function finishStroke(): void {
		drawing = false;
		activePointerId = null;
		const ring = buildScreenDownloadRing(screenPoints);
		if (!ring) {
			tooSmall = screenPoints.length > 0;
			completedRing = null;
			onRegionChange(null);
			if (tooSmall) {
				void hapticWarning();
			}
			return;
		}
		tooSmall = false;
		completedRing = ring;
		onRegionChange(screenRingToLngLats(ring, unproject));
		void hapticSuccess();
	}

	function handlePointerDown(event: PointerEvent): void {
		if (downloading || sheetOpen || event.button !== 0) {
			return;
		}
		if (activePointerId !== null) {
			return;
		}
		const point = pointFromEvent(event);
		if (!point) {
			return;
		}
		event.preventDefault();
		activePointerId = event.pointerId;
		drawing = true;
		tooSmall = false;
		completedRing = null;
		closeSnapArmed = false;
		screenPoints = [point];
		onRegionChange(null);
		surfaceEl?.setPointerCapture(event.pointerId);
		void hapticLight();
	}

	function handlePointerMove(event: PointerEvent): void {
		if (!drawing || event.pointerId !== activePointerId) {
			return;
		}
		const point = pointFromEvent(event);
		if (!point) {
			return;
		}
		const last = screenPoints[screenPoints.length - 1];
		const start = screenPoints[0];
		const candidate = [...screenPoints, point];
		const nearClose = isNearLassoClose(candidate);
		if (
			last &&
			start &&
			last.x === start.x &&
			last.y === start.y &&
			nearClose
		) {
			return;
		}
		if (last && distancePx(last, point) < SAMPLE_MIN_DISTANCE_PX && !nearClose) {
			return;
		}
		let next = candidate;
		if (nearClose) {
			next = snapLassoClose(candidate);
			if (!closeSnapArmed) {
				closeSnapArmed = true;
				void hapticSelection();
			}
		}
		screenPoints = next;
	}

	function handlePointerUp(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) {
			return;
		}
		if (surfaceEl?.hasPointerCapture(event.pointerId)) {
			surfaceEl.releasePointerCapture(event.pointerId);
		}
		if (!drawing) {
			activePointerId = null;
			return;
		}
		finishStroke();
	}

	function handleClear(): void {
		resetDrawing();
	}

	function measureSurface(node: HTMLDivElement): () => void {
		surfaceEl = node;
		const observer = new ResizeObserver(() => {
			surfaceWidth = node.clientWidth;
			surfaceHeight = node.clientHeight;
		});
		observer.observe(node);
		surfaceWidth = node.clientWidth;
		surfaceHeight = node.clientHeight;
		return () => {
			observer.disconnect();
			if (surfaceEl === node) {
				surfaceEl = undefined;
			}
		};
	}
</script>

{#if active}
	<div
		{@attach measureSurface}
		class="absolute inset-0 z-20 touch-none select-none {downloading
			? 'pointer-events-none'
			: 'pointer-events-auto cursor-crosshair'}"
		role="application"
		aria-label={m.map_offline_select()}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
	>
		{#if surfaceWidth > 0 && surfaceHeight > 0 && (strokePath || maskPath || (drawing && startPoint))}
			<svg
				class="pointer-events-none absolute inset-0"
				width={surfaceWidth}
				height={surfaceHeight}
				viewBox="0 0 {surfaceWidth} {surfaceHeight}"
				aria-hidden="true"
			>
				{#if maskPath}
					<path d={maskPath} class={maskClass} fill-rule="evenodd" />
				{/if}
				{#if strokePath}
					<path
						d={strokePath}
						class="{strokeClass} {completedRing || snappingClose ? fillClass : 'fill-none'}"
						stroke-width={outlineStrokeWidth}
						stroke-linejoin="round"
						stroke-linecap="round"
					/>
				{/if}
				{#if drawing && startPoint}
					<circle
						cx={startPoint.x}
						cy={startPoint.y}
						r={LASSO_CLOSE_PX / 2}
						class="{strokeClass} fill-none"
						stroke-width={outdoorMode ? 2.5 : 1.5}
						stroke-opacity={snappingClose ? 0.9 : 0.45}
						stroke-dasharray={snappingClose ? undefined : '4 4'}
					/>
					<circle
						cx={startPoint.x}
						cy={startPoint.y}
						r={snappingClose ? START_TARGET_RADIUS_PX + 2 : START_TARGET_RADIUS_PX}
						class="{strokeClass} {snappingClose ? fillClass : outdoorMode ? 'fill-white' : 'fill-forest-50'}"
						stroke-width={outdoorMode ? 3 : 2}
					/>
				{/if}
			</svg>
		{/if}
	</div>

	<div
		class="pointer-events-auto map-download-panel-top absolute inset-x-2 z-30 rounded-xl border border-forest-600/30 bg-white/95 p-3 shadow-lg backdrop-blur-sm md:inset-x-4 md:p-4"
		role="region"
		aria-label={m.map_offline_select()}
	>
		<p class="text-sm font-semibold text-forest-900">{m.map_offline_zone()}</p>
		<p class="mt-1 text-xs leading-relaxed text-muted">
			{m.map_offline_draw_hint()}
		</p>
		{#if tooSmall}
			<p class="mt-2 text-xs font-medium text-amber-800">{m.map_offline_too_small()}</p>
		{/if}

		<div class="mt-3 flex gap-2">
			<button
				type="button"
				class="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-forest-900 transition active:scale-[0.98] disabled:opacity-50"
				onclick={onCancel}
			>
				{m.action_cancel()}
			</button>
			{#if hasPath}
				<button
					type="button"
					class="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-forest-900 transition active:scale-[0.98] disabled:opacity-50"
					onclick={handleClear}
					disabled={downloading}
				>
					{m.map_offline_redraw()}
				</button>
			{/if}
			<button
				type="button"
				class="min-w-0 flex-1 rounded-lg bg-forest-800 px-3 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
				onclick={onPrepare}
				disabled={downloading || completedRing === null || sheetOpen}
				aria-busy={downloading}
			>
				{downloadLabel}
			</button>
		</div>
	</div>
{/if}
