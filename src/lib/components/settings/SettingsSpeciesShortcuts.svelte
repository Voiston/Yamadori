<script lang="ts">
	import SpeciesAutocomplete from '$lib/components/SpeciesAutocomplete.svelte';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import {
		addFavoriteSpecies,
		captureSettingsState,
		removeFavoriteSpecies,
		setSpeciesShortcutsEnabled
	} from '$lib/stores/captureSettings.svelte';
	import { MAX_FAVORITE_SPECIES } from '$lib/utils/species-suggestions';
	import * as m from '$lib/paraglide/messages.js';

	let draft = $state('');
	const atMax = $derived(captureSettingsState.favoriteSpecies.length >= MAX_FAVORITE_SPECIES);

	const favoriteLabels = $derived.by(() => {
		void appearanceSettingsState.locale;
		return captureSettingsState.favoriteSpecies.map((name) => ({
			name,
			label: speciesDisplayName(name, appearanceSettingsState.locale)
		}));
	});

	async function addFromDraft(name: string) {
		await addFavoriteSpecies(name);
		draft = '';
	}

	function handleSelect(name: string) {
		void addFromDraft(name);
	}

	function handleAddClick() {
		void addFromDraft(draft);
	}
</script>

<div>
	<label class="app-section-row">
		<input
			type="checkbox"
			class="mt-1 h-4 w-4 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
			checked={captureSettingsState.speciesShortcutsEnabled}
			onchange={(event) => void setSpeciesShortcutsEnabled(event.currentTarget.checked)}
		/>
		<span class="text-sm">
			<span class="font-medium text-forest-900">{m.settings_species_shortcuts()}</span>
			<span class="mt-0.5 block text-muted">{m.settings_species_shortcuts_hint()}</span>
		</span>
	</label>

	{#if captureSettingsState.speciesShortcutsEnabled}
		<div class="flex flex-col gap-2 px-4 py-3">
			{#if favoriteLabels.length > 0}
				<div class="flex flex-wrap gap-2" role="list">
					{#each favoriteLabels as favorite (favorite.name)}
						<div
							class="flex h-10 items-center gap-1 rounded-full border border-gray-200 bg-white pl-4 pr-1 text-sm font-medium text-forest-900"
							role="listitem"
						>
							<span>{favorite.label}</span>
							<button
								type="button"
								class="flex h-8 w-8 items-center justify-center rounded-full text-forest-800 transition active:scale-95"
								aria-label={m.settings_species_favorites_remove({ name: favorite.label })}
								onclick={() => void removeFavoriteSpecies(favorite.name)}
							>
								<span aria-hidden="true">×</span>
							</button>
						</div>
					{/each}
				</div>
			{/if}

			{#if atMax}
				<p class="text-sm text-muted">{m.settings_species_favorites_max()}</p>
			{:else}
				<div class="flex items-start gap-2">
					<div class="min-w-0 flex-1">
						<SpeciesAutocomplete
							id="settings-favorite-species"
							bind:value={draft}
							placeholder={m.capture_species_placeholder()}
							onselect={handleSelect}
						/>
					</div>
					<button
						type="button"
						class="h-12 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
						disabled={!draft.trim()}
						onclick={handleAddClick}
					>
						{m.settings_species_favorites_add()}
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

