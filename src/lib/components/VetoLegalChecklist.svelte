<script lang="ts">
	import type { CadastreInfo, CollectStatus } from '$lib/types/cadastre';
	import type { HarvestEthicsConfirmation } from '$lib/types/harvest-ethics';
	import type { MairieContact } from '$lib/types/mairie-contact';
	import { untrack } from 'svelte';
	import LegalArticleCard from '$lib/components/LegalArticleCard.svelte';
	import GeoCapabilityBanner from '$lib/components/GeoCapabilityBanner.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import SpeciesProtectionAlert from '$lib/components/SpeciesProtectionAlert.svelte';
	import VetoChecklistRow from '$lib/components/VetoChecklistRow.svelte';
	import { getRegionalSpeciesHint } from '$lib/constants/veto-legal';
	import { resolveCountry } from '$lib/geo/resolveCountry';
	import { articlesForGroup, getLegalContentPack, isLegalPackReadyForUi } from '$lib/geo/legal';
	import { getUsPermitLinks } from '$lib/geo/legal/usPermitLinks';
	import { getCaPermitLinks } from '$lib/geo/legal/caPermitLinks';
	import { getNzPermitLinks } from '$lib/geo/legal/nzPermitLinks';
	import { getAuPermitLinks } from '$lib/geo/legal/auPermitLinks';
	import { getJpPermitLinks } from '$lib/geo/legal/jpPermitLinks';
	import { scanProtectedAreasForCoords } from '$lib/geo/providers/protected/dispatch';
	import { usZoneCardIds } from '$lib/geo/providers/protected/us';
	import { caZoneCardIds } from '$lib/geo/providers/protected/ca';
	import { nzZoneCardIds } from '$lib/geo/providers/protected/nz';
	import { auZoneCardIds } from '$lib/geo/providers/protected/au';
	import { jpZoneCardIds } from '$lib/geo/providers/protected/jp';
	import { lookupSpeciesProtection } from '$lib/geo/providers/species-protection/dispatch';
	import { lookupMunicipalityNear } from '$lib/geo/providers/municipality/dispatch';
	import { findUsHarvestWindows } from '$lib/geo/usHarvestCalendar';
	import { findCaHarvestWindows } from '$lib/geo/caHarvestCalendar';
	import {
		findNzHarvestWindows,
		formatHarvestWindowMonths
	} from '$lib/geo/nzHarvestCalendar';
	import { findAuHarvestWindows } from '$lib/geo/auHarvestCalendar';
	import {
		findJpHarvestWindows,
		resolveJpHarvestZone
	} from '$lib/geo/jpHarvestCalendar';
	import { BIOTOPE_REGIONS } from '$lib/constants/regions';
	import { getCadastreSummary } from '$lib/utils/cadastre';
	import { protectedAreaScanEffectKey } from '$lib/utils/protectedAreaScanTrigger';
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
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { vetoScanErrorCopy, vetoScanOfflineMissCopy } from '$lib/utils/errorCopy';
	import {
		getProtectedZoneCardClasses,
		getProtectedZoneStatusMessage
	} from '$lib/utils/protectedAreas';
	import type { ProtectedZoneCardId, ProtectedZonePresence } from '$lib/types/harvest-ethics';
	import { canUseApi } from '$lib/utils/apiPolicy';
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
	let scanRetryNonce = $state(0);
	let scanOfflineMiss = $state(false);
	let scan = $state<HarvestEthicsConfirmation['protectedAreaScan']>(null);
	let confirming = $state(false);
	let showLegalResources = $state(false);
	let expandedPillar = $state<
		'property' | 'environment' | 'species' | 'restoration' | 'disclaimer' | null
	>(null);
	const instanceId = $props.id();

	type VetoPillar = 'property' | 'environment' | 'species' | 'restoration' | 'disclaimer';
	type PermitLinkItem = { id: string; label: string; url: string };

	function togglePillar(pillar: VetoPillar): void {
		expandedPillar = expandedPillar === pillar ? null : pillar;
	}
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
	const isAu = $derived(country === 'AU');
	const isJp = $derived(country === 'JP');
	const isGb = $derived(country === 'GB');
	const isBe = $derived(country === 'BE');
	const showMairieContact = $derived(
		!isUs &&
			!isCa &&
			!isNz &&
			!isAu &&
			!isJp &&
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
	const auPermitLinks = $derived(
		isAu
			? getAuPermitLinks({
					zoneType: cadastreInfo.zoneType,
					stateCode: cadastreInfo.stateCode
				})
			: []
	);
	const jpPermitLinks = $derived(
		isJp
			? getJpPermitLinks({
					zoneType: cadastreInfo.zoneType,
					prefectureCode: cadastreInfo.codeInsee || cadastreInfo.section
				})
			: []
	);
	const usZoneCards = $derived(isUs ? usZoneCardIds() : []);
	const caZoneCards = $derived(isCa ? caZoneCardIds() : []);
	const nzZoneCards = $derived(isNz ? nzZoneCardIds() : []);
	const auZoneCards = $derived(isAu ? auZoneCardIds() : []);
	const jpZoneCards = $derived(isJp ? jpZoneCardIds() : []);
	const zoneSkeletonCount = $derived.by(() => {
		const n = isUs
			? usZoneCards.length
			: isCa
				? caZoneCards.length
				: isNz
					? nzZoneCards.length
					: isAu
						? auZoneCards.length
						: isJp
							? jpZoneCards.length
							: 6;
		return n > 0 ? n : 6;
	});
	const zoneSkeletonSlots = $derived(
		Array.from({ length: zoneSkeletonCount }, (_, index) => index)
	);
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
	const auMacroRegion = $derived(
		isAu
			? (BIOTOPE_REGIONS.find(
					(region) =>
						region.macroRegion.startsWith('au_') &&
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
	const auHarvestWindows = $derived(
		isAu ? findAuHarvestWindows(species, auMacroRegion) : []
	);
	const jpHarvestZone = $derived(isJp ? resolveJpHarvestZone(latitude, longitude) : null);
	const jpHarvestWindows = $derived(
		isJp ? findJpHarvestWindows(species, jpHarvestZone) : []
	);
	const collectStatus = $derived(effectiveCollectStatus(cadastreInfo));
	const cadastreViewer = $derived(
		getCadastreViewerLink(country, latitude, longitude, cadastreInfo)
	);
	const euPermitLinks = $derived(
		!isUs && !isCa && !isNz && !isAu && !isJp
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
				if (isUs) return m.veto_guidance_owner_permission_us();
				if (isJp) return m.veto_guidance_owner_permission_jp();
				if (isCa) return m.veto_guidance_owner_permission_ca();
				if (isAu) return m.veto_guidance_owner_permission_au();
				if (isGb) return m.veto_guidance_owner_permission_gb();
				if (isBe) return m.veto_guidance_owner_permission_be();
				return m.veto_guidance_owner_permission();
			default:
				if (isJp) return m.veto_guidance_unknown_jp();
				if (isCa) return m.veto_guidance_unknown_ca();
				if (isAu) return m.veto_guidance_unknown_au();
				return m.veto_guidance_unknown();
		}
	});
	const usPermitLinksTitle = $derived(
		cadastreInfo.zoneType === 'private' ? m.veto_us_owner_next_steps() : m.veto_us_permit_links()
	);
	const isOwnerLookupZone = $derived(
		cadastreInfo.zoneType === 'private' || cadastreInfo.zoneType === 'crown_unverified'
	);
	const caPermitLinksTitle = $derived(
		isOwnerLookupZone ? m.veto_ca_owner_next_steps() : m.veto_ca_permit_links()
	);
	const auPermitLinksTitle = $derived(
		isOwnerLookupZone ? m.veto_au_owner_next_steps() : m.veto_au_permit_links()
	);
	const jpPermitLinksTitle = $derived(
		isOwnerLookupZone ? m.veto_jp_owner_next_steps() : m.veto_jp_permit_links()
	);
	const disclaimerCountryNote = $derived(vetoDisclaimerCountryNote(country));
	const vetoActive = $derived(scan?.veto ?? false);
	const cautionHits = $derived(scan?.hits.filter((hit) => hit.level === 'caution') ?? []);
	const vetoHits = $derived(scan?.hits.filter((hit) => hit.level === 'veto') ?? []);
	const speciesProtectionScan = $derived(lookupSpeciesProtection(species, latitude, longitude));
	const speciesHit = $derived(speciesProtectionScan.hit);
	const speciesVetoActive = $derived(speciesHit?.level === 'veto');
	const protectedScanEffectKey = $derived(
		protectedAreaScanEffectKey(latitude, longitude, canUseApi('ignProtectedAreas'))
	);

	function zonePresence(cardId: ProtectedZoneCardId): ProtectedZonePresence {
		if ((scanLoading && !scan) || scanError) return 'clear';
		return scan?.zoneStatus[cardId] ?? 'clear';
	}

	function zoneCardClasses(cardId: ProtectedZoneCardId): string {
		return getProtectedZoneCardClasses(zonePresence(cardId));
	}

	function zoneStatusAlert(cardId: ProtectedZoneCardId): string | null {
		if ((scanLoading && !scan) || scanError) return null;
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
			case 'wilderness':
				return m.veto_zone_wilderness();
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
			case 'wilderness':
				return m.veto_zone_wilderness_hint();
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

	function auZoneCardTitle(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'capad_national_park':
				return m.veto_zone_capad_national_park();
			case 'capad_conservation':
				return m.veto_zone_capad_conservation();
			case 'wilderness':
				return m.veto_zone_wilderness();
			case 'capad_ipa':
				return m.veto_zone_capad_ipa();
			case 'outside_capad':
				return m.veto_zone_outside_capad();
			default:
				return cardId;
		}
	}

	function auZoneCardHint(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'capad_national_park':
				return m.veto_zone_capad_national_park_hint();
			case 'capad_conservation':
				return m.veto_zone_capad_conservation_hint();
			case 'wilderness':
				return m.veto_zone_wilderness_hint();
			case 'capad_ipa':
				return m.veto_zone_capad_ipa_hint();
			case 'outside_capad':
				return m.veto_zone_outside_capad_hint();
			default:
				return '';
		}
	}

	function jpZoneCardTitle(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'ksj_national_park':
				return m.veto_zone_ksj_national_park();
			case 'ksj_special_zone':
				return m.veto_zone_ksj_special_zone();
			case 'ksj_prefectural_park':
				return m.veto_zone_ksj_prefectural_park();
			case 'outside_ksj':
				return m.veto_zone_outside_ksj();
			default:
				return cardId;
		}
	}

	function jpZoneCardHint(cardId: ProtectedZoneCardId): string {
		switch (cardId) {
			case 'ksj_national_park':
				return m.veto_zone_ksj_national_park_hint();
			case 'ksj_special_zone':
				return m.veto_zone_ksj_special_zone_hint();
			case 'ksj_prefectural_park':
				return m.veto_zone_ksj_prefectural_park_hint();
			case 'outside_ksj':
				return m.veto_zone_outside_ksj_hint();
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

	const legalPackReadyForUi = $derived(isLegalPackReadyForUi(country));
	const propertyArticles = $derived(
		legalPackReadyForUi ? articlesForGroup(legalPack, 'property') : []
	);
	const forestArticles = $derived(legalPackReadyForUi ? articlesForGroup(legalPack, 'forest') : []);
	const environmentArticles = $derived(
		legalPackReadyForUi ? articlesForGroup(legalPack, 'environment') : []
	);

	const canConfirm = $derived(
		checkProperty &&
			checkProtected &&
			checkSpecies &&
			checkRestoration &&
			checkDisclaimer &&
			!vetoActive &&
			!speciesVetoActive &&
			!(scanLoading && !scan) &&
			!confirming
	);

	const checkedCount = $derived(
		Number(checkProperty) +
			Number(checkProtected) +
			Number(checkSpecies) +
			Number(checkRestoration) +
			Number(checkDisclaimer)
	);

	const confirmBlockReason = $derived.by(() => {
		if (vetoActive) return m.veto_confirm_blocked_veto();
		if (speciesVetoActive) return m.veto_confirm_blocked_species();
		if (scanLoading && !scan) return m.veto_scan_loading();
		if (checkedCount < 5) {
			return m.veto_confirm_incomplete({ remaining: String(5 - checkedCount) });
		}
		return null;
	});

	const speciesCheckLabel = $derived(
		speciesHit?.level === 'caution'
			? m.veto_check_species_caution()
			: m.veto_check_species({ source: legalPack.speciesSourceName })
	);

	const propertyIntro = $derived.by(() => {
		if (isAu) return m.veto_property_intro_au();
		if (isJp) return m.veto_property_intro_jp();
		if (isNz) return m.veto_property_intro_nz();
		if (isCa) return m.veto_property_intro_ca();
		if (isUs) return m.veto_property_intro_us();
		if (country === 'FR') return m.veto_property_intro();
		return m.veto_property_intro_generic();
	});

	const speciesExamplesTitle = $derived.by(() => {
		switch (country) {
			case 'ES':
				return m.veto_species_examples_title_es();
			case 'IT':
				return m.veto_species_examples_title_it();
			case 'CH':
				return m.veto_species_examples_title_ch();
			case 'DE':
				return m.veto_species_examples_title_de();
			case 'BE':
				return m.veto_species_examples_title_be();
			case 'PT':
				return m.veto_species_examples_title_pt();
			case 'GB':
				return m.veto_species_examples_title_gb();
			case 'AT':
				return m.veto_species_examples_title_at();
			case 'NL':
				return m.veto_species_examples_title_nl();
			case 'SE':
				return m.veto_species_examples_title_se();
			case 'NO':
				return m.veto_species_examples_title_no();
			case 'DK':
				return m.veto_species_examples_title_dk();
			case 'FI':
				return m.veto_species_examples_title_fi();
			case 'IE':
				return m.veto_species_examples_title_ie();
			case 'US':
				return m.veto_species_examples_title_us();
			case 'CA':
				return m.veto_species_examples_title_ca();
			case 'NZ':
				return m.veto_species_examples_title_nz();
			case 'AU':
				return m.veto_species_examples_title_au();
			case 'JP':
				return m.veto_species_examples_title_jp();
			default:
				return m.veto_species_examples_title();
		}
	});

	const speciesExamplesBody = $derived.by(() => {
		switch (country) {
			case 'ES':
				return m.veto_species_examples_body_es();
			case 'IT':
				return m.veto_species_examples_body_it();
			case 'CH':
				return m.veto_species_examples_body_ch();
			case 'DE':
				return m.veto_species_examples_body_de();
			case 'BE':
				return m.veto_species_examples_body_be();
			case 'PT':
				return m.veto_species_examples_body_pt();
			case 'GB':
				return m.veto_species_examples_body_gb();
			case 'AT':
				return m.veto_species_examples_body_at();
			case 'NL':
				return m.veto_species_examples_body_nl();
			case 'SE':
				return m.veto_species_examples_body_se();
			case 'NO':
				return m.veto_species_examples_body_no();
			case 'DK':
				return m.veto_species_examples_body_dk();
			case 'FI':
				return m.veto_species_examples_body_fi();
			case 'IE':
				return m.veto_species_examples_body_ie();
			case 'US':
				return m.veto_species_examples_body_us();
			case 'CA':
				return m.veto_species_examples_body_ca();
			case 'NZ':
				return m.veto_species_examples_body_nz();
			case 'AU':
				return m.veto_species_examples_body_au();
			case 'JP':
				return m.veto_species_examples_body_jp();
			default:
				return m.veto_species_examples_body();
		}
	});

	$effect(() => {
		if (speciesVetoActive && checkSpecies) {
			checkSpecies = false;
		}
	});

	$effect(() => {
		// Rounded cell + online only — raw GPS jitter must not abort/restart the scan.
		void protectedScanEffectKey;
		void scanRetryNonce;
		const lat = untrack(() => latitude);
		const lon = untrack(() => longitude);
		const online = untrack(() => canUseApi('ignProtectedAreas'));
		const hasScan = untrack(() => scan !== null);
		const controller = new AbortController();
		if (!hasScan) {
			scanLoading = true;
		}
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
		} finally {
			confirming = false;
		}
	}
</script>

<section
	class="app-card mt-3 {usePanelLayout
		? 'veto-checklist--confirmable'
		: 'space-y-4 p-4'}"
	aria-label={m.veto_checklist_title()}
>
	{#snippet permitLinks(title: string, links: PermitLinkItem[])}
		{#if links.length > 0}
			<div
				class="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs leading-relaxed text-sky-950"
			>
				<p class="font-semibold text-forest-900">{title}</p>
				<ul class="mt-2 space-y-1.5">
					{#each links as link (link.id)}
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
	{/snippet}

	{#snippet zoneCard(cardId: ProtectedZoneCardId, title: string, hint: string)}
		<div class="rounded-lg border px-3 py-2 text-xs {zoneCardClasses(cardId)}">
			<p class="font-medium">{title}</p>
			<p class="mt-1 text-[11px]">{hint}</p>
			{#if zoneStatusAlert(cardId)}
				<p class="mt-1.5 text-[11px] font-semibold" role="alert">{zoneStatusAlert(cardId)}</p>
			{/if}
		</div>
	{/snippet}

	{#snippet harvestCalendar(
		title: string,
		emptyText: string,
		windows: { key: string; startMonth: number; endMonth: number; note?: string }[]
	)}
		<div
			class="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs leading-relaxed text-emerald-950"
		>
			<p class="font-medium">{title}</p>
			{#if windows.length > 0}
				<ul class="mt-1.5 space-y-1">
					{#each windows as window (window.key)}
						<li>
							{formatHarvestWindowMonths(window.startMonth, window.endMonth)}
							{#if window.note}
								<span class="text-muted"> — {window.note}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-1 text-muted">{emptyText}</p>
			{/if}
		</div>
	{/snippet}

	<div class={usePanelLayout ? 'veto-checklist__scroll space-y-4' : 'contents'}>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h4 class="text-sm font-semibold text-forest-900">{m.veto_checklist_title()}</h4>
				<p class="mt-1 text-xs text-muted">{getCadastreSummary(cadastreInfo)}</p>
			</div>
			{#if onclose}
				<button
					type="button"
					class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md p-1 text-muted hover:bg-gray-100 hover:text-forest-900"
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
			<p
				class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
				role="status"
			>
				{m.veto_already_confirmed({
					date: new Date(existingConfirmation.confirmedAt).toLocaleString()
				})}
			</p>
		{/if}

		<GeoCapabilityBanner country={country} protectedCoverage={scan?.coverage} />

		<div class="space-y-2">
			<p
				class="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950"
				role="status"
			>
				{collectStatusLabel(collectStatus)}
			</p>

			{#if scanError}
				<ErrorBanner
					copy={scanOfflineMiss ? vetoScanOfflineMissCopy() : vetoScanErrorCopy()}
					tone="warning"
					onretry={() => {
						scanRetryNonce += 1;
					}}
				/>
			{:else if vetoActive}
				<p
					class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900"
					role="alert"
				>
					{m.veto_automatic_block()}
				</p>
				<ul class="space-y-1 text-xs text-red-800">
					{#each vetoHits as hit (hit.id)}
						<li>• {hit.label}</li>
					{/each}
				</ul>
			{:else if scanCoveragePartial}
				<p class="text-xs text-amber-900" role="status">{m.veto_scan_partial_coverage()}</p>
			{/if}

			<SpeciesProtectionAlert hit={speciesHit} coverage={speciesProtectionScan.coverage} />
		</div>

		{#if !onconfirm}
			<p class="text-xs leading-relaxed text-muted">{m.veto_confirm_hint_capture()}</p>
		{/if}

		<div class="space-y-2">
			<VetoChecklistRow
				bind:checked={checkProperty}
				label={propertyCheckLabel}
				pillarTitle={m.veto_pillar_property()}
				expanded={expandedPillar === 'property'}
				detailsId="{instanceId}-property"
				ontoggle={() => togglePillar('property')}
			>
				<p class="text-sm text-forest-900">
					{m.veto_parcel_label({ parcel: parcelLabel, commune: cadastreInfo.commune })}
				</p>
				<p class="text-xs text-muted">{propertyIntro}</p>
				<p class="text-[11px] leading-relaxed text-forest-800">{collectGuidance}</p>
				{#if collectStatus === 'forbidden'}
					<p
						class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950"
						role="status"
					>
						{m.veto_tenure_forbidden_warn()}
					</p>
				{/if}
				<p class="text-[11px] text-muted">{m.cadastre_no_owner_in_app()}</p>
				<div class="flex flex-wrap gap-2">
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
				{@render permitLinks(usPermitLinksTitle, usPermitLinks)}
				{@render permitLinks(caPermitLinksTitle, caPermitLinks)}
				{@render permitLinks(m.veto_nz_permit_links(), nzPermitLinks)}
				{@render permitLinks(auPermitLinksTitle, auPermitLinks)}
				{@render permitLinks(jpPermitLinksTitle, jpPermitLinks)}
				{@render permitLinks(m.veto_eu_permit_links(), euPermitLinks)}
				{#if showMairieContact}
					{#if mairieLoading}
						<p class="text-xs text-muted" role="status">{m.veto_mairie_loading()}</p>
					{:else if mairieContact}
						<div
							class="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs leading-relaxed text-sky-950"
						>
							<p class="font-semibold text-forest-900">{mairieContact.name}</p>
							<p class="mt-1">
								{m.veto_mairie_contact({ name: mairieContact.name, parcel: parcelLabel })}
							</p>
							{#if mairieContact.phoneTel}
								<a
									href={mairieContact.phoneTel}
									class="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest-800 px-3 py-2 font-medium text-white hover:bg-forest-900"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										class="h-4 w-4 shrink-0"
										aria-hidden="true"
									>
										<path
											d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
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
			</VetoChecklistRow>

			<VetoChecklistRow
				bind:checked={checkProtected}
				disabled={vetoActive}
				label={m.veto_check_protected_area()}
				pillarTitle={m.veto_pillar_environment()}
				expanded={expandedPillar === 'environment'}
				detailsId="{instanceId}-environment"
				ontoggle={() => togglePillar('environment')}
			>
				{#if scan?.fromCache}
					<p class="text-xs text-sky-800">{m.veto_scan_cached()}</p>
				{/if}
				{#if (!scanLoading || scan) && !scanError && !vetoActive && cautionHits.length === 0 && !scanCoveragePartial}
					<p class="text-xs text-forest-700">{m.veto_scan_clear()}</p>
				{/if}
				{#if scanLoading && !scan}
					<div
						class="grid gap-2 sm:grid-cols-2"
						role="status"
						aria-busy="true"
						aria-live="polite"
					>
						{#each zoneSkeletonSlots as slot (slot)}
							<Skeleton class="h-[4.25rem] w-full rounded-lg" decorative />
						{/each}
						<p class="sr-only">{m.veto_scan_loading()}</p>
					</div>
				{:else}
					<div class="grid gap-2 sm:grid-cols-2">
						{#if isUs}
							{#each usZoneCards as cardId (cardId)}
								{@render zoneCard(cardId, usZoneCardTitle(cardId), usZoneCardHint(cardId))}
							{/each}
						{:else if isCa}
							{#each caZoneCards as cardId (cardId)}
								{@render zoneCard(cardId, caZoneCardTitle(cardId), caZoneCardHint(cardId))}
							{/each}
						{:else if isNz}
							{#each nzZoneCards as cardId (cardId)}
								{@render zoneCard(cardId, nzZoneCardTitle(cardId), nzZoneCardHint(cardId))}
							{/each}
						{:else if isAu}
							{#each auZoneCards as cardId (cardId)}
								{@render zoneCard(cardId, auZoneCardTitle(cardId), auZoneCardHint(cardId))}
							{/each}
						{:else if isJp}
							{#if scan?.coverage !== 'unsupported'}
								{#each jpZoneCards as cardId (cardId)}
									{@render zoneCard(cardId, jpZoneCardTitle(cardId), jpZoneCardHint(cardId))}
								{/each}
							{:else}
								<div
									class="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-950"
								>
									<p class="font-medium">{m.veto_zone_jp_unsupported()}</p>
									<p class="mt-1 text-[11px]">{m.veto_zone_jp_unsupported_hint()}</p>
								</div>
							{/if}
						{:else}
							{@render zoneCard('pn', m.veto_zone_pn(), m.veto_zone_pn_hint())}
							{@render zoneCard('rnn', m.veto_zone_rnn(), m.veto_zone_rnn_hint())}
							{@render zoneCard('pnr', m.veto_zone_pnr(), m.veto_zone_pnr_hint())}
							{@render zoneCard(
								'rnr_regional',
								m.veto_zone_rnr_regional(),
								m.veto_zone_rnr_regional_hint()
							)}
							{@render zoneCard('natura2000', m.veto_zone_natura2000(), m.veto_zone_natura_hint())}
							{@render zoneCard('znieff', m.veto_zone_znieff(), m.veto_zone_znieff_hint())}
							<div class="sm:col-span-2">
								{@render zoneCard('appb', m.veto_zone_appb(), m.veto_zone_appb_hint())}
								{#if !zoneStatusAlert('appb') && !scanError}
									<p class="mt-1.5 px-3 text-[11px] italic opacity-80">{m.veto_zone_appb_manual()}</p>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
				{#if cautionHits.length > 0}
					<ul class="space-y-1 text-xs text-amber-900">
						{#each cautionHits as hit (hit.id)}
							<li>• {hit.label}</li>
						{/each}
					</ul>
				{/if}
			</VetoChecklistRow>

			<VetoChecklistRow
				bind:checked={checkSpecies}
				disabled={speciesVetoActive}
				label={speciesCheckLabel}
				pillarTitle={m.veto_pillar_species()}
				expanded={expandedPillar === 'species'}
				detailsId="{instanceId}-species"
				ontoggle={() => togglePillar('species')}
			>
				<p class="text-sm text-forest-900">{m.veto_species_label({ species: speciesLabel })}</p>
				{#if speciesVetoActive}
					<p
						class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-950"
						role="alert"
					>
						{m.species_protection_check_blocked()}
					</p>
				{/if}
				{#if isUs}
					{@render harvestCalendar(
						m.us_harvest_calendar_title(),
						m.us_harvest_calendar_none(),
						usHarvestWindows.map((window) => ({
							key: window.species + window.macroRegion,
							startMonth: window.startMonth,
							endMonth: window.endMonth,
							note: window.note
						}))
					)}
				{/if}
				{#if isCa}
					{@render harvestCalendar(
						m.ca_harvest_calendar_title(),
						m.ca_harvest_calendar_none(),
						caHarvestWindows.map((window) => ({
							key: window.species + window.macroRegion,
							startMonth: window.startMonth,
							endMonth: window.endMonth,
							note: window.note
						}))
					)}
				{/if}
				{#if isNz}
					{@render harvestCalendar(
						m.nz_harvest_calendar_title(),
						m.nz_harvest_calendar_none(),
						nzHarvestWindows.map((window) => ({
							key: window.species + window.macroRegion,
							startMonth: window.startMonth,
							endMonth: window.endMonth,
							note: window.note
						}))
					)}
				{/if}
				{#if isAu}
					{@render harvestCalendar(
						m.au_harvest_calendar_title(),
						m.au_harvest_calendar_none(),
						auHarvestWindows.map((window) => ({
							key: window.species + window.macroRegion,
							startMonth: window.startMonth,
							endMonth: window.endMonth,
							note: window.note
						}))
					)}
				{/if}
				{#if isJp}
					{@render harvestCalendar(
						m.jp_harvest_calendar_title(),
						m.jp_harvest_calendar_none(),
						jpHarvestWindows.map((window) => ({
							key: window.species + window.zone,
							startMonth: window.startMonth,
							endMonth: window.endMonth,
							note: window.note
						}))
					)}
				{/if}
				{#if !speciesHit}
					<div
						class="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs leading-relaxed text-emerald-950"
					>
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
					<p
						class="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-950"
					>
						{m.veto_species_regional_pdl()}
					</p>
				{:else}
					<p class="text-xs leading-relaxed text-muted">
						{m.veto_species_regional_generic({ source: legalPack.speciesSourceName })}
					</p>
				{/if}
				<details class="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-forest-800">
					<summary class="cursor-pointer font-medium">{speciesExamplesTitle}</summary>
					<p class="mt-2 leading-relaxed">{speciesExamplesBody}</p>
				</details>
			</VetoChecklistRow>

			<VetoChecklistRow
				bind:checked={checkRestoration}
				label={m.veto_check_restoration()}
				pillarTitle={m.veto_pillar_restoration()}
				expanded={expandedPillar === 'restoration'}
				detailsId="{instanceId}-restoration"
				ontoggle={() => togglePillar('restoration')}
			>
				{@const restoreArticle = forestArticles[0]}
				{#if restoreArticle}
					<LegalArticleCard
						articleId={restoreArticle.id}
						url={restoreArticle.url}
						title={restoreArticle.id.startsWith('jp_') ? undefined : restoreArticle.title}
						text={restoreArticle.id.startsWith('jp_') ? undefined : restoreArticle.summary}
						sourceName={legalPack.sourceName}
					/>
				{/if}
			</VetoChecklistRow>

			<VetoChecklistRow
				bind:checked={checkDisclaimer}
				label={m.veto_check_disclaimer()}
				pillarTitle={m.veto_pillar_disclaimer()}
				expanded={expandedPillar === 'disclaimer'}
				detailsId="{instanceId}-disclaimer"
				ontoggle={() => togglePillar('disclaimer')}
			>
				<p class="text-xs leading-relaxed text-forest-800">{m.legal_aid_disclaimer()}</p>
				<p class="text-xs leading-relaxed text-forest-800">{m.veto_disclaimer_body()}</p>
				<p class="text-xs leading-relaxed text-muted">{disclaimerCountryNote}</p>
			</VetoChecklistRow>
		</div>

		{#if !legalPackReadyForUi}
			<p
				class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950"
				role="status"
			>
				{m.veto_legal_pack_pending_review()}
			</p>
		{/if}

		<details
			class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
			bind:open={showLegalResources}
		>
			<summary class="cursor-pointer text-sm font-medium text-forest-900">
				{m.veto_legal_resources_title()}
			</summary>
			<div class="mt-3 space-y-4">
				{#if legalPackReadyForUi}
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted">
							{m.veto_law_property_heading()}
						</p>
						{#each propertyArticles as article (article.id)}
							<LegalArticleCard
								articleId={article.id}
								url={article.url}
								title={article.id.startsWith('jp_') ? undefined : article.title}
								text={article.id.startsWith('jp_') ? undefined : article.summary}
								sourceName={legalPack.sourceName}
							/>
						{/each}
					</div>
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted">
							{m.veto_law_forest_heading()}
						</p>
						{#each forestArticles as article (article.id)}
							<LegalArticleCard
								articleId={article.id}
								url={article.url}
								title={article.id.startsWith('jp_') ? undefined : article.title}
								text={article.id.startsWith('jp_') ? undefined : article.summary}
								sourceName={legalPack.sourceName}
							/>
						{/each}
					</div>
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted">
							{m.veto_law_env_heading()}
						</p>
						{#each environmentArticles as article (article.id)}
							<LegalArticleCard
								articleId={article.id}
								url={article.url}
								title={article.id.startsWith('jp_') ? undefined : article.title}
								text={article.id.startsWith('jp_') ? undefined : article.summary}
								sourceName={legalPack.sourceName}
							/>
						{/each}
					</div>
				{/if}
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
				{confirming
					? m.action_saving()
					: `${m.veto_confirm_harvest()} · ${m.veto_confirm_progress({ done: String(checkedCount), total: '5' })}`}
			</button>
			{#if !canConfirm && confirmBlockReason}
				<p class="mt-2 text-center text-xs text-muted" role="status">{confirmBlockReason}</p>
			{/if}
		</div>
	{/if}
</section>
