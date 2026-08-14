<script lang="ts">
	import type { TreeVisit } from '$lib/types/tree';
	import { visitPrimaryThumb } from '$lib/types/tree';
	import * as m from '$lib/paraglide/messages.js';
	import { formatDate } from '$lib/utils/date';
	import { photoFileToStorageWithThumb } from '$lib/utils/photo';
	import { updateVisit } from '$lib/stores/trees.svelte';
	import { showDetailFeedback } from '$lib/stores/appToast.svelte';
	import { portal, APP_SHELL_PORTAL_TARGET } from '$lib/utils/portal';
	import { modalFocus } from '$lib/utils/modalFocus';
	import { sheetBackdrop, sheetPanel } from '$lib/utils/motion';
	import PhotoLightbox from './PhotoLightbox.svelte';
	import VoiceNotePlayer from './VoiceNotePlayer.svelte';
	import MultiPhotoPreview, { type MultiPhotoSlot } from './MultiPhotoPreview.svelte';

	let {
		treeId,
		visits
	}: {
		treeId: string;
		visits: TreeVisit[];
	} = $props();

	let lightboxSrc = $state('');
	let showLightbox = $state(false);
	let editingVisit = $state<TreeVisit | null>(null);
	let editSlots = $state<MultiPhotoSlot[]>([]);
	let editPreviewKey = $state(0);
	let savingEdit = $state(false);

	let sortedVisits = $derived(
		[...visits].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
	);

	function visitThumbs(visit: TreeVisit): string[] {
		if (visit.photos.length === 0) return [];
		return visit.photos.map((_, i) => visit.photoThumbs?.[i] ?? visit.photos[i] ?? '');
	}

	function visitFullAt(visit: TreeVisit, index: number): string {
		return visit.photos[index] || visit.photoThumbs?.[index] || '';
	}

	function openPhoto(src: string) {
		if (!src) return;
		lightboxSrc = src;
		showLightbox = true;
	}

	function openEditPhotos(visit: TreeVisit) {
		editingVisit = visit;
		editSlots = visit.photos.map((full, i) => ({
			previewUrl: visit.photoThumbs?.[i] || full,
			file: null,
			encoding: null,
			existingFull: full,
			existingThumb: visit.photoThumbs?.[i]
		}));
		editPreviewKey += 1;
	}

	function closeEditPhotos() {
		editingVisit = null;
		editSlots = [];
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget && !savingEdit) {
			closeEditPhotos();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && editingVisit && !savingEdit) {
			closeEditPhotos();
		}
	}

	async function saveEditPhotos() {
		if (!editingVisit) return;
		savingEdit = true;
		try {
			const photos: string[] = [];
			const photoThumbs: string[] = [];
			for (const slot of editSlots) {
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
			await updateVisit(treeId, editingVisit.id, {
				photos,
				photoThumbs: photoThumbs.length > 0 ? photoThumbs : undefined
			});
			showDetailFeedback(m.tree_saved());
			closeEditPhotos();
		} finally {
			savingEdit = false;
		}
	}
</script>

<svelte:window onkeydown={editingVisit ? handleKeydown : undefined} />

{#if sortedVisits.length > 0}
	<ol class="flex flex-col gap-4">
		{#each sortedVisits as visit (visit.id)}
			{@const thumbs = visitThumbs(visit)}
			<li class="app-card-muted p-4">
				<div class="flex items-start gap-3">
					{#if thumbs.length > 0}
						<div class="flex shrink-0 gap-1.5">
							{#each thumbs as thumb, index (index)}
								<button
									type="button"
									class="h-16 w-16 overflow-hidden rounded-lg"
									aria-label={m.photo_slot_of({ n: index + 1, max: thumbs.length })}
									onclick={() => openPhoto(visitFullAt(visit, index))}
								>
									<img
										src={thumb || visitPrimaryThumb(visit)}
										alt=""
										class="h-full w-full object-cover"
										loading="lazy"
										decoding="async"
									/>
								</button>
							{/each}
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<p class="text-sm font-medium text-forest-900">{formatDate(visit.visitedAt)}</p>
							<button
								type="button"
								class="shrink-0 text-xs font-medium text-forest-700 underline-offset-2 hover:underline"
								onclick={() => openEditPhotos(visit)}
							>
								{m.photo_edit_visit()}
							</button>
						</div>
						{#if visit.note.trim()}
							<p class="mt-2 whitespace-pre-wrap text-sm text-forest-900/90">{visit.note}</p>
						{/if}
						{#if visit.voiceNote}
							<div class="mt-3">
								<VoiceNotePlayer voiceNote={visit.voiceNote} />
							</div>
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ol>

	{#if lightboxSrc}
		<PhotoLightbox bind:open={showLightbox} src={lightboxSrc} alt={m.tree_visit_photo_alt()} />
	{/if}

	{#if editingVisit}
		<div
			use:portal={APP_SHELL_PORTAL_TARGET}
			data-yamadori-portal
			class="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
			role="presentation"
		>
			<div
				class="absolute inset-0 bg-forest-900/40"
				role="presentation"
				transition:sheetBackdrop
				onclick={handleBackdropClick}
			></div>
			<div
				class="relative z-10 w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-label={m.photo_edit_visit()}
				transition:sheetPanel
				use:modalFocus
			>
				<div class="sheet-grabber sm:hidden" aria-hidden="true"></div>
				<div class="mb-4 flex items-center justify-between gap-3">
					<h2 class="text-base font-semibold text-forest-900">{m.photo_edit_visit()}</h2>
					<button
						type="button"
						class="text-sm text-muted"
						disabled={savingEdit}
						onclick={closeEditPhotos}
					>
						{m.action_close()}
					</button>
				</div>

				{#key editPreviewKey}
					<MultiPhotoPreview bind:slots={editSlots} />
				{/key}

				<button
					type="button"
					class="btn-primary mt-4 w-full"
					disabled={savingEdit}
					onclick={() => void saveEditPhotos()}
				>
					{savingEdit ? m.action_saving() : m.photo_save_visit()}
				</button>
			</div>
		</div>
	{/if}
{:else}
	<p class="text-sm text-muted">{m.tree_no_visits()}</p>
{/if}
