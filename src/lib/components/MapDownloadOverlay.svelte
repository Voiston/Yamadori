<script lang="ts">
	import { DOWNLOAD_SELECTION_FRACTION } from '$lib/utils/map/tileCache';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		active,
		tileCount,
		downloading,
		progress,
		onCancel,
		onDownload
	}: {
		active: boolean;
		tileCount: number;
		downloading: boolean;
		progress: string;
		onCancel: () => void;
		onDownload: () => void;
	} = $props();

	let downloadLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return downloading
			? progress || m.map_downloading()
			: m.map_download({ count: tileCount });
	});

	let outdoorMode = $derived(appearanceSettingsState.outdoorMode);
	let selectionMaskStyle = $derived(
		outdoorMode
			? 'box-shadow: 0 0 0 9999px #ffffff;'
			: 'box-shadow: 0 0 0 9999px rgba(26, 46, 26, 0.28);'
	);
</script>

{#if active}
	<div class="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
		<div
			class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-dashed {outdoorMode
				? 'border-black'
				: 'border-forest-600'}"
			style="width: {DOWNLOAD_SELECTION_FRACTION * 100}%; height: {DOWNLOAD_SELECTION_FRACTION * 100}%; {selectionMaskStyle}"
		></div>
	</div>

	<div
		class="pointer-events-auto map-download-panel-top absolute inset-x-2 z-30 rounded-xl border border-forest-600/30 bg-white/95 p-3 shadow-lg backdrop-blur-sm md:inset-x-4 md:p-4"
		role="region"
		aria-label={m.map_offline_select()}
	>
		<p class="text-sm font-semibold text-forest-900">{m.map_offline_zone()}</p>
		<p class="mt-1 text-xs leading-relaxed text-muted">
			{m.settings_offline_map_hint()}
		</p>

		<p class="mt-3 text-[11px] leading-snug text-muted">
			{m.settings_offline_tip_3()} · {m.settings_offline_tip_1()}
		</p>

		<div class="mt-4 flex gap-2">
			<button
				type="button"
				class="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-forest-900 transition active:scale-[0.98] disabled:opacity-50"
				onclick={onCancel}
				disabled={downloading}
			>
				{m.action_cancel()}
			</button>
			<button
				type="button"
				class="flex-1 rounded-lg bg-forest-800 px-3 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
				onclick={onDownload}
				disabled={downloading || tileCount === 0}
			>
				{downloadLabel}
			</button>
		</div>
	</div>
{/if}
