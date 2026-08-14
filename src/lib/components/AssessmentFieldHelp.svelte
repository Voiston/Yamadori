<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		label,
		helpText,
		children
	}: {
		label: string;
		helpText: string;
		children?: Snippet;
	} = $props();

	let open = $state(false);
	const helpId = $derived(`assessment-help-${label.toLowerCase().replace(/\s+/g, '-')}`);
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-start justify-between gap-2">
		<span class="text-sm font-medium text-forest-900">{label}</span>
		<button
			type="button"
			class="shrink-0 rounded-full border border-gray-200 p-1.5 text-muted hover:bg-gray-50"
			aria-label={m.assessment_help_aria()}
			aria-expanded={open}
			aria-controls={helpId}
			onclick={() => (open = !open)}
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
				<path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
			</svg>
		</button>
	</div>

	{#if open}
		<p id={helpId} class="text-xs leading-relaxed text-muted" role="note">{helpText}</p>
	{/if}

	{#if children}
		{@render children()}
	{/if}
</div>
