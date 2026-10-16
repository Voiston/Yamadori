<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import {
		OFFLINE_PACK_MAX_TILES,
		OFFLINE_PACK_TILE_WARNING,
		formatTileCacheSize,
		offlinePackZoomLevels
	} from '$lib/utils/map/tileCache';
	import {
		detailZoomAvailable,
		offlinePackSizeBytes,
		selectedOfflinePackTiles,
		selectedPackZoomLevels,
		type OfflinePackEstimate,
		type OfflinePackSelection
	} from '$lib/utils/map/offlinePack';

	let {
		estimate,
		weatherEnabled,
		oncancel,
		onconfirm
	}: {
		estimate: OfflinePackEstimate;
		weatherEnabled: boolean;
		oncancel: () => void;
		onconfirm: (selection: OfflinePackSelection) => void;
	} = $props();

	let maps = $state(true);
	let weather = $state(true);
	let cadastre = $state(true);
	let protectedAreas = $state(true);
	let viewZoom = $state(true);
	let walkZoom = $state(true);
	let detailZoom = $state(false);

	const titleId = $props.id();

	let copy = $derived.by(() => {
		void appearanceSettingsState.locale;
		return {
			title: m.map_offline_pack_title(),
			maps: m.map_offline_pack_maps(),
			mapsDetail: m.map_offline_pack_maps_detail(),
			tiles: (count: number) => m.map_offline_pack_tiles({ count }),
			weather: m.map_offline_pack_weather(),
			weatherDetail: m.map_offline_pack_weather_detail(),
			forecastOne: m.map_offline_pack_forecast_one(),
			forecasts: (count: number) => m.map_offline_pack_forecasts({ count }),
			cadastre: m.map_offline_pack_cadastre(),
			cadastreDetail: m.map_offline_pack_cadastre_detail(),
			protected: m.map_offline_pack_protected(),
			protectedDetail: m.map_offline_pack_protected_detail(),
			unavailable: m.map_offline_pack_unavailable(),
			tooMany: (count: number) =>
				m.map_offline_pack_too_many({ count, max: OFFLINE_PACK_MAX_TILES }),
			zoomHeading: m.map_offline_pack_zoom_heading(),
			zoomApplies: m.map_offline_pack_zoom_applies(),
			zoomView: m.map_offline_pack_zoom_view(),
			zoomViewDetail: (levels: string) => m.map_offline_pack_zoom_view_detail({ levels }),
			zoomPair: (a: number, b: number) => m.map_offline_pack_zoom_pair({ a, b }),
			zoomWalk: m.map_offline_pack_zoom_walk(),
			zoomWalkDetail: m.map_offline_pack_zoom_walk_detail(),
			zoomDetail: m.map_offline_pack_zoom_detail(),
			zoomDetailHint: m.map_offline_pack_zoom_detail_hint(),
			zoomRange: (min: number, max: number) => m.map_offline_pack_zoom_range({ min, max }),
			zoomSingle: (level: number) => m.map_offline_pack_zoom_single({ level }),
			zoomSize: (size: string) => m.map_offline_pack_zoom_size({ size }),
			volumeWarning: (count: number, size: string) =>
				m.map_offline_pack_volume_warning({ count, size }),
			confirm: m.map_offline_pack_confirm(),
			cancel: m.action_cancel()
		};
	});

	let detailAvailable = $derived(
		detailZoomAvailable(estimate, {
			maps,
			cadastre: cadastre && estimate.cadastreAvailable,
			protectedAreas: protectedAreas && estimate.protectedAvailable
		})
	);
	let selection = $derived.by((): OfflinePackSelection => ({
		maps,
		weather: weather && weatherEnabled,
		cadastre: cadastre && estimate.cadastreAvailable,
		protectedAreas: protectedAreas && estimate.protectedAvailable,
		viewZoom,
		walkZoom,
		detailZoom: detailZoom && detailAvailable
	}));
	let tileTotal = $derived(selectedOfflinePackTiles(estimate, selection));
	let zoomLevels = $derived(selectedPackZoomLevels(estimate, selection));
	let sizeLabel = $derived(formatTileCacheSize(offlinePackSizeBytes(tileTotal)));
	let overCap = $derived(tileTotal > OFFLINE_PACK_MAX_TILES);
	let volumeWarning = $derived(tileTotal >= OFFLINE_PACK_TILE_WARNING && !overCap);
	let referenceMax = $derived(
		estimate.layers.reduce((maxZoom, layer) => Math.max(maxZoom, layer.maxZoom), estimate.currentZoom)
	);
	let viewLevels = $derived(
		offlinePackZoomLevels(estimate.currentZoom, referenceMax, {
			view: true,
			walk: false,
			detail: false
		})
	);
	let viewLevelLabel = $derived.by(() => {
		if (viewLevels.length >= 2) {
			return copy.zoomPair(viewLevels[0], viewLevels[viewLevels.length - 1]);
		}
		if (viewLevels.length === 1) {
			return String(viewLevels[0]);
		}
		return '';
	});
	let rangeLabel = $derived.by(() => {
		if (zoomLevels.length === 0) {
			return '';
		}
		if (zoomLevels.length === 1) {
			return copy.zoomSingle(zoomLevels[0]);
		}
		return copy.zoomRange(zoomLevels[0], zoomLevels[zoomLevels.length - 1]);
	});
	let layerTiles = $derived.by(() => {
		const mapsOnly = selectedOfflinePackTiles(estimate, {
			...selection,
			maps: true,
			cadastre: false,
			protectedAreas: false
		});
		const cadastreOnly = selectedOfflinePackTiles(estimate, {
			...selection,
			maps: false,
			cadastre: estimate.cadastreAvailable,
			protectedAreas: false
		});
		const protectedOnly = selectedOfflinePackTiles(estimate, {
			...selection,
			maps: false,
			cadastre: false,
			protectedAreas: estimate.protectedAvailable
		});
		return { maps: mapsOnly, cadastre: cadastreOnly, protected: protectedOnly };
	});
	let canConfirm = $derived(
		!overCap &&
			(selection.weather ||
				((selection.maps || selection.cadastre || selection.protectedAreas) &&
					zoomLevels.length > 0))
	);

	function forecastLabel(count: number): string {
		return count === 1 ? copy.forecastOne : copy.forecasts(count);
	}

	function confirm(): void {
		if (!canConfirm) {
			return;
		}
		onconfirm(selection);
	}
