<script lang="ts">
	import { base, resolve } from '$app/paths';
	import { page } from '$app/state';
	import AddVisitForm from '$lib/components/AddVisitForm.svelte';
	import ClimateDataSectionLazy from '$lib/components/ClimateDataSectionLazy.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import EnvironmentExposureField from '$lib/components/EnvironmentExposureField.svelte';
	import PhotoGallery from '$lib/components/PhotoGallery.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import TreeAssessmentPanel from '$lib/components/TreeAssessmentPanel.svelte';
	import TreeDetailActions from '$lib/components/TreeDetailActions.svelte';
	import VisitTimeline from '$lib/components/VisitTimeline.svelte';
	import RevisitReminderCard from '$lib/components/RevisitReminderCard.svelte';
	import VoiceNotePlayerLazy from '$lib/components/VoiceNotePlayerLazy.svelte';
	import VoiceNoteRecorderLazy from '$lib/components/VoiceNoteRecorderLazy.svelte';
	import SpeciesAutocomplete from '$lib/components/SpeciesAutocomplete.svelte';
	import CadastreBanner from '$lib/components/CadastreBanner.svelte';
	import VetoLegalChecklist from '$lib/components/VetoLegalChecklist.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import {
		applyTreeEnrichment,
		deleteTree,
		ensureTreeHydrated,
		getTreeById,
		runPersistBatch,
		toggleFavorite,
		treeStore,
		updateTree,
		updateVoiceNote
	} from '$lib/stores/trees.svelte';
	import {
		fetchTreeEnrichment,
		toTreeEnrichmentPatch,
		type TreeEnrichmentResult
	} from '$lib/utils/treeEnrichment';
	import { isAbortError } from '$lib/utils/abortSignal';
	import { canUseApi } from '$lib/utils/apiPolicy';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import * as m from '$lib/paraglide/messages.js';
	import { goHome } from '$lib/utils/app-navigation';
	import { formatDate } from '$lib/utils/date';
	import {
		formatAltitudeLabel
	} from '$lib/utils/altitude';
	import { loadAgriData } from '$lib/stores/agriData.svelte';
	import { formatLocationLabel } from '$lib/utils/geocoding';
	import { formatFrontLabel } from '$lib/utils/compass';
	import GpsStatusCompact from '$lib/components/GpsStatusCompact.svelte';
	import { isPoorAccuracy } from '$lib/utils/gps';
	import { showDetailFeedback, showErrorToast, showOkToast } from '$lib/stores/appToast.svelte';
	import { formatUserFacingError, resolveErrorCopy } from '$lib/utils/userFacingError';
	import { treeSaveFailedCopy, treeVoiceSaveFailedCopy } from '$lib/utils/errorCopy';
	import { hapticSelection, hapticWarning } from '$lib/utils/haptics';
	import { tick } from 'svelte';
	import { MOTION_MS, prefersReducedMotion } from '$lib/utils/motion';
	import { onlineState } from '$lib/utils/online.svelte';
	import { scheduleCadastreBackfill } from '$lib/utils/cadastreBackfill';
	import type { EnvironmentExposure } from '$lib/types/environment';
	import type { HarvestEthicsConfirmation } from '$lib/types/harvest-ethics';
	import type { Tree, VoiceNote } from '$lib/types/tree';

	let treeId = $derived(page.params.id ?? '');
	let tree = $derived(treeId ? getTreeById(treeId) : undefined);
	let pageUrl = $derived(`${page.url.origin}${base}/tree/${treeId}`);
	let displayLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!tree) return m.title_detail();
		const raw = tree.species.trim();
		return raw ? speciesDisplayName(raw) : m.tree_species_unset();
	});

	let pageTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return displayLabel;
	});

	let showDeleteDialog = $state(false);
	let editing = $state(false);
	let deleting = $state(false);
	let saving = $state(false);
	let favoritePulse = $state(false);
	let favoritePulseTimeout: ReturnType<typeof setTimeout> | undefined;

	let editSpecies = $state('');
	let editNotes = $state('');
	let climateLoading = $state(false);
	let climateError = $state('');
	let cadastreLoading = $state(false);
	let climateSectionOpen = $state(false);
	let editingVoiceNote = $state(false);
	let voiceNoteDraft = $state<VoiceNote | null>(null);
	let savingVoiceNote = $state(false);
	let vetoChecklistOpen = $state(false);

	const simpleMode = $derived(appearanceSettingsState.simpleMode);

	const hasGps = $derived(tree?.latitude !== null && tree?.longitude !== null);
	const locationLabel = $derived(tree ? formatLocationLabel(tree) : null);
	const altitudeLabel = $derived(tree ? formatAltitudeLabel(tree.altitudeMeters) : null);
	const frontHeadingLabel = $derived(tree ? formatFrontLabel(tree.frontHeadingDegrees) : null);

	let visitsSectionOpen = $state(false);
	let visitsOpenTreeId = '';

	function needsLocationEnrichment(currentTree: Tree): boolean {
		if (!currentTree.locationLabel) {
			return true;
		}
		return (
			!currentTree.cadastreInfo && !isPoorAccuracy(currentTree.accuracyMeters)
		);
	}

	async function persistEnrichmentResult(
		treeIdAtStart: string,
		enrichment: TreeEnrichmentResult
	): Promise<void> {
		if (enrichment.climateError) {
			climateError = enrichment.climateError;
		}
		const patch = toTreeEnrichmentPatch(enrichment);
		if (Object.keys(patch).length === 0) {
			return;
		}
		await runPersistBatch(() => applyTreeEnrichment(treeIdAtStart, patch));
	}

	$effect(() => {
		void treeId;
		climateLoading = false;
		cadastreLoading = false;
		climateError = '';
	});

	$effect(() => {
		const current = tree;
		const id = current?.id ?? '';
		if (id === visitsOpenTreeId) return;
		visitsOpenTreeId = id;
		visitsSectionOpen = true;
	});

	$effect(() => {
		const currentTree = tree;
		if (!currentTree?.id || currentTree.photos[0]) {
			return;
		}
		void ensureTreeHydrated(currentTree.id);
	});

	$effect(() => {
		if (!treeStore.loaded || !onlineState.online) return;
		scheduleCadastreBackfill();
	});

	$effect(() => {
		if (simpleMode) return;
		const currentTree = tree;
		if (
			!currentTree ||
			!needsLocationEnrichment(currentTree) ||
			currentTree.latitude === null ||
			currentTree.longitude === null ||
			!onlineState.online
		) {
			return;
		}

		const controller = new AbortController();
		const treeIdAtStart = currentTree.id;

		void (async () => {
			cadastreLoading = true;
			try {
				const enrichment = await fetchTreeEnrichment(currentTree, {
					signal: controller.signal,
					scope: 'location'
				});
				if (controller.signal.aborted || treeId !== treeIdAtStart) {
					return;
				}
				await persistEnrichmentResult(treeIdAtStart, enrichment);
			} catch (err) {
				if (isAbortError(err) || controller.signal.aborted || treeId !== treeIdAtStart) {
					return;
				}
			} finally {
				if (!controller.signal.aborted && treeId === treeIdAtStart) {
					cadastreLoading = false;
				}
			}
		})();

		return () => controller.abort();
	});

	$effect(() => {
		if (simpleMode || !climateSectionOpen) return;
		const currentTree = tree;
		if (
			!currentTree ||
			currentTree.climateHistory ||
			currentTree.latitude === null ||
			currentTree.longitude === null ||
			!onlineState.online ||
			!canUseApi('openMeteoArchive')
		) {
			return;
		}

		const controller = new AbortController();
		const treeIdAtStart = currentTree.id;

		void (async () => {
			climateLoading = true;
			climateError = '';
			try {
				const enrichment = await fetchTreeEnrichment(currentTree, {
					signal: controller.signal,
					scope: 'climate'
				});
				if (controller.signal.aborted || treeId !== treeIdAtStart) {
					return;
				}
				await persistEnrichmentResult(treeIdAtStart, enrichment);
			} catch (err) {
				if (isAbortError(err) || controller.signal.aborted || treeId !== treeIdAtStart) {
					return;
				}
				climateError = 'failed';
			} finally {
				if (!controller.signal.aborted && treeId === treeIdAtStart) {
					climateLoading = false;
				}
			}
		})();

		return () => controller.abort();
	});

	async function confirmHarvestEthics(confirmation: HarvestEthicsConfirmation) {
		const currentTree = tree;
		if (!currentTree) return;
		await updateTree(currentTree.id, { harvestEthicsConfirmation: confirmation });
		vetoChecklistOpen = false;
		showDetailFeedback(m.veto_confirm_success());
	}

	async function updateEnvironmentExposure(exposure: EnvironmentExposure) {
		const currentTree = tree;
		if (!currentTree || currentTree.environmentExposure === exposure) return;

		await updateTree(currentTree.id, { environmentExposure: exposure });
		if (
			climateSectionOpen &&
			currentTree.latitude !== null &&
			currentTree.longitude !== null
		) {
			void loadAgriData(currentTree.latitude, currentTree.longitude, false, {
				species: currentTree.species,
				observedPhenologyStage: currentTree.assessment.observedPhenologyStage,
				cernageStatus: currentTree.assessment.cernageStatus,
				aoutementStatus: currentTree.assessment.aoutementStatus,
				leafFallPct: currentTree.assessment.leafFallPct,
				environmentExposure: exposure
			});
		}
	}

	function retryClimateData() {
		const currentTree = tree;
		if (!currentTree || currentTree.latitude === null || currentTree.longitude === null) {
			return;
		}

		const { id, latitude, longitude } = currentTree;
		void loadAgriData(latitude, longitude, true, {
			species: currentTree.species,
			observedPhenologyStage: currentTree.assessment.observedPhenologyStage,
			cernageStatus: currentTree.assessment.cernageStatus,
			aoutementStatus: currentTree.assessment.aoutementStatus,
			leafFallPct: currentTree.assessment.leafFallPct,
			environmentExposure: currentTree.environmentExposure
		});
		void (async () => {
			climateLoading = true;
			climateError = '';
			try {
				const { fetchClimateHistory } = await import('$lib/utils/climate');
				const result = await fetchClimateHistory(latitude, longitude);
				await runPersistBatch(() => applyTreeEnrichment(id, { climateHistory: result }));
			} catch {
				climateError = 'failed';
			} finally {
				climateLoading = false;
			}
		})();
	}

	function startEditing() {
		if (!tree) return;
		editSpecies = tree.species;
		editNotes = tree.notes;
		editing = true;
	}

	function cancelEditing() {
		editing = false;
		void hapticWarning();
	}

	async function saveEditing() {
		if (!tree) return;

		saving = true;
		try {
			await updateTree(tree.id, {
				species: editSpecies.trim(),
				notes: simpleMode ? tree.notes : editNotes.trim()
			});
			editing = false;
			showDetailFeedback(m.tree_saved());
		} catch (error) {
			showErrorToast(resolveErrorCopy(error, treeSaveFailedCopy()));
		} finally {
			saving = false;
		}
	}

	async function handleToggleFavorite() {
		if (!tree) return;
		const willFavorite = !tree.isFavorite;
		await toggleFavorite(tree.id);
		void hapticSelection();
		if (willFavorite) {
			if (favoritePulseTimeout) clearTimeout(favoritePulseTimeout);
			favoritePulse = true;
			favoritePulseTimeout = setTimeout(() => {
				favoritePulse = false;
				favoritePulseTimeout = undefined;
			}, MOTION_MS.pulse);
		}
	}

	async function handleSaveVoiceNote() {
		if (!tree) return;
		savingVoiceNote = true;
		try {
			await updateVoiceNote(tree.id, voiceNoteDraft);
			editingVoiceNote = false;
			showDetailFeedback(m.tree_voice_saved());
		} catch (error) {
			showErrorToast(resolveErrorCopy(error, treeVoiceSaveFailedCopy()));
		} finally {
			savingVoiceNote = false;
		}
	}

	function startVoiceNoteEdit() {
		if (!tree) return;
		voiceNoteDraft = tree.voiceNote;
		editingVoiceNote = true;
	}

	function openVisitsSection() {
		visitsSectionOpen = true;
		void tick().then(() => {
			document.getElementById('tree-visits')?.scrollIntoView({
				behavior: prefersReducedMotion() ? 'auto' : 'smooth',
				block: 'start'
			});
		});
	}

	async function handleDelete() {
		if (!tree) return;
		deleting = true;
		try {
			await deleteTree(tree.id);
			showOkToast(m.tree_deleted(), { haptic: false });
			await goHome();
		} catch (error) {
	showErrorToast(formatUserFacingError(error, m.tree_delete_failed()));
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

{#if deleting}
	<div class="flex items-center justify-center py-20">
		<Skeleton class="h-10 w-10 rounded-full" label={m.climate_loading()} />
	</div>
{:else if tree}
	<div
		class="grid grid-cols-1 gap-3 simple-density md:grid-cols-2 md:grid-rows-[auto_auto] md:items-start md:gap-4"
	>
		<div class="md:col-start-1 md:row-start-1">
			<PhotoGallery
				{tree}
				onaddvisit={!simpleMode && !editing ? openVisitsSection : undefined}
			/>
		</div>

		<div class="flex items-start justify-between gap-3 md:col-start-2 md:row-start-1">
			<div class="min-w-0 flex-1">
				{#if editing}
					<label for="edit-species" class="sr-only">{m.capture_species_optional()}</label>
					<SpeciesAutocomplete
						id="edit-species"
						bind:value={editSpecies}
						disabled={saving}
						inputClass="text-xl font-semibold"
					/>
				{:else}
					<h2 class="text-2xl font-semibold text-forest-900">{displayLabel}</h2>
				{/if}
				<p class="mt-1 text-sm text-muted">{formatDate(tree.capturedAt)}</p>
			</div>

			<button
				type="button"
				onclick={handleToggleFavorite}
				class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white transition active:scale-95 {favoritePulse
					? 'save-success-pulse'
					: ''}"
				aria-label={tree.isFavorite ? m.tree_favorite() : m.filter_favorites()}
				aria-pressed={tree.isFavorite}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill={tree.isFavorite ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="2"
					class="h-6 w-6 {tree.isFavorite ? 'text-amber-500' : 'text-muted'}"
					aria-hidden="true"
				>
					<path
						d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
					/>
				</svg>
			</button>
		</div>

		<div class="md:col-start-1 md:row-start-2">
			{#if !editing}
				<TreeDetailActions
					{tree}
					{pageUrl}
					{simpleMode}
					onedit={startEditing}
					ondelete={() => (showDeleteDialog = true)}
				/>
			{/if}
		</div>

		<div class="flex flex-col gap-3 md:col-start-2 md:row-start-2">

			{#if editing}
				<div class="flex flex-col gap-4">
					{#if !simpleMode}
					<div class="flex flex-col gap-2">
						<label for="edit-notes" class="text-sm font-medium text-forest-900">{m.capture_notes()}</label>
						<textarea
							id="edit-notes"
							bind:value={editNotes}
							rows="4"
							disabled={saving}
							class="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-forest-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
						></textarea>
					</div>
					{/if}
					<div class="flex gap-3">
						<button
							type="button"
							onclick={cancelEditing}
							disabled={saving}
							class="btn-secondary flex-1"
						>
							{m.action_cancel()}
						</button>
						<button
							type="button"
							onclick={saveEditing}
							disabled={saving}
							class="btn-primary flex-1"
						>
							{saving ? m.action_saving() : m.action_save()}
						</button>
					</div>
				</div>
			{:else}
				<section class="app-card-muted divide-y divide-gray-200">
					{#key tree.id}
						<RevisitReminderCard {tree} embedded />
					{/key}

					<div class="p-4">
						{#if tree.latitude !== null && tree.longitude !== null}
							<GpsStatusCompact
								accuracyMeters={tree.accuracyMeters}
								locationLabel={locationLabel}
							/>
							{#if cadastreLoading || tree.cadastreInfo}
								<div class="mt-2">
									<CadastreBanner
										info={tree.cadastreInfo}
										loading={cadastreLoading}
										compact
										minimal={simpleMode}
										checklistOpen={vetoChecklistOpen}
										onchecklisttoggle={() => (vetoChecklistOpen = !vetoChecklistOpen)}
									/>
									{#if vetoChecklistOpen && tree.cadastreInfo}
										<VetoLegalChecklist
											cadastreInfo={tree.cadastreInfo}
											species={tree.species}
											latitude={tree.latitude}
											longitude={tree.longitude}
											existingConfirmation={tree.harvestEthicsConfirmation}
											onconfirm={confirmHarvestEthics}
											onclose={() => (vetoChecklistOpen = false)}
										/>
									{/if}
								</div>
							{/if}
							<details class="mt-2 text-sm text-forest-700">
								<summary class="cursor-pointer font-medium text-forest-800">
									{m.simple_gps_details()}
								</summary>
								<p class="mt-2 font-mono text-xs text-forest-600">
									{tree.latitude.toFixed(5)}, {tree.longitude.toFixed(5)}
								</p>
								{#if altitudeLabel}
									<p class="mt-1 text-sm text-forest-800">{altitudeLabel}</p>
								{/if}
								{#if frontHeadingLabel}
									<p class="mt-2 flex items-center gap-2 text-sm text-forest-700">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											class="h-4 w-4 shrink-0"
											aria-hidden="true"
										>
											<circle cx="12" cy="12" r="10" />
											<path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
											<path d="M12 8l3 8-3-2-3 2 3-8z" fill="currentColor" stroke="none" />
										</svg>
										{frontHeadingLabel}
									</p>
								{/if}
								{#if !simpleMode}
									<div class="mt-3">
										<EnvironmentExposureField
											value={tree.environmentExposure}
											onchange={(exposure) => void updateEnvironmentExposure(exposure)}
										/>
									</div>
								{/if}
							</details>
						{:else}
							<p class="text-sm text-muted">{m.gps_no_coords_saved()}</p>
						{/if}
					</div>

					{#if editingVoiceNote}
						<div class="p-4">
							<h3 class="text-sm font-medium text-forest-900">{m.voice_note()}</h3>
							<div class="mt-3">
								<VoiceNoteRecorderLazy bind:value={voiceNoteDraft} disabled={savingVoiceNote} compact />
							</div>
							<div class="mt-3 flex gap-2">
								<button
									type="button"
									onclick={() => (editingVoiceNote = false)}
									disabled={savingVoiceNote}
									class="btn-secondary !h-10 flex-1 text-sm"
								>
									{m.action_cancel()}
								</button>
								<button
									type="button"
									onclick={() => void handleSaveVoiceNote()}
									disabled={savingVoiceNote}
									class="btn-primary !h-10 flex-1 text-sm"
								>
									{savingVoiceNote ? m.action_saving() : m.action_save()}
								</button>
							</div>
						</div>
					{:else if (!simpleMode && tree.notes.trim()) || tree.voiceNote}
						<div class="p-4">
							{#if !simpleMode && tree.notes.trim()}
								<h3 class="text-sm font-medium text-forest-900">{m.capture_notes()}</h3>
								<p class="mt-2 whitespace-pre-wrap text-base text-forest-900/90">{tree.notes}</p>
							{/if}
							{#if tree.voiceNote}
								<div class="flex items-center justify-between gap-3 {!simpleMode && tree.notes.trim() ? 'mt-3' : ''}">
									<h3 class="text-sm font-medium text-forest-900">{m.voice_note()}</h3>
									<button
										type="button"
										onclick={startVoiceNoteEdit}
										class="text-sm font-medium text-forest-700"
									>
										{m.parking_resave()}
									</button>
								</div>
								<div class="mt-3">
									<VoiceNotePlayerLazy voiceNote={tree.voiceNote} />
								</div>
							{/if}
						</div>
					{:else}
						<div class="px-4 py-2.5">
							<button
								type="button"
								onclick={startVoiceNoteEdit}
								class="text-sm font-medium text-forest-700"
							>
								{m.voice_note_optional()}
							</button>
						</div>
					{/if}
				</section>

				{#if hasGps && !simpleMode}
					<ClimateDataSectionLazy
						bind:open={climateSectionOpen}
						climate={tree.climateHistory}
						loading={climateLoading}
						error={climateError}
						offline={!onlineState.online}
						species={tree.species}
						observedPhenologyStage={tree.assessment.observedPhenologyStage}
						cernageStatus={tree.assessment.cernageStatus}
						aoutementStatus={tree.assessment.aoutementStatus}
						leafFallPct={tree.assessment.leafFallPct}
						environmentExposure={tree.environmentExposure}
						latitude={tree.latitude}
						longitude={tree.longitude}
						onretry={retryClimateData}
					/>
				{/if}
			{/if}

			{#if !editing && !simpleMode}
				<TreeAssessmentPanel {tree} />

				<details id="tree-visits" class="app-card-muted" bind:open={visitsSectionOpen}>
					<summary class="cursor-pointer px-4 py-3 font-medium text-forest-900 select-none">
						{m.yrs_history()}
					</summary>
					<div class="flex flex-col gap-4 border-t border-gray-100 p-4">
						<VisitTimeline treeId={tree.id} visits={tree.visits} />
						<AddVisitForm treeId={tree.id} />
					</div>
				</details>
			{/if}
		</div>
	</div>

	<ConfirmDialog
		bind:open={showDeleteDialog}
		title={m.action_delete()}
		message={m.tree_delete_message()}
		confirmLabel={m.action_delete()}
		onconfirm={handleDelete}
	/>
{:else}
	<div class="flex flex-col items-center py-16 text-center">
		<h2 class="text-xl font-semibold text-forest-900">{m.tree_not_found()}</h2>
		<a
			href={resolve('/')}
			class="btn-primary btn-primary--inline mt-6"
		>
			{m.layout_back()}
		</a>
	</div>
{/if}
