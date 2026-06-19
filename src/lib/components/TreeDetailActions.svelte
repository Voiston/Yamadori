<script lang="ts">
	import type { Tree } from '$lib/types/tree';
	import { goto } from '$app/navigation';
	import { copyCoordinates } from '$lib/utils/clipboard';
	import { openNavigation } from '$lib/utils/navigation';
	import { shareTree } from '$lib/utils/share';

	let {
		tree,
		pageUrl,
		onedit,
		onfeedback
	}: {
		tree: Tree;
		pageUrl: string;
		onedit?: () => void;
		onfeedback?: (message: string) => void;
	} = $props();

	async function handleNavigate() {
		if (tree.latitude === null || tree.longitude === null) return;
		openNavigation(tree.latitude, tree.longitude, tree.species);
	}

	function handleMap() {
		void goto(`/map?focus=${tree.id}`);
	}

	async function handleShare() {
		const result = await shareTree(tree, pageUrl);
		if (result === 'shared') {
			onfeedback?.('Partagé');
		} else if (result === 'copied') {
			onfeedback?.('Informations copiées');
		} else {
			onfeedback?.('Partage impossible');
		}
	}

	async function handleCopy() {
		if (tree.latitude === null || tree.longitude === null) return;
		const ok = await copyCoordinates(tree.latitude, tree.longitude);
		onfeedback?.(ok ? 'Coordonnées copiées' : 'Copie impossible');
	}
	function handleCompass() {
		void goto(`/tree/${tree.id}/compass`);
	}
</script>

<div class="grid grid-cols-2 gap-3">
	{#if tree.latitude !== null && tree.longitude !== null}
		<button
			type="button"
			onclick={handleCompass}
			class="flex h-12 items-center justify-center gap-2 rounded-xl bg-forest-800 text-sm font-semibold text-white transition active:scale-[0.98]"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-4 w-4"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
				<path d="M12 8l3 8-3-2-3 2 3-8z" fill="currentColor" stroke="none" />
			</svg>
			Boussole
		</button>

		<button
			type="button"
			onclick={handleNavigate}
			class="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-forest-900 transition active:scale-[0.98]"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-4 w-4"
				aria-hidden="true"
			>
				<path d="M3 11l19-9-9 19-2-8-8-2z" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			Y aller
		</button>

		<button
			type="button"
			onclick={handleMap}
			class="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-forest-900 transition active:scale-[0.98]"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-4 w-4"
				aria-hidden="true"
			>
				<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
				<path d="M8 2v16M16 6v16" />
			</svg>
			Carte
		</button>

		<button
			type="button"
			onclick={handleCopy}
			class="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-forest-900 transition active:scale-[0.98]"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-4 w-4"
				aria-hidden="true"
			>
				<rect x="9" y="9" width="13" height="13" rx="2" />
				<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
			</svg>
			Copier GPS
		</button>
	{/if}

	<button
		type="button"
		onclick={handleShare}
		class="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-forest-900 transition active:scale-[0.98]"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="h-4 w-4"
			aria-hidden="true"
		>
			<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
			<polyline points="16 6 12 2 8 6" />
			<line x1="12" y1="2" x2="12" y2="15" />
		</svg>
		Partager
	</button>

	<button
		type="button"
		onclick={() => onedit?.()}
		class="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-forest-900 transition active:scale-[0.98]"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="h-4 w-4"
			aria-hidden="true"
		>
			<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
			<path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
		</svg>
		Modifier
	</button>
</div>