</script>

<div
	class="pointer-events-auto absolute inset-x-2 z-40 max-h-[70%] overflow-y-auto rounded-xl border border-forest-600/30 bg-white/95 p-3 shadow-lg backdrop-blur-sm md:inset-x-auto md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2"
	style="bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 0.5rem);"
	role="dialog"
	aria-modal="true"
	aria-labelledby={titleId}
>
	<h2 id={titleId} class="text-sm font-semibold text-forest-900">{copy.title}</h2>

	<ul class="mt-3 flex flex-col gap-2">
		<li>
			<label class="flex min-h-11 items-start gap-3 rounded-lg border border-gray-100 px-3 py-2">
				<input type="checkbox" class="mt-1 size-4 accent-forest-700" bind:checked={maps} />
				<span class="min-w-0 flex-1">
					<span class="flex items-baseline justify-between gap-2">
						<span class="text-sm font-medium text-forest-900">{copy.maps}</span>
						<span class="shrink-0 text-xs text-muted">{copy.tiles(layerTiles.maps)}</span>
					</span>
					<span class="mt-0.5 block text-xs leading-relaxed text-muted">{copy.mapsDetail}</span>
				</span>
			</label>
			<fieldset class="mt-2 rounded-lg border border-gray-100 px-3 py-2">
				<legend class="px-1 text-xs font-semibold text-forest-900">{copy.zoomHeading}</legend>
				<p class="text-xs leading-relaxed text-muted">{copy.zoomApplies}</p>
				<label class="mt-2 flex min-h-11 items-start gap-3">
					<input type="checkbox" class="mt-1 size-4 accent-forest-700" bind:checked={viewZoom} />
					<span class="min-w-0 flex-1">
						<span class="block text-sm font-medium text-forest-900">{copy.zoomView}</span>
						<span class="mt-0.5 block text-xs leading-relaxed text-muted">
							{copy.zoomViewDetail(viewLevelLabel)}
						</span>
					</span>
				</label>
				<label class="mt-1 flex min-h-11 items-start gap-3">
					<input type="checkbox" class="mt-1 size-4 accent-forest-700" bind:checked={walkZoom} />
					<span class="min-w-0 flex-1">
						<span class="block text-sm font-medium text-forest-900">{copy.zoomWalk}</span>
						<span class="mt-0.5 block text-xs leading-relaxed text-muted">{copy.zoomWalkDetail}</span>
					</span>
				</label>
				<label class={['mt-1 flex min-h-11 items-start gap-3', !detailAvailable && 'opacity-50']}>
					<input
						type="checkbox"
						class="mt-1 size-4 accent-forest-700"
						checked={detailZoom && detailAvailable}
						disabled={!detailAvailable}
						onchange={(event) => {
							detailZoom = event.currentTarget.checked;
						}}
					/>
					<span class="min-w-0 flex-1">
						<span class="block text-sm font-medium text-forest-900">{copy.zoomDetail}</span>
						<span class="mt-0.5 block text-xs leading-relaxed text-muted">{copy.zoomDetailHint}</span>
					</span>
				</label>
				{#if rangeLabel}
					<p class="mt-2 text-xs font-medium text-forest-900">
						{rangeLabel} · {copy.zoomSize(sizeLabel)}
					</p>
				{/if}
			</fieldset>
		</li>
		<li>
			<label
				class={[
					'flex min-h-11 items-start gap-3 rounded-lg border border-gray-100 px-3 py-2',
					!weatherEnabled && 'opacity-50'
				]}
			>
				<input
					type="checkbox"
					class="mt-1 size-4 accent-forest-700"
					checked={weather && weatherEnabled}
					disabled={!weatherEnabled}
					onchange={(event) => {
						weather = event.currentTarget.checked;
					}}
				/>
				<span class="min-w-0 flex-1">
					<span class="flex items-baseline justify-between gap-2">
						<span class="text-sm font-medium text-forest-900">{copy.weather}</span>
						<span class="shrink-0 text-xs text-muted">{forecastLabel(estimate.forecastCount)}</span>
					</span>
					<span class="mt-0.5 block text-xs leading-relaxed text-muted">{copy.weatherDetail}</span>
				</span>
			</label>
		</li>
		<li>
			<label
				class={[
					'flex min-h-11 items-start gap-3 rounded-lg border border-gray-100 px-3 py-2',
					!estimate.cadastreAvailable && 'opacity-50'
				]}
			>
				<input
					type="checkbox"
					class="mt-1 size-4 accent-forest-700"
					checked={cadastre && estimate.cadastreAvailable}
					disabled={!estimate.cadastreAvailable}
					onchange={(event) => {
						cadastre = event.currentTarget.checked;
					}}
				/>
				<span class="min-w-0 flex-1">
					<span class="flex items-baseline justify-between gap-2">
						<span class="text-sm font-medium text-forest-900">{copy.cadastre}</span>
						<span class="shrink-0 text-xs text-muted">
							{estimate.cadastreAvailable ? copy.tiles(layerTiles.cadastre) : copy.unavailable}
						</span>
					</span>
					<span class="mt-0.5 block text-xs leading-relaxed text-muted">{copy.cadastreDetail}</span>
				</span>
			</label>
		</li>
		<li>
			<label
				class={[
					'flex min-h-11 items-start gap-3 rounded-lg border border-gray-100 px-3 py-2',
					!estimate.protectedAvailable && 'opacity-50'
				]}
			>
				<input
					type="checkbox"
					class="mt-1 size-4 accent-forest-700"
					checked={protectedAreas && estimate.protectedAvailable}
					disabled={!estimate.protectedAvailable}
					onchange={(event) => {
						protectedAreas = event.currentTarget.checked;
					}}
				/>
				<span class="min-w-0 flex-1">
					<span class="flex items-baseline justify-between gap-2">
						<span class="text-sm font-medium text-forest-900">{copy.protected}</span>
						<span class="shrink-0 text-xs text-muted">
							{estimate.protectedAvailable
								? copy.tiles(layerTiles.protected)
								: copy.unavailable}
						</span>
					</span>
					<span class="mt-0.5 block text-xs leading-relaxed text-muted">{copy.protectedDetail}</span>
				</span>
			</label>
		</li>
	</ul>

	{#if volumeWarning}
		<p class="mt-3 text-xs font-medium text-amber-800" role="status">
			{copy.volumeWarning(tileTotal, sizeLabel)}
		</p>
	{/if}
	{#if overCap}
		<p class="mt-3 text-xs font-medium text-amber-800" role="status">
			{copy.tooMany(tileTotal)}
		</p>
	{/if}

	<div class="mt-3 flex gap-2">
		<button
			type="button"
			class="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-forest-900 transition active:scale-[0.98]"
			onclick={oncancel}
		>
			{copy.cancel}
		</button>
		<button
			type="button"
			class="min-w-0 flex-1 rounded-lg bg-forest-800 px-3 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
			onclick={confirm}
			disabled={!canConfirm}
		>
			{copy.confirm}
		</button>
	</div>
</div>
