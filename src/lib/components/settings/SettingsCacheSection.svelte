<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { getIntlLocale } from '$lib/utils/i18n/locale';
	import { formatTileCacheSize } from '$lib/utils/map/tileCache';
	import { isNativeApp } from '$lib/utils/platform';
	import * as m from '$lib/paraglide/messages.js';

	let {
		tileCacheCount = null,
		tileCacheBytes = null,
		weatherCacheCount = null,
		cadastreCacheCount = null,
		apiCachesCount = null,
		clearingCache = false,
		clearingWeatherCache = false,
		clearingCadastreCache = false,
		clearingApiCaches = false,
		onClearTileCache,
		onClearWeatherCache,
		onClearCadastreCache,
		onClearApiCaches
	}: {
		tileCacheCount?: number | null;
		tileCacheBytes?: number | null;
		weatherCacheCount?: number | null;
		cadastreCacheCount?: number | null;
		apiCachesCount?: number | null;
		clearingCache?: boolean;
		clearingWeatherCache?: boolean;
		clearingCadastreCache?: boolean;
		clearingApiCaches?: boolean;
		onClearTileCache?: () => void | Promise<void>;
		onClearWeatherCache?: () => void | Promise<void>;
		onClearCadastreCache?: () => void | Promise<void>;
		onClearApiCaches?: () => void | Promise<void>;
	} = $props();

	const intlLocale = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getIntlLocale();
	});
</script>

<section class="flex flex-col gap-3">
	<div>
		<h2 class="text-lg font-semibold text-forest-900">{m.settings_offline_storage()}</h2>
		<p class="mt-1 text-sm text-muted">{m.settings_offline_storage_hint()}</p>
		<p class="mt-2 text-sm text-muted">{m.settings_offline_map_hint()}</p>
		<ul class="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
			<li>{m.settings_offline_tip_1()}</li>
			<li>{m.settings_offline_tip_2()}</li>
			<li>{m.settings_offline_tip_3()}</li>
		</ul>
	</div>

	<div class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
		<div class="px-4 py-3">
			<p class="text-sm font-medium text-forest-900">{m.settings_offline_map()}</p>
			{#if tileCacheCount !== null}
				<p class="mt-1 text-sm text-muted">
					{m.settings_tiles_count({ count: tileCacheCount.toLocaleString(intlLocale) })}
					{#if tileCacheBytes !== null}
						· {formatTileCacheSize(tileCacheBytes)}
					{/if}
				</p>
			{/if}
			{#if isNativeApp() && tileCacheCount !== null && tileCacheCount > 0}
				<button
					type="button"
					onclick={() => void onClearTileCache?.()}
					disabled={clearingCache}
					class="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
				>
					{clearingCache ? m.action_clearing() : m.settings_clear_map_cache()}
				</button>
			{/if}
		</div>

		<div class="px-4 py-3">
			<p class="text-sm font-medium text-forest-900">{m.settings_weather_offline()}</p>
			<p class="mt-0.5 text-xs text-muted">{m.settings_weather_offline_hint()}</p>
			{#if weatherCacheCount !== null}
				<p class="mt-1 text-sm text-muted">
					{weatherCacheCount.toLocaleString(intlLocale)}
					{weatherCacheCount === 1
						? m.settings_forecast_cached_one()
						: m.settings_forecast_cached_many()}
				</p>
			{/if}
			{#if weatherCacheCount !== null && weatherCacheCount > 0}
				<button
					type="button"
					onclick={() => void onClearWeatherCache?.()}
					disabled={clearingWeatherCache}
					class="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
				>
					{clearingWeatherCache ? m.action_clearing() : m.settings_clear_weather_cache()}
				</button>
			{/if}
		</div>

		<div class="px-4 py-3">
			<p class="text-sm font-medium text-forest-900">{m.settings_cadastre_offline()}</p>
			<p class="mt-0.5 text-xs text-muted">{m.settings_cadastre_offline_hint()}</p>
			{#if cadastreCacheCount !== null}
				<p class="mt-1 text-sm text-muted">
					{cadastreCacheCount.toLocaleString(intlLocale)}
					{cadastreCacheCount === 1
						? m.settings_cadastre_cached_one()
						: m.settings_cadastre_cached_many()}
				</p>
			{/if}
			{#if cadastreCacheCount !== null && cadastreCacheCount > 0}
				<button
					type="button"
					onclick={() => void onClearCadastreCache?.()}
					disabled={clearingCadastreCache}
					class="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
				>
					{clearingCadastreCache ? m.action_clearing() : m.settings_clear_cadastre_cache()}
				</button>
			{/if}
		</div>

		<div class="px-4 py-3">
			<p class="text-sm font-medium text-forest-900">{m.settings_api_caches_offline()}</p>
			<p class="mt-0.5 text-xs text-muted">{m.settings_api_caches_offline_hint()}</p>
			{#if apiCachesCount !== null}
				<p class="mt-1 text-sm text-muted">
					{apiCachesCount.toLocaleString(intlLocale)}
				</p>
			{/if}
			{#if apiCachesCount !== null && apiCachesCount > 0}
				<button
					type="button"
					onclick={() => void onClearApiCaches?.()}
					disabled={clearingApiCaches}
					class="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
				>
					{clearingApiCaches ? m.action_clearing() : m.settings_clear_api_caches()}
				</button>
			{/if}
		</div>
	</div>
</section>
