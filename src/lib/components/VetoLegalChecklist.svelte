<script lang="ts">
	import type { CadastreInfo, CollectStatus } from '$lib/types/cadastre';
	import type { HarvestEthicsConfirmation } from '$lib/types/harvest-ethics';
	import type { MairieContact } from '$lib/types/mairie-contact';
	import LegalArticleCard from '$lib/components/LegalArticleCard.svelte';
	import GeoCapabilityBanner from '$lib/components/GeoCapabilityBanner.svelte';
	import SpeciesProtectionAlert from '$lib/components/SpeciesProtectionAlert.svelte';
	import { getRegionalSpeciesHint } from '$lib/constants/veto-legal';
	import { resolveCountry } from '$lib/geo/resolveCountry';
	import { articlesForGroup, getLegalContentPack } from '$lib/geo/legal';
	import { getUsPermitLinks } from '$lib/geo/legal/usPermitLinks';
	import { getCaPermitLinks } from '$lib/geo/legal/caPermitLinks';
	import { getNzPermitLinks } from '$lib/geo/legal/nzPermitLinks';
	import { scanProtectedAreasForCoords } from '$lib/geo/providers/protected/dispatch';
	import { usZoneCardIds } from '$lib/geo/providers/protected/us';
	import { caZoneCardIds } from '$lib/geo/providers/protected/ca';
	import { nzZoneCardIds } from '$lib/geo/providers/protected/nz';
	import { lookupSpeciesProtection } from '$lib/geo/providers/species-protection/dispatch';
	import { lookupMunicipalityNear } from '$lib/geo/providers/municipality/dispatch';
	import { findUsHarvestWindows } from '$lib/geo/usHarvestCalendar';
	import { findCaHarvestWindows } from '$lib/geo/caHarvestCalendar';
	import {
		findNzHarvestWindows,
		formatHarvestWindowMonths
	} from '$lib/geo/nzHarvestCalendar';
	import { BIOTOPE_REGIONS } from '$lib/constants/regions';
	import { getCadastreSummary } from '$lib/utils/cadastre';
	import {
		buildCadastreRefsText,
		effectiveCollectStatus
	} from '$lib/utils/cadastreRefs';
	import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
	import { getEuPermitLinks } from '$lib/geo/legal/euPermitLinks';
	import { vetoDisclaimerCountryNote } from '$lib/geo/legal/vetoDisclaimerNote';
	import { copyText } from '$lib/utils/clipboard';
	import { shareCadastreRefs } from '$lib/utils/share';
	import { showAppToast } from '$lib/stores/appToast.svelte';
	import {
		getProtectedZoneCardClasses,
		getProtectedZoneStatusMessage
	} from '$lib/utils/protectedAreas';
	import type { ProtectedZoneCardId, ProtectedZonePresence } from '$lib/types/harvest-ethics';
	import { canUseApi } from '$lib/utils/apiPolicy';
	import { hapticSuccess } from '$lib/utils/haptics';
	import * as m from '$lib/paraglide/messages.js';

	let {
		cadastreInfo,
		species,
		latitude,
		longitude,
		existingConfirmation = null,
		scrollable = false,
		onconfirm,
		onclose
	}: {
		cadastreInfo: CadastreInfo;
		species: string;
		latitude: number;
		longitude: number;
		existingConfirmation?: HarvestEthicsConfirmation | null;
		scrollable?: boolean;
		onconfirm?: (confirmation: HarvestEthicsConfirmation) => void | Promise<void>;
		onclose?: () => void;
	} = $props();

	const usePanelLayout = $derived(Boolean(onconfirm || scrollable));

	let checkProperty = $state(false);
	let checkProtected = $state(false);
	let checkSpecies = $state(false);
	let checkRestoration = $state(false);
	let checkDisclaimer = $state(false);
	let scanLoading = $state(true);
	let scanError = $state(false);
	let scanOfflineMiss = $state(false);
	let scan = $state<HarvestEthicsConfirmation['protectedAreaScan']>(null);
	let confirming = $state(false);
	let showInfoProperty = $state(false);
	let showInfoSpecies = $state(false);
	let showInfoRestoration = $state(false);
	let showLegalResources = $state(false);
	let mairieLoading = $state(false);
	let mairieContact = $state<MairieContact | null>(null);
	let mairieUnavailable = $state(false);

	const parcelLabel = $derived(
		m.cadastre_parcel_short({
			section: cadastreInfo.section,
			number: cadastreInfo.parcelNumber
		})
	);
	const country = $derived(resolveCountry(latitude, longitude));
	const legalPack = $derived(getLegalContentPack(country));
	const speciesLabel = $derived(species.trim() || m.tree_species_unset());
	const scanCoveragePartial = $derived(
		scan?.coverage === 'partial' || scan?.coverage === 'unsupported'
	);
	const inpnUrl = $derived(legalPack.buildSpeciesSearchUrl(species));
	const regionalHint = $derived(getRegionalSpeciesHint(latitude, longitude));
	const isUs = $derived(country === 'US');
	const isCa = $derived(country === 'CA');
	const isNz = $derived(country === 'NZ');
	const isForestRegime = $derived(
		isCa || isNz
			? cadastreInfo.zoneType === 'crown_unverified' ||
					cadastreInfo.zoneType === 'other_federal'
			: cadastreInfo.zoneType === 'state_forest' ||
					cadastreInfo.zoneType === 'communal_forest' ||
					cadastreInfo.zoneType === 'national_forest' ||
					cadastreInfo.zoneType === 'blm'
	);
	const showMairieContact = $derived(
		!isUs &&
			!isCa &&
			!isNz &&
			(cadastreInfo.zoneType === 'private' || cadastreInfo.zoneType === 'communal_forest')
	);
	const usPermitLinks = $derived(
		isUs
			? getUsPermitLinks({
					zoneType: cadastreInfo.zoneType,
					stateCode: cadastreInfo.stateCode
				})
			: []
	);
	const caPermitLinks = $derived(
		isCa
			? getCaPermitLinks({
					zoneType: cadastreInfo.zoneType,
					provinceCode: cadastreInfo.stateCode
				})
			: []
	);
	const nzPermitLinks = $derived(
		isNz
			? getNzPermitLinks({
					zoneType: cadastreInfo.zoneType
				})
			: []
	);
	const usZoneCards = $derived(isUs ? usZoneCardIds() : []);
	const caZoneCards = $derived(isCa ? caZoneCardIds() : []);
	const nzZoneCards = $derived(isNz ? nzZoneCardIds() : []);
	const usMacroRegion = $derived(
		isUs
			? (BIOTOPE_REGIONS.find(
					(region) =>
						region.macroRegion.startsWith('us_') &&
						latitude >= region.bbox.south &&
						latitude <= region.bbox.north &&
						longitude >= region.bbox.west &&
						longitude <= region.bbox.east
				)?.macroRegion ?? null)
			: null
	);
	const caMacroRegion = $derived(
		isCa
			? (BIOTOPE_REGIONS.find(
					(region) =>
						region.macroRegion.startsWith('ca_') &&
						latitude >= region.bbox.south &&
						latitude <= region.bbox.north &&
						longitude >= region.bbox.west &&
						longitude <= region.bbox.east
				)?.macroRegion ?? null)
			: null
	);
	const nzMacroRegion = $derived(
		isNz
			? (BIOTOPE_REGIONS.find(
					(region) =>
						region.macroRegion.startsWith('nz_') &&
						latitude >= region.bbox.south &&
						latitude <= region.bbox.north &&
						longitude >= region.bbox.west &&
						longitude <= region.bbox.east
				)?.macroRegion ?? null)
			: null
	);
	const usHarvestWindows = $derived(
		isUs ? findUsHarvestWindows(species, usMacroRegion) : []
	);
	const caHarvestWindows = $derived(
		isCa ? findCaHarvestWindows(species, caMacroRegion) : []
	);
	const nzHarvestWindows = $derived(
		isNz ? findNzHarvestWindows(species, nzMacroRegion) : []
	);
	const collectStatus = $derived(effectiveCollectStatus(cadastreInfo));
	const cadastreViewer = $derived(
		getCadastreViewerLink(country, latitude, longitude, cadastreInfo)
	);
	const euPermitLinks = $derived(
		!isUs && !isCa && !isNz
			? getEuPermitLinks(country, cadastreInfo.zoneType, {
					latitude,
					longitude,
					stateHint: cadastreInfo.stateCode ?? cadastreInfo.section,
					commune: cadastreInfo.commune
				})
			: []
	);
	const propertyCheckLabel = $derived.by(() => {
		switch (collectStatus) {
			case 'owner_permission':
				return m.veto_check_property_owner();
			case 'permit_required':
				return m.veto_check_property_permit();
			case 'forbidden':
			case 'forbidden_or_agency':
				return m.veto_check_property_forbidden();
			default:
				return m.veto_check_property();
		}
	});
	const collectGuidance = $derived.by(() => {
		switch (collectStatus) {
			case 'forbidden':
				return m.veto_guidance_forbidden();
			case 'permit_required':
				return m.veto_guidance_permit_required();
			case 'forbidden_or_agency':
				return m.veto_guidance_forbidden_or_agency();
			case 'owner_permission':
				return m.veto_guidance_owner_permission();
			default:
				return m.veto_guidance_unknown();
		}
	});
	const disclaimerCountryNote = $derived(vetoDisclaimerCountryNote(country));
	const vetoActive = $derived(scan?.veto ?? false);
	const cautionHits = $derived(scan?.hits.filter((hit) => hit.level === 'caution') ?? []);
	const vetoHits = $derived(scan?.hits.filter((hit) => hit.level === 'veto') ?? []);
	const speciesProtectionScan = $derived(lookupSpeciesProtection(species, latitude, longitude));
	const speciesHit = $derived(speciesProtectionScan.hit);
	const speciesVetoActive = $derived(speciesHit?.level === 'veto');

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

	function usZoneCardTitle(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'nps':
				return m.veto_zone_nps();
			case 'wilderness':
				return m.veto_zone_wilderness();
			case 'usfs':
				return m.veto_zone_usfs();
			case 'blm':
				return m.veto_zone_blm();
			case 'state_park':
				return m.veto_zone_state_park();
			case 'tribal':
				return m.veto_zone_tribal();
			default:
				return cardId;
		}
	}

	function usZoneCardHint(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'nps':
				return m.veto_zone_nps_hint();
			case 'wilderness':
				return m.veto_zone_wilderness_hint();
			case 'usfs':
				return m.veto_zone_usfs_hint();
			case 'blm':
				return m.veto_zone_blm_hint();
			case 'state_park':
				return m.veto_zone_state_park_hint();
			case 'tribal':
				return m.veto_zone_tribal_hint();
			default:
				return '';
		}
	}

	function caZoneCardTitle(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'parks_canada':
				return m.veto_zone_parks_canada();
			case 'provincial_park':
				return m.veto_zone_provincial_park();
			case 'nwa':
				return m.veto_zone_nwa();
			case 'ipca':
				return m.veto_zone_ipca();
			case 'crown_unverified':
				return m.veto_zone_crown_unverified();
			default:
				return cardId;
		}
	}

	function caZoneCardHint(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'parks_canada':
				return m.veto_zone_parks_canada_hint();
			case 'provincial_park':
				return m.veto_zone_provincial_park_hint();
			case 'nwa':
				return m.veto_zone_nwa_hint();
			case 'ipca':
				return m.veto_zone_ipca_hint();
			case 'crown_unverified':
				return m.veto_zone_crown_unverified_hint();
			default:
				return '';
		}
	}

	function nzZoneCardTitle(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'doc_national_park':
				return m.veto_zone_doc_national_park();
			case 'doc_conservation':
				return m.veto_zone_doc_conservation();
			case 'wilderness':
				return m.veto_zone_wilderness();
			case 'whenua_rahui':
				return m.veto_zone_whenua_rahui();
			case 'outside_pcl':
				return m.veto_zone_outside_pcl();
			default:
				return cardId;
		}
	}

	function nzZoneCardHint(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'doc_national_park':
				return m.veto_zone_doc_national_park_hint();
			case 'doc_conservation':
				return m.veto_zone_doc_conservation_hint();
			case 'wilderness':
				return m.veto_zone_wilderness_hint();
			case 'whenua_rahui':
				return m.veto_zone_whenua_rahui_hint();
			case 'outside_pcl':
				return m.veto_zone_outside_pcl_hint();
			default:
				return '';
		}
	}

	function collectStatusLabel(status: CollectStatus): string {
		switch (status) {
			case 'forbidden':
				return m.collect_status_forbidden();
			case 'permit_required':
				return m.collect_status_permit_required();
			case 'forbidden_or_agency':
				return m.collect_status_forbidden_or_agency();
			case 'owner_permission':
				return m.collect_status_owner_permission();
			default:
				return m.collect_status_unknown();
		}
	}

	async function copyParcelRefs(): Promise<void> {
		const ok = await copyText(buildCadastreRefsText(cadastreInfo, latitude, longitude, country));
		showAppToast(ok ? 'ok' : 'error', ok ? m.feedback_refs_copied() : m.feedback_refs_copy_failed());
	}

	async function shareParcelRefs(): Promise<void> {
		const result = await shareCadastreRefs(cadastreInfo, latitude, longitude, country);
		if (result === 'shared' || result === 'copied') {
			showAppToast('ok', result === 'shared' ? m.feedback_refs_shared() : m.feedback_refs_copied());
		} else {
			showAppToast('error', m.feedback_refs_copy_failed());
		}
	}

	const propertyArticles = $derived(articlesForGroup(legalPack, 'property'));
	const forestArticles = $derived(articlesForGroup(legalPack, 'forest'));
	const environmentArticles = $derived(articlesForGroup(legalPack, 'environment'));

	const canConfirm = $derived(
		checkProperty &&
			checkProtected &&
			checkSpecies &&
			checkRestoration &&
			checkDisclaimer &&
			!vetoActive &&
			!speciesVetoActive &&
			!scanLoading &&
			!confirming
	);

	$effect(() => {
		if (speciesVetoActive && checkSpecies) {
			checkSpecies = false;
		}
	});

	$effect(() => {
		const lat = latitude;
		const lon = longitude;
		const online = canUseApi('ignProtectedAreas');
		const controller = new AbortController();
		scanLoading = true;
		scanError = false;
		scanOfflineMiss = false;

		const timer = setTimeout(() => {
			void scanProtectedAreasForCoords(lat, lon, { online, signal: controller.signal })
				.then((result) => {
					if (controller.signal.aborted) return;
					scan = result;
				})
				.catch((err: unknown) => {
					if (controller.signal.aborted) return;
					scan = null;
					scanError = true;
					const message = err instanceof Error ? err.message : String(err);
					scanOfflineMiss = message.includes('offline_cache_miss');
				})
				.finally(() => {
					if (!controller.signal.aborted) {
						scanLoading = false;
					}
				});
		}, 350);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	$effect(() => {
		const codeInsee = cadastreInfo.codeInsee;
		const commune = cadastreInfo.commune.trim();
		const lat = latitude;
		const lon = longitude;
		const country = resolveCountry(lat, lon);
		const lookupKey =
			country === 'FR' ? codeInsee.trim() : commune || codeInsee.trim();
		const mairieApiOk =
			country === 'FR' ? canUseApi('servicePublicAnnuaire') : canUseApi('nominatim');
		const shouldLookup = showMairieContact && Boolean(lookupKey) && mairieApiOk;

		if (!showMairieContact) {
			mairieLoading = false;
			mairieContact = null;
			mairieUnavailable = false;
			return;
		}

		if (!shouldLookup) {
			mairieLoading = false;
			mairieContact = null;
			mairieUnavailable = true;
			return;
		}

		const controller = new AbortController();
		mairieLoading = true;
		mairieUnavailable = false;
		mairieContact = null;

		const timer = setTimeout(() => {
			void lookupMunicipalityNear(lat, lon, lookupKey, { signal: controller.signal })
				.then((contact) => {
					if (controller.signal.aborted) return;
					mairieContact = contact;
					mairieUnavailable = !contact;
				})
				.catch(() => {
					if (controller.signal.aborted) return;
					mairieContact = null;
					mairieUnavailable = true;
				})
				.finally(() => {
					if (!controller.signal.aborted) {
						mairieLoading = false;
					}
				});
		}, 350);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	async function handleConfirm() {
		if (!canConfirm) return;
		confirming = true;
		try {
			const confirmation: HarvestEthicsConfirmation = {
				confirmedAt: new Date().toISOString(),
				propertyAuthorization: true,
				notInProtectedArea: true,
				speciesNotProtected: !speciesVetoActive && checkSpecies,
				siteRestoration: true,
				acknowledgedInformationalLimit: true,
				protectedAreaScan: scan,
				speciesProtectionScan: {
					scannedAt: speciesProtectionScan.scannedAt,
					country: speciesProtectionScan.country,
					hit: speciesHit
						? {
								id: speciesHit.id,
								label: speciesHit.label,
								matchedName: speciesHit.matchedName,
								level: speciesHit.level,
								scope: speciesHit.scope,
								sourceName: speciesHit.sourceName,
								sourceUrl: speciesHit.sourceUrl
							}
						: null,
					coverage: speciesProtectionScan.coverage
				}
			};
			await onconfirm?.(confirmation);
			hapticSuccess();
		} finally {
			confirming = false;
		}
	}
</script>

<section
	class="mt-3 rounded-xl border border-gray-200 bg-white shadow-sm {usePanelLayout
		? 'veto-checklist--confirmable'
		: 'space-y-4 p-4'}"
	aria-label={m.veto_checklist_title()}
>
	<div class={usePanelLayout ? 'veto-checklist__scroll space-y-4' : 'contents'}>
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

	<GeoCapabilityBanner country={country} protectedCoverage={scan?.coverage} />

	<article class="space-y-3 rounded-lg border border-gray-100 p-3">
		<header class="flex items-start justify-between gap-2">
			<div>
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_pillar_property()}</p>
				<p class="mt-1 text-sm text-forest-900">{m.veto_parcel_label({ parcel: parcelLabel, commune: cadastreInfo.commune })}</p>
				<p class="mt-1 text-xs text-muted">
					{isNz
						? m.veto_property_intro_nz()
						: isCa
							? m.veto_property_intro_ca()
							: isUs
								? m.veto_property_intro_us()
								: country === 'FR'
									? m.veto_property_intro()
									: m.veto_property_intro_generic()}
				</p>
				<p
					class="mt-1.5 inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950"
					role="status"
				>
					{collectStatusLabel(collectStatus)}
				</p>
				<p class="mt-1.5 text-[11px] leading-relaxed text-forest-800">{collectGuidance}</p>
				{#if collectStatus === 'forbidden'}
					<p
						class="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950"
						role="status"
					>
						{m.veto_tenure_forbidden_warn()}
					</p>
				{/if}
				<p class="mt-1 text-[11px] text-muted">{m.cadastre_no_owner_in_app()}</p>
				<div class="mt-2 flex flex-wrap gap-2">
					<button
						type="button"
						class="inline-flex min-h-10 items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-forest-900 hover:bg-gray-50"
						onclick={() => void copyParcelRefs()}
					>
						{m.cadastre_copy_refs()}
					</button>
					<button
						type="button"
						class="inline-flex min-h-10 items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-forest-900 hover:bg-gray-50"
						onclick={() => void shareParcelRefs()}
					>
						{m.cadastre_share_refs()}
					</button>
					{#if cadastreViewer}
						<a
							href={cadastreViewer.url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex min-h-10 items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-950 hover:bg-sky-100"
						>
							{m.cadastre_open_viewer({ label: cadastreViewer.label })}
						</a>
					{/if}
				</div>
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
		{#if isUs && usPermitLinks.length > 0}
			<div class="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs leading-relaxed text-sky-950">
				<p class="font-semibold text-forest-900">{m.veto_us_permit_links()}</p>
				<ul class="mt-2 space-y-1.5">
					{#each usPermitLinks as link (link.id)}
						<li>
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="font-medium text-forest-800 underline decoration-forest-600/40 underline-offset-2"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if isCa && caPermitLinks.length > 0}
			<div class="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs leading-relaxed text-sky-950">
				<p class="font-semibold text-forest-900">{m.veto_ca_permit_links()}</p>
				<ul class="mt-2 space-y-1.5">
					{#each caPermitLinks as link (link.id)}
						<li>
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="font-medium text-forest-800 underline decoration-forest-600/40 underline-offset-2"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if isNz && nzPermitLinks.length > 0}
			<div class="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs leading-relaxed text-sky-950">
				<p class="font-semibold text-forest-900">{m.veto_nz_permit_links()}</p>
				<ul class="mt-2 space-y-1.5">
					{#each nzPermitLinks as link (link.id)}
						<li>
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="font-medium text-forest-800 underline decoration-forest-600/40 underline-offset-2"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if euPermitLinks.length > 0}
			<div class="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs leading-relaxed text-sky-950">
				<p class="font-semibold text-forest-900">{m.veto_eu_permit_links()}</p>
				<ul class="mt-2 space-y-1.5">
					{#each euPermitLinks as link (link.id)}
						<li>
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="font-medium text-forest-800 underline decoration-forest-600/40 underline-offset-2"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if showMairieContact}
			{#if mairieLoading}
				<p class="text-xs text-muted" role="status">{m.veto_mairie_loading()}</p>
			{:else if mairieContact}
				<div class="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs leading-relaxed text-sky-950">
					<p class="font-semibold text-forest-900">{mairieContact.name}</p>
					<p class="mt-1">
						{m.veto_mairie_contact({ name: mairieContact.name, parcel: parcelLabel })}
					</p>
					{#if mairieContact.phoneTel}
						<a
							href={mairieContact.phoneTel}
							class="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest-800 px-3 py-2 font-medium text-white hover:bg-forest-900"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 shrink-0" aria-hidden="true">
								<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							<span>{mairieContact.phoneDisplay} — {m.veto_mairie_call()}</span>
						</a>
					{/if}
					{#if mairieContact.website}
						<a
							href={mairieContact.website}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-2 inline-flex font-medium text-forest-800 underline decoration-forest-600/40 underline-offset-2"
						>
							{m.veto_mairie_website()}
						</a>
					{/if}
				</div>
			{:else if mairieUnavailable}
				<p class="text-xs text-amber-900" role="status">
					{m.veto_mairie_unavailable({ commune: cadastreInfo.commune })}
				</p>
			{/if}
		{/if}
		{#if showInfoProperty}
			<div class="space-y-2">
				<p class="text-xs font-medium text-forest-800">{m.veto_law_property_heading()}</p>
				{#each propertyArticles as article (article.id)}
					<LegalArticleCard
						articleId={article.id}
						url={article.url}
						title={article.title}
						text={article.summary}
						sourceName={legalPack.sourceName}
					/>
				{/each}
				{#if isForestRegime}
					{@const forestArticle = forestArticles[0]}
					{#if forestArticle}
						<p class="text-xs font-medium text-forest-800">{m.veto_law_forest_heading()}</p>
						<LegalArticleCard
							articleId={forestArticle.id}
							url={forestArticle.url}
							title={forestArticle.title}
							text={forestArticle.summary}
							sourceName={legalPack.sourceName}
						/>
					{/if}
				{/if}
			</div>
		{/if}
		<label class="flex items-start gap-2 text-sm text-forest-900">
			<input type="checkbox" bind:checked={checkProperty} class="mt-0.5" />
			<span>{propertyCheckLabel}</span>
		</label>
	</article>

	<article class="space-y-3 rounded-lg border border-gray-100 p-3">
		<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_pillar_environment()}</p>

		{#if scanLoading}
			<p class="text-xs text-muted">{m.veto_scan_loading()}</p>
		{:else if scanError}
			<p class="text-xs text-amber-800">
				{scanOfflineMiss ? m.veto_scan_offline_miss() : m.veto_scan_unavailable()}
			</p>
		{:else if vetoActive}
			<p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900" role="alert">
				{m.veto_automatic_block()}
			</p>
			<ul class="space-y-1 text-xs text-red-800">
				{#each vetoHits as hit (hit.id)}
					<li>• {hit.label}</li>
				{/each}
			</ul>
		{:else if scanCoveragePartial}
			<p class="text-xs text-amber-900">{m.veto_scan_partial_coverage()}</p>
		{:else}
			<p class="text-xs text-forest-700">{m.veto_scan_clear()}</p>
		{/if}

		{#if scan?.fromCache}
			<p class="text-xs text-sky-800">{m.veto_scan_cached()}</p>
		{/if}

		<div class="grid gap-2 sm:grid-cols-2">
			{#if isUs}
				{#each usZoneCards as cardId (cardId)}
					<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses(cardId)}">
						<p class="font-medium">{usZoneCardTitle(cardId)}</p>
						<p class="mt-1 text-[11px]">{usZoneCardHint(cardId)}</p>
						{#if zoneStatusAlert(cardId)}
							<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert(cardId)}</p>
						{/if}
					</div>
				{/each}
			{:else if isCa}
				{#each caZoneCards as cardId (cardId)}
					<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses(cardId)}">
						<p class="font-medium">{caZoneCardTitle(cardId)}</p>
						<p class="mt-1 text-[11px]">{caZoneCardHint(cardId)}</p>
						{#if zoneStatusAlert(cardId)}
							<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert(cardId)}</p>
						{/if}
					</div>
				{/each}
			{:else if isNz}
				{#each nzZoneCards as cardId (cardId)}
					<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses(cardId)}">
						<p class="font-medium">{nzZoneCardTitle(cardId)}</p>
						<p class="mt-1 text-[11px]">{nzZoneCardHint(cardId)}</p>
						{#if zoneStatusAlert(cardId)}
							<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert(cardId)}</p>
						{/if}
					</div>
				{/each}
			{:else}
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
			{/if}
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

		<SpeciesProtectionAlert hit={speciesHit} coverage={speciesProtectionScan.coverage} />

		{#if isUs}
			<div class="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs leading-relaxed text-emerald-950">
				<p class="font-medium">{m.us_harvest_calendar_title()}</p>
				{#if usHarvestWindows.length > 0}
					<ul class="mt-1.5 space-y-1">
						{#each usHarvestWindows as window (window.species + window.macroRegion)}
							<li>
								{formatHarvestWindowMonths(window.startMonth, window.endMonth)}
								{#if window.note}
									<span class="text-muted"> — {window.note}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-1 text-muted">{m.us_harvest_calendar_none()}</p>
				{/if}
			</div>
		{/if}

		{#if isCa}
			<div class="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs leading-relaxed text-emerald-950">
				<p class="font-medium">{m.ca_harvest_calendar_title()}</p>
				{#if caHarvestWindows.length > 0}
					<ul class="mt-1.5 space-y-1">
						{#each caHarvestWindows as window (window.species + window.macroRegion)}
							<li>
								{formatHarvestWindowMonths(window.startMonth, window.endMonth)}
								{#if window.note}
									<span class="text-muted"> — {window.note}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-1 text-muted">{m.ca_harvest_calendar_none()}</p>
				{/if}
			</div>
		{/if}

		{#if isNz}
			<div class="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs leading-relaxed text-emerald-950">
				<p class="font-medium">{m.nz_harvest_calendar_title()}</p>
				{#if nzHarvestWindows.length > 0}
					<ul class="mt-1.5 space-y-1">
						{#each nzHarvestWindows as window (window.species + window.macroRegion)}
							<li>
								{formatHarvestWindowMonths(window.startMonth, window.endMonth)}
								{#if window.note}
									<span class="text-muted"> — {window.note}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-1 text-muted">{m.nz_harvest_calendar_none()}</p>
				{/if}
			</div>
		{/if}

		{#if !speciesHit}
			<div class="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs leading-relaxed text-emerald-950">
				<p class="font-medium">{m.veto_species_inpn_title()}</p>
				<p class="mt-1">{m.veto_species_inpn_body({ source: legalPack.speciesSourceName })}</p>
				<a
					href={inpnUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="mt-2 inline-flex font-medium text-forest-800 underline decoration-forest-600/40 underline-offset-2"
				>
					{m.veto_species_inpn_link({ source: legalPack.speciesSourceName })}
				</a>
			</div>
		{/if}

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
					<LegalArticleCard
						articleId={article.id}
						url={article.url}
						title={article.title}
						text={article.summary}
						sourceName={legalPack.sourceName}
					/>
				{/each}
			</div>
		{/if}

		{#if speciesVetoActive}
			<p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-950" role="alert">
				{m.species_protection_check_blocked()}
			</p>
		{:else}
			<label class="flex items-start gap-2 text-sm text-forest-900">
				<input type="checkbox" bind:checked={checkSpecies} class="mt-0.5" />
				<span>
					{speciesHit?.level === 'caution'
						? m.veto_check_species_caution()
						: m.veto_check_species()}
				</span>
			</label>
		{/if}
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
			{@const restoreArticle = forestArticles[0]}
			{#if restoreArticle}
				<LegalArticleCard
					articleId={restoreArticle.id}
					url={restoreArticle.url}
					title={restoreArticle.title}
					text={restoreArticle.summary}
					sourceName={legalPack.sourceName}
				/>
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
		<p class="text-xs leading-relaxed text-muted">
			{disclaimerCountryNote}
		</p>
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
					<LegalArticleCard
						articleId={article.id}
						url={article.url}
						title={article.title}
						text={article.summary}
						sourceName={legalPack.sourceName}
					/>
				{/each}
			</div>
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_law_forest_heading()}</p>
				{#each forestArticles as article (article.id)}
					<LegalArticleCard
						articleId={article.id}
						url={article.url}
						title={article.title}
						text={article.summary}
						sourceName={legalPack.sourceName}
					/>
				{/each}
			</div>
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.veto_law_env_heading()}</p>
				{#each environmentArticles as article (article.id)}
					<LegalArticleCard
						articleId={article.id}
						url={article.url}
						title={article.title}
						text={article.summary}
						sourceName={legalPack.sourceName}
					/>
				{/each}
			</div>
			<div class="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs text-forest-800">
				<p class="font-medium">{m.veto_species_inpn_title()}</p>
				<p class="mt-1">{m.veto_species_inpn_body({ source: legalPack.speciesSourceName })}</p>
				<a
					href={inpnUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="mt-2 inline-flex font-medium underline decoration-forest-600/40 underline-offset-2"
				>
					{m.veto_species_inpn_link({ source: legalPack.speciesSourceName })}
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
