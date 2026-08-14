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
	import { isTreeAccessible } from '$lib/utils/featurePolicy';
	import { openProPaywall } from '$lib/stores/proPaywall.svelte';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import { getCombinedYamadoriVerdict } from '$lib/utils/yrs';
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
	import { formatAccuracy, isPoorAccuracy } from '$lib/utils/gps';
	import { showDetailFeedback } from '$lib/stores/appToast.svelte';
	import { hapticSelection, hapticWarning } from '$lib/utils/haptics';
	import { MOTION_MS } from '$lib/utils/motion';
	import { onlineState } from '$lib/utils/online.svelte';
	import { scheduleCadastreBackfill } from '$lib/utils/cadastreBackfill';
	import type { EnvironmentExposure } from '$lib/types/environment';
	import type { HarvestEthicsConfirmation } from '$lib/types/harvest-ethics';
	import type { Tree, VoiceNote } from '$lib/types/tree';

	let treeId = $derived(page.params.id ?? '');
	let tree = $derived(treeId ? getTreeById(treeId) : undefined);
	let treeLocked = $derived(
		tree !== undefined && !isTreeAccessible(tree.id, treeStore.trees)
	);
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
	const combinedYamadoriVerdict = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!tree?.yrsAtCapture) return null;
		return getCombinedYamadoriVerdict(tree.assessment.potentialScore, tree.yrsAtCapture);
	});

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
				climateError =
					err instanceof Error ? err.message : m.tree_climate_unavailable();
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
			} catch (err) {
				climateError =
					err instanceof Error ? err.message : m.tree_climate_unavailable();
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
		} finally {
			savingVoiceNote = false;
		}
	}

	function startVoiceNoteEdit() {
		if (!tree) return;
		voiceNoteDraft = tree.voiceNote;
		editingVoiceNote = true;
	}

	async function handleDelete() {
		if (!tree) return;
		deleting = true;
		try {
			await deleteTree(tree.id);
			await goHome();
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

{#if treeLocked}
	<div class="flex flex-col items-center gap-4 py-16 text-center">
		<h2 class="text-xl font-semibold text-forest-900">{m.pro_tree_locked()}</h2>
		<p class="max-w-sm text-muted">{m.pro_modal_reason_tree_locked()}</p>
		<button
			type="button"
			class="btn-primary btn-primary--inline"
			onclick={() => openProPaywall('tree_locked')}
		>
			{m.pro_upgrade_cta()}
		</button>
		<a
			href={resolve('/')}
			class="text-sm font-medium text-forest-700 underline-offset-2 hover:underline"
		>
			{m.layout_back()}
		</a>
	</div>
{:else if deleting}
	<div class="flex items-center justify-center py-20">
		<Skeleton class="h-10 w-10 rounded-full" label={m.climate_loading()} />
	</div>
{:else if tree}
	<div
		class="flex flex-col gap-6 simple-density md:grid md:grid-cols-2 md:items-start md:gap-6"
	>
		<div class="flex flex-col gap-6">
			<PhotoGallery {tree} />

			{#if !editing}
				<TreeDetailActions
					{tree}
					{pageUrl}
					{simpleMode}
					onedit={startEditing}
				/>
			{/if}
		</div>

		<div class="flex flex-col gap-6">
			<div class="flex items-start justify-between gap-3">
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
				{#if !simpleMode && tree.notes.trim()}
					<section class="app-card-muted p-4">
						<h3 class="text-sm font-medium text-forest-900">{m.capture_notes()}</h3>
						<p class="mt-2 whitespace-pre-wrap text-base text-forest-900/90">{tree.notes}</p>
					</section>
				{/if}

				{#if editingVoiceNote}
					<section class="app-card-muted p-4">
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
					</section>
				{:else if tree.voiceNote}
					<section class="simple-surface app-card-muted p-4">
						<div class="flex items-center justify-between gap-3">
							<h3 class="text-sm font-medium text-forest-900">{m.voice_note()}</h3>
							{#if !simpleMode}
								<button
									type="button"
									onclick={startVoiceNoteEdit}
									class="text-sm font-medium text-forest-700"
								>
									{m.parking_resave()}
								</button>
							{/if}
						</div>
						<div class="mt-3">
							<VoiceNotePlayerLazy voiceNote={tree.voiceNote} />
						</div>
						{#if simpleMode}
							<button
								type="button"
								onclick={startVoiceNoteEdit}
								class="mt-2 text-sm font-medium text-forest-700"
							>
								{m.parking_resave()}
							</button>
						{/if}
					</section>
				{:else if simpleMode}
					<button
						type="button"
						onclick={startVoiceNoteEdit}
						class="self-start text-sm font-medium text-forest-700"
					>
						{m.voice_note_optional()}
					</button>
				{:else}
					<section class="app-card-muted border-dashed p-4">
						<h3 class="text-sm font-medium text-forest-900">{m.voice_note()}</h3>
						<button
							type="button"
							onclick={startVoiceNoteEdit}
							class="mt-2 text-sm font-medium text-forest-700"
						>
							{m.voice_note_optional()}
						</button>
					</section>
				{/if}

				<section class="simple-surface app-card-muted p-4">
					{#if simpleMode && tree.latitude !== null && tree.longitude !== null}
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
									minimal
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
						</details>
					{:else}
					<h3 class="text-sm font-medium text-forest-900">{m.gps_confirm_title()}</h3>
					{#if tree.latitude !== null && tree.longitude !== null}
						{#if locationLabel}
							<p class="mt-2 text-base font-medium text-forest-900">
								{m.share_location({ location: locationLabel })}
							</p>
						{/if}
						<p class="mt-2 font-mono text-sm text-forest-600">
							{tree.latitude.toFixed(5)}, {tree.longitude.toFixed(5)}
						</p>
						<p
							class="mt-2 text-sm {isPoorAccuracy(tree.accuracyMeters)
								? 'text-amber-700'
								: 'text-forest-600'}"
						>
							{m.share_accuracy({ accuracy: formatAccuracy(tree.accuracyMeters) })}
						</p>
						{#if altitudeLabel}
							<p class="mt-2 text-base font-medium text-forest-900">
								{altitudeLabel}
							</p>
						{/if}
						{#if cadastreLoading || tree.cadastreInfo}
							<div class="mt-3">
								<CadastreBanner
									info={tree.cadastreInfo}
									loading={cadastreLoading}
									compact
									checklistOpen={vetoChecklistOpen}
									onchecklisttoggle={() => (vetoChecklistOpen = !vetoChecklistOpen)}
								/>
								{#if vetoChecklistOpen && tree.cadastreInfo}
									<VetoLegalChecklist
										cadastreInfo={tree.cadastreInfo}
										species={tree.species}
										latitude={tree.latitude!}
										longitude={tree.longitude!}
										existingConfirmation={tree.harvestEthicsConfirmation}
										onconfirm={confirmHarvestEthics}
										onclose={() => (vetoChecklistOpen = false)}
									/>
								{/if}
							</div>
						{/if}
						{#if frontHeadingLabel}
							<p class="mt-3 flex items-center gap-2 text-sm text-forest-700">
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
					{:else}
						<p class="mt-2 text-sm text-muted">{m.gps_no_coords_saved()}</p>
					{/if}
					{/if}
				</section>

				{#if hasGps && !simpleMode}
					<div class="app-card-muted px-3 py-2.5">
						<EnvironmentExposureField
							value={tree.environmentExposure}
							onchange={(exposure) => void updateEnvironmentExposure(exposure)}
						/>
					</div>

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
				{#if tree.yrsAtCapture}
					<div
						class="rounded-lg border border-forest-100 bg-forest-50/80 px-3 py-2 text-xs text-forest-900"
						role="status"
					>
						<p>
							{m.yrs_at_capture_label({
								score: String(tree.yrsAtCapture.score),
								decision: tree.yrsAtCapture.decision
							})}
						</p>
						{#if combinedYamadoriVerdict}
							<p class="mt-1 font-medium text-forest-800">{combinedYamadoriVerdict}</p>
						{/if}
					</div>
				{/if}
				<TreeAssessmentPanel {tree} />

				<section class="app-card-muted flex flex-col gap-4 p-4">
					<h3 class="text-sm font-medium text-forest-900">{m.yrs_history()}</h3>
					<VisitTimeline treeId={tree.id} visits={tree.visits} />
					<AddVisitForm treeId={tree.id} />
				</section>
			{/if}

			{#if !editing}
				<button
					type="button"
					onclick={() => (showDeleteDialog = true)}
					disabled={deleting}
					class="btn-danger"
				>
					{m.action_delete()}
				</button>
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
