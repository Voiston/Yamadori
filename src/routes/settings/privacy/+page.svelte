<script lang="ts">
	import { base } from '$app/paths';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { onMount, tick } from 'svelte';
	import pkg from '../../../../package.json';

	onMount(async () => {
		await tick();
		document.querySelector('main')?.scrollTo({ top: 0, left: 0 });
	});

	type Pillar = { title: () => string; body: () => string };
	type Section = { title: () => string; pillars: readonly Pillar[] };
	type InventoryRow = { label: () => string; body: () => string };

	const sections: readonly Section[] = [
		{
			title: () => m.privacy_section_device(),
			pillars: [
				{ title: () => m.privacy_pillar_local_title(), body: () => m.privacy_pillar_local_body() },
				{ title: () => m.privacy_pillar_offline_title(), body: () => m.privacy_pillar_offline_body() },
				{ title: () => m.privacy_pillar_backup_title(), body: () => m.privacy_pillar_backup_body() },
				{ title: () => m.privacy_pillar_honest_title(), body: () => m.privacy_pillar_honest_body() },
				{
					title: () => m.privacy_pillar_permissions_title(),
					body: () => m.privacy_pillar_permissions_body()
				}
			]
		},
		{
			title: () => m.privacy_section_online(),
			pillars: [
				{ title: () => m.privacy_pillar_network_title(), body: () => m.privacy_pillar_network_body() },
				{
					title: () => m.privacy_pillar_third_parties_title(),
					body: () => m.privacy_pillar_third_parties_body()
				},
				{
					title: () => m.privacy_pillar_no_tracking_title(),
					body: () => m.privacy_pillar_no_tracking_body()
				}
			]
		},
		{
			title: () => m.privacy_section_control(),
			pillars: [
				{ title: () => m.privacy_pillar_share_title(), body: () => m.privacy_pillar_share_body() },
				{ title: () => m.privacy_pillar_gps_title(), body: () => m.privacy_pillar_gps_body() },
				{
					title: () => m.privacy_pillar_api_controls_title(),
					body: () => m.privacy_pillar_api_controls_body()
				}
			]
		}
	];

	const inventoryRows: readonly InventoryRow[] = [
		{ label: () => m.privacy_data_location_label(), body: () => m.privacy_data_location_body() },
		{ label: () => m.privacy_data_photos_label(), body: () => m.privacy_data_photos_body() },
		{ label: () => m.privacy_data_voice_label(), body: () => m.privacy_data_voice_body() },
		{ label: () => m.privacy_data_weather_label(), body: () => m.privacy_data_weather_body() },
		{ label: () => m.privacy_data_map_label(), body: () => m.privacy_data_map_body() },
		{ label: () => m.privacy_data_cadastre_label(), body: () => m.privacy_data_cadastre_body() }
	];

	let pageTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.title_privacy();
	});

	let heading = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.privacy_heading();
	});

	let intro = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.privacy_intro();
	});

	let inventoryHeading = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.privacy_inventory_heading();
	});

	let inventoryIntro = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.privacy_inventory_intro();
	});

	let outro = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.privacy_outro({ version: pkg.version });
	});

	let backLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.privacy_back_to_settings();
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-lg font-semibold text-forest-900">{heading}</h2>
		<p class="mt-2 text-sm leading-relaxed text-forest-900">{intro}</p>
	</div>

	{#each sections as section, sectionIndex (sectionIndex)}
		<div class="flex flex-col gap-3">
			<h3 class="text-xs font-semibold uppercase tracking-wide text-muted">{section.title()}</h3>
			{#each section.pillars as pillar, pillarIndex (`${sectionIndex}-${pillarIndex}`)}
				<div class="rounded-xl border border-gray-200 bg-white px-4 py-3">
					<h4 class="text-sm font-semibold text-forest-900">{pillar.title()}</h4>
					<p class="mt-1.5 text-sm leading-relaxed text-muted">{pillar.body()}</p>
				</div>
			{/each}
		</div>
	{/each}

	<div class="flex flex-col gap-3">
		<div>
			<h3 class="text-sm font-semibold text-forest-900">{inventoryHeading}</h3>
			<p class="mt-1 text-sm leading-relaxed text-muted">{inventoryIntro}</p>
		</div>
		{#each inventoryRows as row, index (index)}
			<div class="rounded-xl border border-gray-200 bg-white px-4 py-3">
				<h4 class="text-sm font-semibold text-forest-900">{row.label()}</h4>
				<p class="mt-1.5 text-sm leading-relaxed text-muted">{row.body()}</p>
			</div>
		{/each}
	</div>

	<p class="text-center text-xs text-muted">{outro}</p>

	<a
		href="{base}/settings"
		class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-forest-800 transition active:scale-[0.98]"
	>
		{backLabel}
	</a>
</div>
