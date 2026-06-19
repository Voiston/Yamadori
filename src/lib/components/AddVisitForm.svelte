<script lang="ts">
	import { addVisit } from '$lib/stores/trees.svelte';
	import { compressImage } from '$lib/utils/photo';
	import PhotoPreview from './PhotoPreview.svelte';

	let {
		treeId,
		onsuccess
	}: {
		treeId: string;
		onsuccess?: (message: string) => void;
	} = $props();

	let note = $state('');
	let photoFile = $state<File | null>(null);
	let photoPreview = $state('');
	let submitting = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmedNote = note.trim();
		if (!trimmedNote) return;

		submitting = true;
		try {
			let photoBase64 = '';
			if (photoFile) {
				photoBase64 = await compressImage(photoFile);
			}

			await addVisit(treeId, { note: trimmedNote, photoBase64: photoBase64 || undefined });
			note = '';
			photoFile = null;
			photoPreview = '';
			onsuccess?.('Visite ajoutée');
		} finally {
			submitting = false;
		}
	}

	function handlePhoto(file: File) {
		photoFile = file;
	}
</script>

<form class="flex flex-col gap-4 rounded-xl border border-dashed border-gray-200 bg-white p-4" onsubmit={handleSubmit}>
	<div class="flex flex-col gap-2">
		<label for="visit-note" class="text-sm font-medium text-forest-900">Nouvelle visite</label>
		<textarea
			id="visit-note"
			bind:value={note}
			rows="3"
			placeholder="Ex. Cernage des racines, taille de structure..."
			disabled={submitting}
			class="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
		></textarea>
	</div>

	<PhotoPreview bind:preview={photoPreview} onfile={handlePhoto} />

	<button
		type="submit"
		disabled={submitting || !note.trim()}
		class="flex h-12 items-center justify-center rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
	>
		{submitting ? 'Enregistrement…' : 'Ajouter une visite'}
	</button>
</form>
