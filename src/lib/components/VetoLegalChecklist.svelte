<script lang="ts">
	import type { CadastreInfo } from '$lib/types/cadastre';
	import type { HarvestEthicsConfirmation } from '$lib/types/harvest-ethics';
	import LegalArticleCard from '$lib/components/LegalArticleCard.svelte';
	import {
		articlesForGroup,
		buildInpnSpeciesSearchUrl,
		getRegionalSpeciesHint
	} from '$lib/constants/veto-legal';
	import { getCadastreSummary } from '$lib/utils/cadastre';
	import {
		getProtectedZoneCardClasses,
		getProtectedZoneStatusMessage,
		scanProtectedAreas
	} from '$lib/utils/protectedAreas';
	import type { ProtectedZoneCardId, ProtectedZonePresence } from '$lib/types/harvest-ethics';
	import { onlineState } from '$lib/utils/online.svelte';
	import { hapticSuccess } from '$lib/utils/haptics';
	import * as m from '$lib/paraglide/messages.js';

	let {
		cadastreInfo,
		species,
		latitude,
		longitude,
		existingConfirmation = null,
		onconfirm,
		onclose
	}: {
		cadastreInfo: CadastreInfo;
		species: string;
		latitude: number;
		longitude: number;
		existingConfirmation?: HarvestEthicsConfirmation | null;
		onconfirm?: (confirmation: HarvestEthicsConfirmation) => void | Promise<void>;
		onclose?: () => void;
	} = $props();

	let checkProperty = $state(false);
	let checkProtected = $state(false);
	let checkSpecies = $state(false);
	let checkRestoration = $state(false);
	let checkDisclaimer = $state(false);
	let scanLoading = $state(true);
	let scanError = $state(false);
	let scan = $state<HarvestEthicsConfirmation['protectedAreaScan']>(null);
	let confirming = $state(false);
	let showInfoProperty = $state(false);
	let showInfoSpecies = $state(false);
	let showInfoRestoration = $state(false);
	let showLegalResources = $state(false);

	const parcelLabel = $derived(
		m.cadastre_parcel_short({
			section: cadastreInfo.section,
			number: cadastreInfo.parcelNumber
		})
	);
	const speciesLabel = $derived(species.trim() || m.tree_species_unset());
	const inpnUrl = $derived(buildInpnSpeciesSearchUrl(species));
	const regionalHint = $derived(getRegionalSpeciesHint(latitude, longitude));
	const isForestRegime = $derived(
		cadastreInfo.zoneType === 'state_forest' || cadastreInfo.zoneType === 'communal_forest'
	);
	const vetoActive = $derived(scan?.veto ?? false);
	const cautionHits = $derived(scan?.hits.filter((hit) => hit.level === 'caution') ?? []);
	const vetoHits = $derived(scan?.hits.filter((hit) => hit.level === 'veto') ?? []);

	function zonePresence(cardId: ProtectedZoneCardId): ProtectedZonePresence {
		if (scanLoading) return 'clear';
		if (scanError) return cardId === 'appb' ? 'clear' : 'potential';
		return scan?.zoneStatus[cardId] ?? 'clear';
	}

	function zoneCardClasses(cardId: ProtectedZoneCardId): string {
		return getProtectedZoneCardClasses(zonePresence(cardId));
	}

	function zoneStatusAlert(cardId: ProtectedZoneCardId): string | null {
		if (scanLoading || scanError) return null;
		return getProtectedZoneStatusMessage(zonePresence(cardId));
	}

	const propertyArticles = $derived(articlesForGroup('property'));
	const forestArticles = $derived(articlesForGroup('forest'));
	const environmentArticles = $derived(articlesForGroup('environment'));

	const canConfirm = $derived(
		checkProperty &&
			checkProtected &&
			checkSpecies &&
			checkRestoration &&
			checkDisclaimer &&
			!vetoActive &&
			!scanLoading &&
			!confirming
	);

	$effect(() => {
		const lat = latitude;
		const lon = longitude;
		const online = onlineState.online;
		scanLoading = true;
		scanError = false;

		void scanProtectedAreas(lat, lon, { online })
			.then((result) => {
				scan = result;
			})
			.catch(() => {
				scan = null;
				scanError = true;
			})
			.finally(() => {
				scanLoading = false;
			});
	});

	async function handleConfirm() {
		if (!canConfirm) return;
		confirming = true;
		try {
			const confirmation: HarvestEthicsConfirmation = {
				confirmedAt: new Date().toISOString(),
				propertyAuthorization: true,
				notInProtectedArea: true,
				speciesNotProtected: true,
				siteRestoration: true,
				acknowledgedInformationalLimit: true,
				protectedAreaScan: scan
			};
			await onconfirm?.(confirmation);
			hapticSuccess();
		} finally {
			confirming = false;
		}
	}
