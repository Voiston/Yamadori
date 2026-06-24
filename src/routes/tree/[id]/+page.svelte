<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import AddVisitForm from '$lib/components/AddVisitForm.svelte';
	import ClimateDataSection from '$lib/components/ClimateDataSection.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import EnvironmentExposureField from '$lib/components/EnvironmentExposureField.svelte';
	import PhotoGallery from '$lib/components/PhotoGallery.svelte';
	import TreeAssessmentPanel from '$lib/components/TreeAssessmentPanel.svelte';
	import TreeDetailActions from '$lib/components/TreeDetailActions.svelte';
	import VisitTimeline from '$lib/components/VisitTimeline.svelte';
	import VoiceNotePlayer from '$lib/components/VoiceNotePlayer.svelte';
	import VoiceNoteRecorder from '$lib/components/VoiceNoteRecorder.svelte';
	import SpeciesAutocomplete from '$lib/components/SpeciesAutocomplete.svelte';
	import CadastreBanner from '$lib/components/CadastreBanner.svelte';
	import VetoLegalChecklist from '$lib/components/VetoLegalChecklist.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { deleteTree, getTreeById, toggleFavorite, updateCadastre, updateClimate, updateLocationLabel, updateTree, updateVoiceNote } from '$lib/stores/trees.svelte';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import * as m from '$lib/paraglide/messages.js';
	import { goHome } from '$lib/utils/app-navigation';
	import { formatDate } from '$lib/utils/date';
	import {
		formatAltitudeLabel
	} from '$lib/utils/altitude';
	import { fetchClimateHistory } from '$lib/utils/climate';
	import { loadAgriData } from '$lib/stores/agriData.svelte';
	import { formatLocationLabel, reverseGeocode } from '$lib/utils/geocoding';
	import { formatFrontLabel } from '$lib/utils/compass';
	import GpsStatusCompact from '$lib/components/GpsStatusCompact.svelte';
	import { formatAccuracy, isPoorAccuracy } from '$lib/utils/gps';
	import { hapticSelection } from '$lib/utils/haptics';
	import { onlineState } from '$lib/utils/online.svelte';
	import { lookupCadastre } from '$lib/utils/cadastre';
	import type { EnvironmentExposure } from '$lib/types/environment';
	import type { HarvestEthicsConfirmation } from '$lib/types/harvest-ethics';
	import type { VoiceNote } from '$lib/types/tree';

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
	let feedback = $state('');
	let feedbackTimeout: ReturnType<typeof setTimeout> | undefined;

	let editSpecies = $state('');
	let editNotes = $state('');
	let climateLoading = $state(false);
	let climateError = $state('');
	let cadastreLoading = $state(false);
	let editingVoiceNote = $state(false);
	let voiceNoteDraft = $state<VoiceNote | null>(null);
	let savingVoiceNote = $state(false);
	let vetoChecklistOpen = $state(false);

	const simpleMode = $derived(appearanceSettingsState.simpleMode);

	const hasGps = $derived(tree?.latitude !== null && tree?.longitude !== null);
	const locationLabel = $derived(tree ? formatLocationLabel(tree) : null);
	const altitudeLabel = $derived(tree ? formatAltitudeLabel(tree.altitudeMeters) : null);
	const frontHeadingLabel = $derived(tree ? formatFrontLabel(tree.frontHeadingDegrees) : null);

	$effect(() => {
		if (simpleMode) return;
		const currentTree = tree;
		if (!currentTree || currentTree.latitude === null || currentTree.longitude === null) {
			return;
		}

		void loadAgriData(currentTree.latitude, currentTree.longitude, false, {
			species: currentTree.species,
			observedPhenologyStage: currentTree.assessment.observedPhenologyStage,
			cernageStatus: currentTree.assessment.cernageStatus,
			environmentExposure: currentTree.environmentExposure
		});
	});

	$effect(() => {
		if (simpleMode) return;
		const currentTree = tree;
		if (
			!currentTree ||
			currentTree.climateHistory ||
			currentTree.latitude === null ||
			currentTree.longitude === null ||
			!navigator.onLine
		) {
			return;
		}

		const { id, latitude, longitude } = currentTree;
		void (async () => {
			climateLoading = true;
			climateError = '';
			try {
				const result = await fetchClimateHistory(latitude, longitude);
				await updateClimate(id, result);
			} catch (err) {
				climateError =
					err instanceof Error ? err.message : m.tree_climate_unavailable();
			} finally {
				climateLoading = false;
			}
		})();
	});

	$effect(() => {
		const currentTree = tree;
		if (
			!currentTree ||
			currentTree.locationLabel ||
			currentTree.latitude === null ||
			currentTree.longitude === null ||
			!navigator.onLine
		) {
			return;
		}

		const { id, latitude, longitude } = currentTree;
		void (async () => {
			try {
				const label = await reverseGeocode(latitude, longitude);
				await updateLocationLabel(id, label);
			} catch {
				// Enrichissement optionnel — pas de message d'erreur
			}
		})();
	});

	$effect(() => {
		const currentTree = tree;
		if (
			!currentTree ||
			currentTree.cadastreInfo ||
			currentTree.latitude === null ||
			currentTree.longitude === null ||
			isPoorAccuracy(currentTree.accuracyMeters) ||
			!navigator.onLine
		) {
			return;
		}

		const { id, latitude, longitude } = currentTree;
		void (async () => {
			cadastreLoading = true;
			try {
				const result = await lookupCadastre(latitude, longitude);
				if (result) {
					await updateCadastre(id, result);
				}
			} catch {
				// Enrichissement optionnel — pas de message d'erreur
			} finally {
				cadastreLoading = false;
			}
		})();
	});

	function showFeedback(message: string) {
		feedback = message;
		if (feedbackTimeout) clearTimeout(feedbackTimeout);
		feedbackTimeout = setTimeout(() => {
			feedback = '';
		}, 2000);
	}

	async function confirmHarvestEthics(confirmation: HarvestEthicsConfirmation) {
		const currentTree = tree;
		if (!currentTree) return;
		await updateTree(currentTree.id, { harvestEthicsConfirmation: confirmation });
		vetoChecklistOpen = false;
		showFeedback(m.veto_confirm_success());
	}

	async function updateEnvironmentExposure(exposure: EnvironmentExposure) {
		const currentTree = tree;
		if (!currentTree || currentTree.environmentExposure === exposure) return;

		await updateTree(currentTree.id, { environmentExposure: exposure });
		if (currentTree.latitude !== null && currentTree.longitude !== null) {
			void loadAgriData(currentTree.latitude, currentTree.longitude, false, {
				species: currentTree.species,
				observedPhenologyStage: currentTree.assessment.observedPhenologyStage,
				cernageStatus: currentTree.assessment.cernageStatus,
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
			environmentExposure: currentTree.environmentExposure
		});
		void (async () => {
			climateLoading = true;
			climateError = '';
			try {
				const result = await fetchClimateHistory(latitude, longitude);
				await updateClimate(id, result);
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
			showFeedback(m.tree_saved());
		} finally {
			saving = false;
		}
	}

	async function handleToggleFavorite() {
		if (!tree) return;
		await toggleFavorite(tree.id);
		void hapticSelection();
	}

	async function handleSaveVoiceNote() {
		if (!tree) return;
		savingVoiceNote = true;
		try {
			await updateVoiceNote(tree.id, voiceNoteDraft);
			editingVoiceNote = false;
			showFeedback(m.tree_voice_saved());
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

{#if tree}
	<div
		class="flex flex-col gap-6 simple-density md:grid md:grid-cols-2 md:items-start md:gap-6"
	>
		{#if feedback}
			<p
				class="bottom-safe-toast fixed left-1/2 z-50 -translate-x-1/2 rounded-full bg-forest-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
				role="status"
			>
				{feedback}
			</p>
		{/if}

		<div class="flex flex-col gap-6">
			<PhotoGallery {tree} />

			{#if !editing}
				<TreeDetailActions
					{tree}
					{pageUrl}
					{simpleMode}
					onedit={startEditing}
					onfeedback={showFeedback}
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
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white transition active:scale-95"
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
							class="flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-200 text-base font-medium text-forest-900 transition active:scale-[0.98] disabled:opacity-50"
						>
							{m.action_cancel()}
						</button>
						<button
							type="button"
							onclick={saveEditing}
							disabled={saving}
							class="flex h-12 flex-1 items-center justify-center rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
						>
							{saving ? m.action_saving() : m.action_save()}
						</button>
					</div>
				</div>
			{:else}
				{#if !simpleMode && tree.notes.trim()}
					<section class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
						<h3 class="text-sm font-medium text-forest-900">{m.capture_notes()}</h3>
						<p class="mt-2 whitespace-pre-wrap text-base text-forest-900/90">{tree.notes}</p>
					</section>
				{/if}

				{#if editingVoiceNote}
					<section class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
						<h3 class="text-sm font-medium text-forest-900">{m.voice_note()}</h3>
						<div class="mt-3">
							<VoiceNoteRecorder bind:value={voiceNoteDraft} disabled={savingVoiceNote} compact />
						</div>
						<div class="mt-3 flex gap-2">
							<button
								type="button"
								onclick={() => (editingVoiceNote = false)}
								disabled={savingVoiceNote}
								class="flex h-10 flex-1 items-center justify-center rounded-xl border border-gray-200 text-sm font-medium text-forest-900"
							>
								{m.action_cancel()}
							</button>
							<button
								type="button"
								onclick={() => void handleSaveVoiceNote()}
								disabled={savingVoiceNote}
								class="flex h-10 flex-1 items-center justify-center rounded-xl bg-forest-800 text-sm font-semibold text-white disabled:opacity-50"
							>
								{savingVoiceNote ? m.action_saving() : m.action_save()}
							</button>
						</div>
					</section>
				{:else if tree.voiceNote}
					<section class="simple-surface rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
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
							<VoiceNotePlayer voiceNote={tree.voiceNote} />
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
					<section class="rounded-xl border border-dashed border-gray-200 bg-white p-4 shadow-sm">
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

				<section class="simple-surface rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
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
					<div class="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
						<EnvironmentExposureField
							value={tree.environmentExposure}
							onchange={(exposure) => void updateEnvironmentExposure(exposure)}
						/>
					</div>

					<ClimateDataSection
						climate={tree.climateHistory}
						loading={climateLoading}
						error={climateError}
						offline={!onlineState.online}
						species={tree.species}
						observedPhenologyStage={tree.assessment.observedPhenologyStage}
						cernageStatus={tree.assessment.cernageStatus}
						environmentExposure={tree.environmentExposure}
						onretry={retryClimateData}
					/>
				{/if}
			{/if}

			{#if !editing && !simpleMode}
				<TreeAssessmentPanel {tree} />

				<section class="flex flex-col gap-4">
					<h3 class="text-sm font-medium text-forest-900">{m.yrs_history()}</h3>
					<VisitTimeline visits={tree.visits} />
					<AddVisitForm treeId={tree.id} onsuccess={showFeedback} />
				</section>
			{/if}

			{#if !editing}
				<button
					type="button"
					onclick={() => (showDeleteDialog = true)}
					disabled={deleting}
					class="flex h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-base font-medium text-red-700 transition active:scale-[0.98] disabled:opacity-50"
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
		<h2 class="text-xl font-semibold text-forest-900">{m.list_no_trees()}</h2>
		<p class="mt-2 text-muted">{m.tree_delete_message()}</p>
		<a
			href="{base}/"
			class="mt-6 flex h-12 items-center justify-center rounded-xl bg-forest-800 px-6 text-base font-semibold text-white transition active:scale-[0.98]"
		>
			{m.layout_back()}
		</a>
	</div>
{/if}
