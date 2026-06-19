<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import AddVisitForm from '$lib/components/AddVisitForm.svelte';
	import ClimatePanel from '$lib/components/ClimatePanel.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PhotoGallery from '$lib/components/PhotoGallery.svelte';
	import TreeAssessmentPanel from '$lib/components/TreeAssessmentPanel.svelte';
	import TreeDetailActions from '$lib/components/TreeDetailActions.svelte';
	import VisitTimeline from '$lib/components/VisitTimeline.svelte';
	import VoiceNotePlayer from '$lib/components/VoiceNotePlayer.svelte';
	import { deleteTree, getTreeById, toggleFavorite, updateClimate, updateTree } from '$lib/stores/trees.svelte';
	import { goHome } from '$lib/utils/app-navigation';
	import { formatDate } from '$lib/utils/date';
	import {
		formatBiologicalAltitude,
		getBiologicalTier
	} from '$lib/utils/altitude';
	import { fetchClimateHistory } from '$lib/utils/climate';
	import { formatFrontHeading } from '$lib/utils/compass';
	import { formatAccuracy, isPoorAccuracy } from '$lib/utils/gps';

	let treeId = $derived(page.params.id ?? '');
	let tree = $derived(treeId ? getTreeById(treeId) : undefined);
	let pageUrl = $derived(`${page.url.origin}${base}/tree/${treeId}`);
	let altitudeLabel = $derived(
		tree ? formatBiologicalAltitude(tree.altitudeMeters) : null
	);
	let altitudeTier = $derived(tree ? getBiologicalTier(tree.altitudeMeters) : null);
	let frontHeadingLabel = $derived(
		tree ? formatFrontHeading(tree.frontHeadingDegrees) : null
	);

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

	const hasGps = $derived(tree?.latitude !== null && tree?.longitude !== null);

	$effect(() => {
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
					err instanceof Error ? err.message : 'Données climatiques non disponibles';
			} finally {
				climateLoading = false;
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
		const species = editSpecies.trim();
		if (!species) {
			showFeedback('Le nom de l\'espèce est requis');
			return;
		}

		saving = true;
		try {
			await updateTree(tree.id, { species, notes: editNotes.trim() });
			editing = false;
			showFeedback('Modifications enregistrées');
		} finally {
			saving = false;
		}
	}

	async function handleToggleFavorite() {
		if (!tree) return;
		await toggleFavorite(tree.id);
	}

	async function handleDelete() {
		if (!tree) return;
		deleting = true;
		try {
			await deleteTree(tree.id);
			goHome();
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>{tree ? tree.species : 'Détail'} — Yamadori Scouting</title>
</svelte:head>

{#if tree}
	<div
		class="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.4fr)] lg:items-start lg:gap-8"
	>
		{#if feedback}
			<p
				class="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-forest-900 px-4 py-2 text-sm font-medium text-white shadow-lg lg:bottom-6"
				role="status"
			>
				{feedback}
			</p>
		{/if}

		<div class="flex flex-col gap-6 lg:sticky lg:top-20">
			<PhotoGallery {tree} />

			{#if !editing}
				<TreeDetailActions
					{tree}
					{pageUrl}
					onedit={startEditing}
					onfeedback={showFeedback}
				/>
			{/if}
		</div>

		<div class="flex flex-col gap-6">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					{#if editing}
						<label for="edit-species" class="sr-only">Espèce</label>
						<input
							id="edit-species"
							type="text"
							bind:value={editSpecies}
							disabled={saving}
							class="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-xl font-semibold text-forest-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
						/>
					{:else}
						<h2 class="text-2xl font-semibold text-forest-900">{tree.species}</h2>
					{/if}
					<p class="mt-1 text-sm text-muted">{formatDate(tree.capturedAt)}</p>
				</div>

				<button
					type="button"
					onclick={handleToggleFavorite}
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white transition active:scale-95"
					aria-label={tree.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
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
					<div class="flex flex-col gap-2">
						<label for="edit-notes" class="text-sm font-medium text-forest-900">Notes</label>
						<textarea
							id="edit-notes"
							bind:value={editNotes}
							rows="4"
							disabled={saving}
							class="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-forest-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
						></textarea>
					</div>
					<div class="flex gap-3">
						<button
							type="button"
							onclick={cancelEditing}
							disabled={saving}
							class="flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-200 text-base font-medium text-forest-900 transition active:scale-[0.98] disabled:opacity-50"
						>
							Annuler
						</button>
						<button
							type="button"
							onclick={saveEditing}
							disabled={saving}
							class="flex h-12 flex-1 items-center justify-center rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
						>
							{saving ? 'Enregistrement…' : 'Enregistrer'}
						</button>
					</div>
				</div>
			{:else}
				{#if tree.notes.trim()}
					<section class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
						<h3 class="text-sm font-medium text-forest-900">Notes</h3>
						<p class="mt-2 whitespace-pre-wrap text-base text-forest-900/90">{tree.notes}</p>
					</section>
				{/if}

				{#if tree.voiceNote}
					<VoiceNotePlayer voiceNote={tree.voiceNote} />
				{/if}

				<section class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
					<h3 class="text-sm font-medium text-forest-900">Position GPS</h3>
					{#if tree.latitude !== null && tree.longitude !== null}
						<p class="mt-2 font-mono text-sm text-forest-600">
							{tree.latitude.toFixed(5)}, {tree.longitude.toFixed(5)}
						</p>
						<p
							class="mt-2 text-sm {isPoorAccuracy(tree.accuracyMeters)
								? 'text-amber-700'
								: 'text-forest-600'}"
						>
							Précision : {formatAccuracy(tree.accuracyMeters)}
						</p>
						{#if altitudeLabel}
							<p class="mt-2 text-base font-medium text-forest-900">
								{altitudeLabel}
							</p>
							{#if altitudeTier}
								<span
									class="mt-2 inline-flex rounded-full bg-forest-800/10 px-3 py-1 text-xs font-medium text-forest-800"
								>
									{altitudeTier.shortLabel}
								</span>
							{/if}
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
								Front : {frontHeadingLabel}
							</p>
						{/if}
					{:else}
						<p class="mt-2 text-sm text-muted">Position non enregistrée</p>
					{/if}
				</section>

				{#if hasGps}
					<ClimatePanel
						climate={tree.climateHistory}
						loading={climateLoading}
						error={climateError}
					/>
				{/if}
			{/if}

			{#if !editing}
				<TreeAssessmentPanel {tree} />

				<section class="flex flex-col gap-4">
					<h3 class="text-sm font-medium text-forest-900">Historique des visites</h3>
					<VisitTimeline visits={tree.visits} />
					<AddVisitForm treeId={tree.id} onsuccess={showFeedback} />
				</section>

				<button
					type="button"
					onclick={() => (showDeleteDialog = true)}
					disabled={deleting}
					class="flex h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-base font-medium text-red-700 transition active:scale-[0.98] disabled:opacity-50"
				>
					Supprimer
				</button>
			{/if}
		</div>
	</div>

	<ConfirmDialog
		bind:open={showDeleteDialog}
		title="Supprimer cet arbre ?"
		message="Cette action est irréversible. L'arbre et sa photo seront définitivement supprimés."
		confirmLabel="Supprimer"
		onconfirm={handleDelete}
	/>
{:else}
	<div class="flex flex-col items-center py-16 text-center">
		<h2 class="text-xl font-semibold text-forest-900">Arbre introuvable</h2>
		<p class="mt-2 text-muted">Cet enregistrement n'existe plus ou a été supprimé.</p>
		<a
			href="{base}/"
			class="mt-6 flex h-12 items-center justify-center rounded-xl bg-forest-800 px-6 text-base font-semibold text-white transition active:scale-[0.98]"
		>
			Retour à la liste
		</a>
	</div>
{/if}
