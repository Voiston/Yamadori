<script lang="ts">
	import { getTreeDisplayLabel, type Tree } from '$lib/types/tree';
	import PhotoLightbox from './PhotoLightbox.svelte';

	let { tree }: { tree: Tree } = $props();

	let selectedIndex = $state(0);
	let showLightbox = $state(false);

	let photos = $derived(tree.photos);
	let selectedPhoto = $derived(photos[selectedIndex] ?? '');
	let displayLabel = $derived(getTreeDisplayLabel(tree));
</script>

{#if photos.length > 0}
	<div class="flex flex-col gap-3">
		<button
			type="button"
			class="overflow-hidden rounded-xl bg-gray-100 transition active:scale-[0.99]"
			onclick={() => (showLightbox = true)}
		>
			<img
				src={selectedPhoto}
				alt="Photo de {displayLabel}"
				class="aspect-[4/3] w-full object-cover"
			/>
		</button>

		{#if photos.length > 1}
			<div class="flex gap-2 overflow-x-auto pb-1">
				{#each photos as photo, index (photo + index)}
					<button
						type="button"
						onclick={() => (selectedIndex = index)}
						class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition {index ===
						selectedIndex
							? 'border-forest-800'
							: 'border-transparent'}"
					>
						<img src={photo} alt="" class="h-full w-full object-cover" />
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<PhotoLightbox bind:open={showLightbox} src={selectedPhoto} alt="Photo de {displayLabel}" />
{:else}
	<div class="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-gray-100 text-forest-600">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			class="h-16 w-16 opacity-30"
			aria-hidden="true"
		>
			<path
				d="M12 2C8.5 2 6 4.5 6 8c0 2 1 3.8 2.5 5-2.5 1.2-4.5 4-4.5 7.5 0 4.1 3.4 7.5 7.5 7.5s7.5-3.4 7.5-7.5c0-3.5-2-6.3-4.5-7.5C17 11.8 18 10 18 8c0-3.5-2.5-6-6-6z"
			/>
		</svg>
	</div>
{/if}
