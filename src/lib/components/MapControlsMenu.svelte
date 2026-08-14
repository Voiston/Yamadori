<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { MapBasemap } from '$lib/utils/map/styles';
	import { onMount } from 'svelte';

	type ViewMode = 'topdown' | 'oblique';

	let {
		basemap,
		showCadastreLayer,
		showProtectedLayer,
		viewMode,
		cadastreDisabled = false,
		protectedDisabled = false,
		cadastreTitle = '',
		protectedTitle = undefined,
		showCadastreHint = false,
		offlineAvailable = false,
		cacheCount = 0,
		downloadingZone = false,
		mapReady = false,
		pulseMenu = false,
		onbasemap,
		oncadastre,
		onprotected,
		onviewmode,
		onoffline
	}: {
		basemap: MapBasemap;
		showCadastreLayer: boolean;
		showProtectedLayer: boolean;
		viewMode: ViewMode;
		cadastreDisabled?: boolean;
		protectedDisabled?: boolean;
		cadastreTitle?: string;
		protectedTitle?: string | undefined;
		showCadastreHint?: boolean;
		offlineAvailable?: boolean;
		cacheCount?: number;
		downloadingZone?: boolean;
		mapReady?: boolean;
		pulseMenu?: boolean;
		onbasemap: (next: MapBasemap) => void;
		oncadastre: () => void;
		onprotected: () => void;
		onviewmode: (next: ViewMode) => void;
		onoffline: () => void;
	} = $props();

	let open = $state(false);
	let rootEl: HTMLDivElement | undefined = $state();

	let menuLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.map_controls_menu();
	});

	function close(): void {
		open = false;
	}

	function toggle(): void {
		open = !open;
	}

	function handleOffline(): void {
		onoffline();
		close();
	}

	function onDocPointerDown(event: PointerEvent): void {
		if (!open || !rootEl) return;
		const target = event.target;
		if (target instanceof Node && !rootEl.contains(target)) {
			close();
		}
	}

	function onDocKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && open) {
			close();
		}
	}

	onMount(() => {
		document.addEventListener('pointerdown', onDocPointerDown);
		document.addEventListener('keydown', onDocKeydown);
		return () => {
			document.removeEventListener('pointerdown', onDocPointerDown);
			document.removeEventListener('keydown', onDocKeydown);
		};
	});
</script>

<div bind:this={rootEl} class="pointer-events-auto relative flex items-start gap-2">
	<button
		type="button"
		class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-forest-900 shadow-sm backdrop-blur-sm transition active:scale-[0.98] {pulseMenu
			? 'map-layer-chip-pulse'
			: ''}"
		aria-label={menuLabel}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={toggle}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			class="h-5 w-5"
			aria-hidden="true"
		>
			<path d="M4 7h16M4 12h16M4 17h16" />
		</svg>
	</button>

	{#if showCadastreHint}
		<span
			class="max-w-[11rem] rounded-lg bg-white/90 px-2 py-1.5 text-[11px] leading-snug text-gray-600 shadow-sm backdrop-blur-sm"
		>
			{m.map_cadastre_tap_hint()}
		</span>
	{/if}

	{#if open}
		<div
			class="absolute left-12 top-0 z-40 max-h-[min(70vh,28rem)] w-[min(100vw-4.5rem,18rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white/98 p-3 shadow-lg backdrop-blur-md"
			role="menu"
			aria-label={menuLabel}
		>
			<section class="space-y-2">
				<p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
					{m.map_controls_section_basemap()}
				</p>
				<div class="flex overflow-hidden rounded-lg border border-gray-200">
					<button
						type="button"
						role="menuitemradio"
						aria-checked={basemap === 'topo'}
						class="flex-1 px-3 py-2 text-xs font-semibold transition {basemap === 'topo'
							? 'bg-forest-800 text-white'
							: 'text-forest-900'}"
						onclick={() => onbasemap('topo')}
					>
						{m.map_layer_plan()}
					</button>
					<button
						type="button"
						role="menuitemradio"
						aria-checked={basemap === 'satellite'}
						class="flex-1 px-3 py-2 text-xs font-semibold transition {basemap === 'satellite'
							? 'bg-forest-800 text-white'
							: 'text-forest-900'}"
						onclick={() => onbasemap('satellite')}
					>
						{m.map_layer_satellite()}
					</button>
				</div>
			</section>

			<section class="mt-3 space-y-2">
				<p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
					{m.map_controls_section_layers()}
				</p>
				<div class="flex overflow-hidden rounded-lg border border-gray-200">
					<button
						type="button"
						role="menuitemcheckbox"
						aria-checked={showCadastreLayer}
						class="flex-1 px-3 py-2 text-xs font-semibold transition disabled:opacity-50 {showCadastreLayer
							? 'bg-forest-800 text-white'
							: 'text-forest-900'}"
						disabled={cadastreDisabled}
						title={cadastreTitle}
						onclick={oncadastre}
					>
						{m.map_layer_cadastre()}
					</button>
					<button
						type="button"
						role="menuitemcheckbox"
						aria-checked={showProtectedLayer}
						class="flex-1 px-3 py-2 text-xs font-semibold transition disabled:opacity-50 {showProtectedLayer
							? 'bg-forest-800 text-white'
							: 'text-forest-900'}"
						disabled={protectedDisabled}
						title={protectedTitle}
						onclick={onprotected}
					>
						{m.map_layer_protected()}
					</button>
				</div>
			</section>

			<section class="mt-3 space-y-2">
				<p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
					{m.map_controls_section_view()}
				</p>
				<div class="flex overflow-hidden rounded-lg border border-gray-200">
					<button
						type="button"
						role="menuitemradio"
						aria-checked={viewMode === 'topdown'}
						class="flex-1 px-3 py-2 text-xs font-semibold transition {viewMode === 'topdown'
							? 'bg-forest-800 text-white'
							: 'text-forest-900'}"
						onclick={() => onviewmode('topdown')}
					>
						{m.map_view_topdown()}
					</button>
					<button
						type="button"
						role="menuitemradio"
						aria-checked={viewMode === 'oblique'}
						class="flex-1 px-3 py-2 text-xs font-semibold transition {viewMode === 'oblique'
							? 'bg-forest-800 text-white'
							: 'text-forest-900'}"
						onclick={() => onviewmode('oblique')}
					>
						{m.map_view_oblique()}
					</button>
				</div>
			</section>

			{#if offlineAvailable}
				<section class="mt-3 space-y-2">
					<p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
						{m.map_controls_section_offline()}
					</p>
					<button
						type="button"
						role="menuitem"
						class="w-full rounded-lg border border-forest-600/40 bg-forest-50/95 px-3 py-2 text-xs font-semibold text-forest-900 disabled:opacity-50"
						onclick={handleOffline}
						disabled={downloadingZone || !mapReady}
					>
						{m.map_offline_button()}
					</button>
					{#if cacheCount > 0}
						<p class="text-[11px] text-muted">{m.settings_tiles_count({ count: cacheCount })}</p>
					{/if}
				</section>
			{/if}
		</div>
	{/if}
</div>
