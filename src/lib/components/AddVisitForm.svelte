<script lang="ts">
	import { agriData } from '$lib/stores/agriData.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { addVisit } from '$lib/stores/trees.svelte';
	import type { VoiceNote } from '$lib/types/tree';
	import * as m from '$lib/paraglide/messages.js';
	import { photoFileToStorageWithThumb } from '$lib/utils/photo';
	import { toYrsStoredSnapshot } from '$lib/utils/yrs';
	import { showDetailFeedback } from '$lib/stores/appToast.svelte';
	import MultiPhotoPreview, { type MultiPhotoSlot } from './MultiPhotoPreview.svelte';
	import VoiceNoteRecorder from './VoiceNoteRecorder.svelte';

	let { treeId }: { treeId: string } = $props();

	let note = $state('');
	let photoSlots = $state<MultiPhotoSlot[]>([]);
	let photoPreviewKey = $state(0);
	let voiceNote = $state<VoiceNote | null>(null);
	let submitting = $state(false);

	const canSubmit = $derived(
		note.trim().length > 0 || photoSlots.length > 0 || voiceNote !== null
	);

	async function encodeSlots(slots: MultiPhotoSlot[]): Promise<{
		photos: string[];
		photoThumbs: string[];
	}> {
		const photos: string[] = [];
		const photoThumbs: string[] = [];
		for (const slot of slots) {
			if (slot.encoding?.full) {
				photos.push(slot.encoding.full);
				photoThumbs.push(slot.encoding.thumb);
			} else if (slot.existingFull) {
				photos.push(slot.existingFull);
				photoThumbs.push(slot.existingThumb ?? slot.existingFull);
			} else if (slot.file) {
				const encoded = await photoFileToStorageWithThumb(slot.file);
				photos.push(encoded.full);
				photoThumbs.push(encoded.thumb);
			}
		}
		return { photos, photoThumbs };
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;

		submitting = true;
		try {
			const { photos, photoThumbs } = await encodeSlots(photoSlots);

			await addVisit(treeId, {
				note: note.trim(),
				photos,
				photoThumbs: photoThumbs.length > 0 ? photoThumbs : undefined,
				voiceNote,
				yrsSnapshot:
					!appearanceSettingsState.simpleMode && agriData.data?.yrs
						? toYrsStoredSnapshot(agriData.data.yrs)
						: null
			});

			note = '';
			photoSlots = [];
			voiceNote = null;
			photoPreviewKey += 1;
			showDetailFeedback(m.visit_added());
		} finally {
			submitting = false;
		}
	}
</script>

<form
	class="flex flex-col gap-4 rounded-[var(--radius-card)] border border-dashed border-gray-200 bg-white/70 p-4"
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
		<MultiPhotoPreview bind:slots={photoSlots} />
	{/key}

	<VoiceNoteRecorder bind:value={voiceNote} disabled={submitting} compact />

	<button type="submit" disabled={submitting || !canSubmit} class="btn-primary">
		{submitting ? m.action_saving() : m.visit_add()}
	</button>
</form>
