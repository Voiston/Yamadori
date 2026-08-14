<script lang="ts">
	import { computeDimmingPanels, observeTargetRect } from '$lib/utils/tutorialSpotlight';

	let {
		target = null,
		padding = 4
	}: {
		target?: HTMLElement | null;
		padding?: number;
	} = $props();

	let highlightRect = $state<DOMRect | null>(null);
	let viewportWidth = $state(0);
	let viewportHeight = $state(0);

	function updateViewportSize(): void {
		viewportWidth = visualViewport?.width ?? window.innerWidth;
		viewportHeight = visualViewport?.height ?? window.innerHeight;
	}

	let panels = $derived.by(() => {
		if (!highlightRect || viewportWidth <= 0 || viewportHeight <= 0) {
			return null;
		}
		return computeDimmingPanels(highlightRect, padding, viewportWidth, viewportHeight);
	});

	$effect(() => {
		const el = target;
		updateViewportSize();
		const onViewportChange = () => updateViewportSize();
		window.addEventListener('resize', onViewportChange, { passive: true });
		visualViewport?.addEventListener('resize', onViewportChange, { passive: true });
		visualViewport?.addEventListener('scroll', onViewportChange, { passive: true });

		const cleanupTarget = observeTargetRect(el, (rect) => {
			highlightRect = rect;
			updateViewportSize();
		});

		return () => {
			cleanupTarget();
			window.removeEventListener('resize', onViewportChange);
			visualViewport?.removeEventListener('resize', onViewportChange);
			visualViewport?.removeEventListener('scroll', onViewportChange);
		};
	});
</script>

{#if panels}
	<div
		class="pointer-events-none fixed bg-black/45"
		style="top: {panels.top.top}px; left: {panels.top.left}px; width: {panels.top.width}px; height: {panels.top.height}px;"
	></div>
	<div
		class="pointer-events-none fixed bg-black/45"
		style="top: {panels.left.top}px; left: {panels.left.left}px; width: {panels.left.width}px; height: {panels.left.height}px;"
	></div>
	<div
		class="pointer-events-none fixed bg-black/45"
		style="top: {panels.right.top}px; left: {panels.right.left}px; width: {panels.right.width}px; height: {panels.right.height}px;"
	></div>
	<div
		class="pointer-events-none fixed bg-black/45"
		style="top: {panels.bottom.top}px; left: {panels.bottom.left}px; width: {panels.bottom.width}px; height: {panels.bottom.height}px;"
	></div>
	<div
		class="pointer-events-none fixed rounded-xl ring-4 ring-forest-400 ring-offset-2 ring-offset-transparent"
		style="top: {panels.highlight.top}px; left: {panels.highlight.left}px; width: {panels.highlight.width}px; height: {panels.highlight.height}px;"
	></div>
{:else}
	<div class="pointer-events-none fixed inset-0 bg-black/45"></div>
{/if}
