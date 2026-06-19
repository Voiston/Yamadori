<script lang="ts">
	import { goto } from '$app/navigation';
	import { DEFAULT_ASSESSMENT } from '$lib/types/tree';
	import { addTree } from '$lib/stores/trees.svelte';
	import { getCoordinates } from '$lib/utils/geo';
	import { formatAccuracy, isPoorAccuracy } from '$lib/utils/gps';
	import { compressImage } from '$lib/utils/photo';
	import PhotoPreview from './PhotoPreview.svelte';

	let species = $state('');
	let notes = $state('');
	let photoFile = $state<File | null>(null);
	let photoPreview = $state('');
	let submitting = $state(false);
	let gpsWarning = $state('');
	let gpsSuccess = $state('');
	let error = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		gpsWarning = '';
		gpsSuccess = '';

		const trimmedSpecies = species.trim();
		if (!trimmedSpecies) {
			error = 'Le nom de l\'espèce est requis.';
			return;
		}

		submitting = true;

		try {
			const { latitude, longitude, accuracyMeters, altitudeMeters } = await getCoordinates();

			if (latitude === null || longitude === null) {
				gpsWarning = 'Position GPS indisponible — l\'arbre sera enregistré sans coordonnées.';
			} else if (isPoorAccuracy(accuracyMeters)) {
				gpsWarning = `Précision faible (${formatAccuracy(accuracyMeters)}) — position approximative en forêt`;
			} else {
				gpsSuccess = `Position enregistrée (${formatAccuracy(accuracyMeters)})`;
			}

			let photos: string[] = [];
			if (photoFile) {
				photos = [await compressImage(photoFile)];
			}

			await addTree({
				species: trimmedSpecies,
				notes: notes.trim(),
				photos,
				latitude,
				longitude,
				accuracyMeters,
				altitudeMeters,
				isFavorite: false,
				assessment: { ...DEFAULT_ASSESSMENT }
			});

			await goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.';
		} finally {
			submitting = false;
		}
	}

	function handlePhoto(file: File) {
		photoFile = file;
	}
</script>

<form class="flex flex-col gap-6" onsubmit={handleSubmit}>
	<div class="flex flex-col gap-2">
		<label for="species" class="text-sm font-medium text-forest-900">Espèce</label>
		<input
			id="species"
			type="text"
			bind:value={species}
			autocomplete="off"
			placeholder="Ex. Pin sylvestre, Genévrier..."
			disabled={submitting}
			class="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
		/>
	</div>

	<div class="flex flex-col gap-2">
		<label for="notes" class="text-sm font-medium text-forest-900">Notes</label>
		<textarea
			id="notes"
			bind:value={notes}
			rows="4"
			placeholder="Taille, exposition, état sanitaire, accès..."
			disabled={submitting}
			class="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
		></textarea>
	</div>

	<PhotoPreview bind:preview={photoPreview} onfile={handlePhoto} />

	{#if error}
		<p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
	{/if}

	{#if gpsWarning}
		<p class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
			{gpsWarning}
		</p>
	{/if}

	{#if gpsSuccess}
		<p class="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
			{gpsSuccess}
		</p>
	{/if}

	<button
		type="submit"
		disabled={submitting}
		class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
	>
		{#if submitting}
			<svg
				class="h-5 w-5 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
				></path>
			</svg>
			Enregistrement...
		{:else}
			Enregistrer l'arbre
		{/if}
	</button>
</form>