</script>

<section
	class="mt-3 rounded-xl border border-gray-200 bg-white shadow-sm {onconfirm
		? 'veto-checklist--confirmable'
		: 'space-y-4 p-4'}"
	aria-label={m.veto_checklist_title()}
>
	<div class={onconfirm ? 'veto-checklist__scroll space-y-4' : 'contents'}>
	<div class="flex items-start justify-between gap-3">
		<div>
			<h4 class="text-sm font-semibold text-forest-900">{m.veto_checklist_title()}</h4>
			<p class="mt-1 text-xs text-muted">{getCadastreSummary(cadastreInfo)}</p>
		</div>
		{#if onclose}
			<button
				type="button"
				class="shrink-0 rounded-md p-1 text-muted hover:bg-gray-100 hover:text-forest-900"
				aria-label={m.action_close()}
				onclick={onclose}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="h-4 w-4"
					aria-hidden="true"
				>
					<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
				</svg>
			</button>
		{/if}
	</div>

	{#if existingConfirmation}
		<p class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900" role="status">
			{m.veto_already_confirmed({ date: new Date(existingConfirmation.confirmedAt).toLocaleString() })}
		</p>
	{/if}

	<article class="space-y-3 rounded-lg border border-gray-100 p-3">
		<header class="flex items-start justify-between gap-2">
			<div>
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_pillar_property()}</p>
				<p class="mt-1 text-sm text-forest-900">{m.veto_parcel_label({ parcel: parcelLabel, commune: cadastreInfo.commune })}</p>
				<p class="mt-1 text-xs text-muted">{m.veto_property_intro()}</p>
			</div>
			<button
				type="button"
				class="shrink-0 rounded-full border border-gray-200 p-1.5 text-muted hover:bg-gray-50"
				aria-label={m.veto_info_label()}
				aria-expanded={showInfoProperty}
				onclick={() => (showInfoProperty = !showInfoProperty)}
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
				</svg>
			</button>
		</header>
		{#if showInfoProperty}
			<div class="space-y-2">
				<p class="text-xs font-medium text-forest-800">{m.veto_law_property_heading()}</p>
				{#each propertyArticles as article (article.id)}
					<LegalArticleCard articleId={article.id} url={article.url} />
				{/each}
				{#if isForestRegime}
					{@const l331 = forestArticles.find((a) => a.id === 'cf_l331_2')}
					{#if l331}
						<p class="text-xs font-medium text-forest-800">{m.veto_law_forest_heading()}</p>
						<LegalArticleCard articleId="cf_l331_2" url={l331.url} />
					{/if}
				{/if}
			</div>
		{/if}
		<label class="flex items-start gap-2 text-sm text-forest-900">
			<input type="checkbox" bind:checked={checkProperty} class="mt-0.5" />
			<span>{m.veto_check_property()}</span>
		</label>
	</article>

	<article class="space-y-3 rounded-lg border border-gray-100 p-3">
		<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_pillar_environment()}</p>

		{#if scanLoading}
			<p class="text-xs text-muted">{m.veto_scan_loading()}</p>
		{:else if scanError}
			<p class="text-xs text-amber-800">{m.veto_scan_unavailable()}</p>
		{:else if vetoActive}
			<p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900" role="alert">
				{m.veto_automatic_block()}
			</p>
			<ul class="space-y-1 text-xs text-red-800">
				{#each vetoHits as hit (hit.id)}
					<li>• {hit.label}</li>
				{/each}
			</ul>
		{:else}
			<p class="text-xs text-forest-700">{m.veto_scan_clear()}</p>
		{/if}

		{#if scan?.fromCache}
			<p class="text-xs text-sky-800">{m.veto_scan_cached()}</p>
		{/if}

		<div class="grid gap-2 sm:grid-cols-2">
			<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses('pn')}">
				<p class="font-medium">{m.veto_zone_pn()}</p>
				<p class="mt-1 text-[11px]">{m.veto_zone_pn_hint()}</p>
				{#if zoneStatusAlert('pn')}
					<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert('pn')}</p>
				{/if}
			</div>
			<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses('rnn')}">
				<p class="font-medium">{m.veto_zone_rnn()}</p>
				<p class="mt-1 text-[11px]">{m.veto_zone_rnn_hint()}</p>
				{#if zoneStatusAlert('rnn')}
					<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert('rnn')}</p>
				{/if}
			</div>
			<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses('pnr')}">
				<p class="font-medium">{m.veto_zone_pnr()}</p>
				<p class="mt-1 text-[11px]">{m.veto_zone_pnr_hint()}</p>
				{#if zoneStatusAlert('pnr')}
					<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert('pnr')}</p>
				{/if}
			</div>
			<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses('rnr_regional')}">
				<p class="font-medium">{m.veto_zone_rnr_regional()}</p>
				<p class="mt-1 text-[11px]">{m.veto_zone_rnr_regional_hint()}</p>
				{#if zoneStatusAlert('rnr_regional')}
					<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert('rnr_regional')}</p>
				{/if}
			</div>
			<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses('natura2000')}">
				<p class="font-medium">{m.veto_zone_natura2000()}</p>
				<p class="mt-1 text-[11px]">{m.veto_zone_natura_hint()}</p>
				{#if zoneStatusAlert('natura2000')}
					<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert('natura2000')}</p>
				{/if}
			</div>
			<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses('znieff')}">
				<p class="font-medium">{m.veto_zone_znieff()}</p>
				<p class="mt-1 text-[11px]">{m.veto_zone_znieff_hint()}</p>
				{#if zoneStatusAlert('znieff')}
					<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert('znieff')}</p>
				{/if}
			</div>
			<div class="rounded-lg border px-3 py-2 text-xs sm:col-span-2 {zoneCardClasses('appb')}">
				<p class="font-medium">{m.veto_zone_appb()}</p>
				<p class="mt-1 text-[11px]">{m.veto_zone_appb_hint()}</p>
				{#if zoneStatusAlert('appb')}
					<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert('appb')}</p>
				{:else if !scanLoading && !scanError}
					<p class="mt-1.5 text-[11px] italic opacity-80">{m.veto_zone_appb_manual()}</p>
				{/if}
			</div>
		</div>

		{#if cautionHits.length > 0}
			<ul class="space-y-1 text-xs text-amber-900">
				{#each cautionHits as hit (hit.id)}
					<li>• {hit.label}</li>
				{/each}
			</ul>
		{/if}

		<label class="flex items-start gap-2 text-sm text-forest-900 {vetoActive ? 'opacity-50' : ''}">
			<input type="checkbox" bind:checked={checkProtected} disabled={vetoActive} class="mt-0.5" />
			<span>{m.veto_check_protected_area()}</span>
		</label>
	</article>

	<article class="space-y-3 rounded-lg border border-gray-100 p-3">
		<header class="flex items-start justify-between gap-2">
			<div>
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_pillar_species()}</p>
				<p class="mt-1 text-sm text-forest-900">{m.veto_species_label({ species: speciesLabel })}</p>
			</div>
			<button
				type="button"
				class="shrink-0 rounded-full border border-gray-200 p-1.5 text-muted hover:bg-gray-50"
				aria-label={m.veto_info_label()}
				aria-expanded={showInfoSpecies}
				onclick={() => (showInfoSpecies = !showInfoSpecies)}
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
				</svg>
			</button>
		</header>

		<div class="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs leading-relaxed text-emerald-950">
			<p class="font-medium">{m.veto_species_inpn_title()}</p>
			<p class="mt-1">{m.veto_species_inpn_body()}</p>
			<a
				href={inpnUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 inline-flex font-medium text-forest-800 underline decoration-forest-600/40 underline-offset-2"
			>
				{m.veto_species_inpn_link()}
			</a>
		</div>

		{#if regionalHint === 'pays_de_la_loire'}
			<p class="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-950">
				{m.veto_species_regional_pdl()}
			</p>
		{:else}
			<p class="text-xs leading-relaxed text-muted">{m.veto_species_regional_generic()}</p>
		{/if}

		<details class="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-forest-800">
			<summary class="cursor-pointer font-medium">{m.veto_species_examples_title()}</summary>
			<p class="mt-2 leading-relaxed">{m.veto_species_examples_body()}</p>
		</details>

		{#if showInfoSpecies}
			<div class="space-y-2">
				<p class="text-xs font-medium text-forest-800">{m.veto_law_env_heading()}</p>
				{#each environmentArticles as article (article.id)}
					<LegalArticleCard articleId={article.id} url={article.url} />
				{/each}
			</div>
		{/if}

		<label class="flex items-start gap-2 text-sm text-forest-900">
			<input type="checkbox" bind:checked={checkSpecies} class="mt-0.5" />
			<span>{m.veto_check_species()}</span>
		</label>
	</article>

	<article class="space-y-3 rounded-lg border border-gray-100 p-3">
		<header class="flex items-start justify-between gap-2">
			<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_pillar_restoration()}</p>
			<button
				type="button"
				class="shrink-0 rounded-full border border-gray-200 p-1.5 text-muted hover:bg-gray-50"
				aria-label={m.veto_info_label()}
				aria-expanded={showInfoRestoration}
				onclick={() => (showInfoRestoration = !showInfoRestoration)}
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
				</svg>
			</button>
		</header>
		{#if showInfoRestoration}
			{@const l161 = forestArticles.find((a) => a.id === 'cf_l161_1')}
			{#if l161}
				<LegalArticleCard articleId="cf_l161_1" url={l161.url} />
			{/if}
		{/if}
		<label class="flex items-start gap-2 text-sm text-forest-900">
			<input type="checkbox" bind:checked={checkRestoration} class="mt-0.5" />
			<span>{m.veto_check_restoration()}</span>
		</label>
	</article>

	<article class="space-y-3 rounded-lg border border-gray-100 p-3">
		<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_pillar_disclaimer()}</p>
		<p class="text-xs leading-relaxed text-forest-800">{m.veto_disclaimer_body()}</p>
		<label class="flex items-start gap-2 text-sm text-forest-900">
			<input type="checkbox" bind:checked={checkDisclaimer} class="mt-0.5" />
			<span>{m.veto_check_disclaimer()}</span>
		</label>
	</article>

	<details
		class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
		bind:open={showLegalResources}
	>
		<summary class="cursor-pointer text-sm font-medium text-forest-900">{m.veto_legal_resources_title()}</summary>
		<div class="mt-3 space-y-4">
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_law_property_heading()}</p>
				{#each propertyArticles as article (article.id)}
					<LegalArticleCard articleId={article.id} url={article.url} />
				{/each}
			</div>
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_law_forest_heading()}</p>
				{#each forestArticles as article (article.id)}
					<LegalArticleCard articleId={article.id} url={article.url} />
				{/each}
			</div>
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_law_env_heading()}</p>
				{#each environmentArticles as article (article.id)}
					<LegalArticleCard articleId={article.id} url={article.url} />
				{/each}
			</div>
			<div class="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs text-forest-800">
				<p class="font-medium">{m.veto_species_inpn_title()}</p>
				<p class="mt-1">{m.veto_species_inpn_body()}</p>
				<a
					href={inpnUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="mt-2 inline-flex font-medium underline decoration-forest-600/40 underline-offset-2"
				>
					{m.veto_species_inpn_link()}
				</a>
			</div>
		</div>
	</details>
	</div>

	{#if onconfirm}
		<div class="veto-checklist__footer px-safe">
			<button
				type="button"
				class="w-full rounded-xl px-4 py-3 text-sm font-semibold transition {canConfirm
					? 'bg-forest-800 text-white hover:bg-forest-900'
					: 'cursor-not-allowed bg-gray-200 text-gray-500'}"
				disabled={!canConfirm}
				onclick={handleConfirm}
			>
				{confirming ? m.action_saving() : m.veto_confirm_harvest()}
			</button>
		</div>
	{/if}
</section>
