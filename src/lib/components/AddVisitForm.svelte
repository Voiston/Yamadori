<script lang="ts">

	import { agriData } from '$lib/stores/agriData.svelte';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import { addVisit } from '$lib/stores/trees.svelte';

	import type { VoiceNote } from '$lib/types/tree';

	import * as m from '$lib/paraglide/messages.js';

	import { photoFileToStorageWithThumb, type PhotoEncoding } from '$lib/utils/photo';

	import { toYrsStoredSnapshot } from '$lib/utils/yrs';

	import { showDetailFeedback } from '$lib/stores/appToast.svelte';

	import PhotoPreview from './PhotoPreview.svelte';

	import VoiceNoteRecorder from './VoiceNoteRecorder.svelte';

	let { treeId }: { treeId: string } = $props();

	let note = $state('');

	let photoFile = $state<File | null>(null);
	let photoEncoding = $state<PhotoEncoding | null>(null);

	let photoPreviewKey = $state(0);

	let voiceNote = $state<VoiceNote | null>(null);

	let submitting = $state(false);



	const canSubmit = $derived(

		note.trim().length > 0 || photoFile !== null || voiceNote !== null

	);



	async function handleSubmit(event: SubmitEvent) {

		event.preventDefault();

		if (!canSubmit) return;



		submitting = true;

		try {

			let photoBase64 = '';
			let photoThumbBase64: string | undefined;

			if (photoFile) {
				if (photoEncoding?.full) {
					photoBase64 = photoEncoding.full;
					photoThumbBase64 = photoEncoding.thumb;
				} else {
					const encoded = await photoFileToStorageWithThumb(photoFile);
					photoBase64 = encoded.full;
					photoThumbBase64 = encoded.thumb;
				}
			}

			await addVisit(treeId, {
				note: note.trim(),
				photoBase64: photoBase64 || undefined,
				photoThumbBase64,

				voiceNote,

				yrsSnapshot:

					!appearanceSettingsState.simpleMode && agriData.data?.yrs

						? toYrsStoredSnapshot(agriData.data.yrs)

						: null

			});

			note = '';

			photoFile = null;
			photoEncoding = null;

			voiceNote = null;

			photoPreviewKey += 1;

			showDetailFeedback(m.visit_added());

		} finally {

			submitting = false;

		}

	}



	function handlePhoto(file: File, _previewUrl: string, encoding: PhotoEncoding) {

		photoFile = file;

		photoEncoding = encoding;

	}

</script>



<form

	class="flex flex-col gap-4 rounded-xl border border-dashed border-gray-200 bg-white p-4"

	onsubmit={handleSubmit}

>

	<div class="flex flex-col gap-2">

		<label for="visit-note" class="text-sm font-medium text-forest-900">{m.visit_new()}</label>

		<textarea

			id="visit-note"

			bind:value={note}

			rows="3"

			placeholder={m.visit_placeholder()}

			disabled={submitting}

			class="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"

		></textarea>

	</div>



	{#key photoPreviewKey}

		<PhotoPreview onfile={handlePhoto} />

	{/key}



	<VoiceNoteRecorder bind:value={voiceNote} disabled={submitting} compact />



	<button

		type="submit"

		disabled={submitting || !canSubmit}

		class="flex h-12 items-center justify-center rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"

	>

		{submitting ? m.action_saving() : m.visit_add()}

	</button>

</form>

