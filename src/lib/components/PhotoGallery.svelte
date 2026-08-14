<script lang="ts">
	import { getTreeDisplayLabel, getCoverPhotoThumb, type Tree } from '$lib/types/tree';
	import { ensureTreeHydrated } from '$lib/stores/trees.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import PhotoLightbox from './PhotoLightbox.svelte';
	import AppLogoImage from './AppLogoImage.svelte';

	let { tree }: { tree: Tree } = $props();

	let selectedIndex = $state(0);
	let showLightbox = $state(false);
	let hydrating = $state(false);

	let photos = $derived(tree.photos);
	let photoThumbs = $derived(
		tree.photoThumbs && tree.photoThumbs.length > 0 ? tree.photoThumbs : photos
	);
	let selectedPhoto = $derived(photos[selectedIndex] ?? '');
	let selectedThumb = $derived(photoThumbs[selectedIndex] ?? getCoverPhotoThumb(tree));
	let displayLabel = $derived(getTreeDisplayLabel(tree));

	let photoAlt = $derived.by(() => {
		void appearanceSettingsState.locale;
		return `${m.photo_label()} — ${displayLabel}`;
	});

	let mainPhotoLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.photo_view_full({ label: displayLabel });
	});

	function thumbnailLabel(index: number): string {
		void appearanceSettingsState.locale;
		return m.photo_thumbnail_alt({
			index: index + 1,
			total: Math.max(photos.length, photoThumbs.length),
			label: displayLabel
		});
	}

	$effect(() => {
		const currentTree = tree;
		if (!currentTree?.id) {
			return;
		}
		if (currentTree.photos[0]) {
			return;
		}

		hydrating = true;
		void ensureTreeHydrated(currentTree.id).finally(() => {
			hydrating = false;
		});
	});
</script>

{#if photos.length > 0 || getCoverPhotoThumb(tree)}
	<div class="flex flex-col gap-3">
		<button
			type="button"
			class="overflow-hidden rounded-xl bg-gray-100 transition active:scale-[0.99]"
			aria-label={mainPhotoLabel}
			onclick={() => (showLightbox = true)}
		>
			{#if selectedPhoto}
				<img
					src={selectedPhoto}
					alt={photoAlt}
					class="aspect-[4/3] w-full object-cover"
					loading="lazy"
					decoding="async"
				/>
			{:else if selectedThumb}
				<img
					src={selectedThumb}
					alt={photoAlt}
					class="aspect-[4/3] w-full object-cover"
					loading="lazy"
					decoding="async"
				/>
			{:else if hydrating}
				<div class="flex aspect-[4/3] w-full items-center justify-center text-sm text-muted">
					…
				</div>
			{/if}
		</button>

		{#if photos.length > 1}
			<div class="flex gap-2 overflow-x-auto pb-1">
				{#each photoThumbs as photo, index (photo + index)}
					<button
						type="button"
						onclick={() => (selectedIndex = index)}
						aria-label={thumbnailLabel(index)}
						class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition {index ===
						selectedIndex
							? 'border-forest-800'
							: 'border-transparent'}"
					>
						<img
							src={photo}
							alt=""
							class="h-full w-full object-cover"
							loading="lazy"
							decoding="async"
						/>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<PhotoLightbox bind:open={showLightbox} src={selectedPhoto || selectedThumb} alt={photoAlt} />
{:else}
	<div class="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-gray-100 text-forest-600">
		<AppLogoImage class="h-24 w-24 object-contain opacity-80" />
	</div>
{/if}
