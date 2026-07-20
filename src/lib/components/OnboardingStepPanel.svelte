<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		progress,
		title,
		titleId,
		description,
		middle,
		actions,
		panelClass = '',
		titleClass = 'text-xl',
		descriptionClass = 'text-sm',
		panelRef = $bindable<HTMLDivElement | null>(null)
	}: {
		progress: string;
		title?: string;
		titleId?: string;
		description: string;
		middle?: Snippet;
		actions: Snippet;
		panelClass?: string;
		titleClass?: string;
		descriptionClass?: string;
		panelRef?: HTMLDivElement | null;
	} = $props();
</script>

<div
	bind:this={panelRef}
	class="mx-auto w-full max-w-md rounded-2xl bg-white p-4 shadow-xl md:p-6 {panelClass}"
>
	<p class="text-xs font-medium uppercase tracking-wide text-muted">{progress}</p>
	{#if title}
		<h2 id={titleId} class="mt-2 font-semibold text-forest-900 {titleClass}">{title}</h2>
		<p class="mt-3 leading-relaxed text-muted {descriptionClass}">{description}</p>
	{:else}
		<p class="mt-2 leading-relaxed text-forest-900 {descriptionClass}">{description}</p>
	{/if}
	{#if middle}
		<div class="mt-4">
			{@render middle()}
		</div>
	{/if}
	<div class="onboarding-sheet-actions mt-4 flex flex-col gap-2 md:mt-6 md:gap-3">
		{@render actions()}
	</div>
</div>
