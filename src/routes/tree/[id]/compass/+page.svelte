<script lang="ts">
	import { page } from '$app/state';
	import CompassView from '$lib/components/CompassView.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { compassTreeMissingCopy } from '$lib/utils/errorCopy';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { getTreeById } from '$lib/stores/trees.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let treeId = $derived(page.params.id ?? '');
	let tree = $derived(treeId ? getTreeById(treeId) : undefined);

	let targetLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!tree) return '';
		const raw = tree.species.trim();
		return raw ? speciesDisplayName(raw) : m.tree_species_unset();
	});

	let pageTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_compass_title().replace(/\s*\([^)]*\)$/, '');
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

{#if tree}
	<CompassView
		target={{
			label: targetLabel,
			latitude: tree.latitude,
			longitude: tree.longitude
		}}
		focusTreeId={treeId}
		trackedTree={tree}
	/>
{:else}
	<div class="flex flex-col items-center px-4 py-16 text-center">
		<ErrorBanner copy={compassTreeMissingCopy()} class="w-full max-w-sm text-left" />
	</div>
{/if}
