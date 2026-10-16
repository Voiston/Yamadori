<script lang="ts">
	import { resolve } from '$app/paths';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { onMount, tick } from 'svelte';

	type Section = { title: () => string; body: () => string };

	let {
		pageTitle,
		heading,
		intro,
		disclaimer,
		sections
	}: {
		pageTitle: () => string;
		heading: () => string;
		intro: () => string;
		disclaimer?: () => string;
		sections: readonly Section[];
	} = $props();

	onMount(async () => {
		await tick();
		document.querySelector('main')?.scrollTo({ top: 0, left: 0 });
	});

	let title = $derived.by(() => {
		void appearanceSettingsState.locale;
		return pageTitle();
	});

	let headingText = $derived.by(() => {
		void appearanceSettingsState.locale;
		return heading();
	});

	let introText = $derived.by(() => {
		void appearanceSettingsState.locale;
		return intro();
	});

	let disclaimerText = $derived.by(() => {
		void appearanceSettingsState.locale;
		return disclaimer?.() ?? '';
	});

	let renderedSections = $derived.by(() => {
		void appearanceSettingsState.locale;
		return sections.map((section) => ({
			title: section.title(),
			body: section.body()
		}));
	});

	let backLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.privacy_back_to_settings();
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-lg font-semibold text-forest-900">{headingText}</h2>
		<p class="mt-2 text-sm leading-relaxed text-forest-900">{introText}</p>
		{#if disclaimerText}
			<p class="mt-2 text-sm leading-relaxed text-muted">{disclaimerText}</p>
		{/if}
	</div>

	<section class="flex flex-col gap-3">
		<div class="app-section-list">
			{#each renderedSections as section, index (index)}
				<div class="px-4 py-3">
					<h3 class="text-sm font-semibold text-forest-900">{section.title}</h3>
					<p class="mt-1.5 text-sm leading-relaxed text-muted">{section.body}</p>
				</div>
			{/each}
		</div>
	</section>

	<a
		href={resolve('/settings')}
		class="app-card block px-4 py-3 text-center text-sm font-medium text-forest-800 transition active:scale-[0.98]"
	>
		{backLabel}
	</a>
</div>
