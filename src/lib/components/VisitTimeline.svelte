<script lang="ts">

	import type { TreeVisit } from '$lib/types/tree';

	import * as m from '$lib/paraglide/messages.js';

	import { formatDate } from '$lib/utils/date';

	import PhotoLightbox from './PhotoLightbox.svelte';

	import VoiceNotePlayer from './VoiceNotePlayer.svelte';



	let { visits }: { visits: TreeVisit[] } = $props();



	let lightboxSrc = $state('');

	let showLightbox = $state(false);



	let sortedVisits = $derived(

		[...visits].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))

	);



	function openPhoto(src: string) {

		lightboxSrc = src;

		showLightbox = true;

	}

</script>



{#if sortedVisits.length > 0}

	<ol class="flex flex-col gap-4">

		{#each sortedVisits as visit (visit.id)}

			<li class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">

				<div class="flex items-start gap-3">

					{#if visit.photoBase64}

						<button

							type="button"

							class="h-16 w-16 shrink-0 overflow-hidden rounded-lg"

							onclick={() => openPhoto(visit.photoBase64)}

						>

							<img src={visit.photoBase64} alt="" class="h-full w-full object-cover" />

						</button>

					{/if}

					<div class="min-w-0 flex-1">

						<p class="text-sm font-medium text-forest-900">{formatDate(visit.visitedAt)}</p>

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

{:else}

	<p class="text-sm text-muted">{m.tree_no_visits()}</p>

{/if}

