<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		checked = $bindable(false),
		disabled = false,
		label,
		pillarTitle,
		expanded = false,
		detailsId,
		children,
		ontoggle
	}: {
		checked: boolean;
		disabled?: boolean;
		label: string;
		pillarTitle: string;
		expanded?: boolean;
		detailsId: string;
		children: Snippet;
		ontoggle: () => void;
	} = $props();

	const uid = $props.id();
	const checkboxId = `${uid}-check`;
	const detailsLabel = $derived(
		expanded
			? m.veto_hide_details({ pillar: pillarTitle })
			: m.veto_more_details({ pillar: pillarTitle })
	);
</script>

<div class="rounded-lg border border-gray-100">
	<div class="flex items-stretch gap-0.5">
		<label
			for={checkboxId}
			class={[
				'flex min-h-11 min-w-0 flex-1 items-start gap-3 px-3 py-2 text-sm text-forest-900',
				disabled && 'opacity-50'
			]}
		>
			<input
				id={checkboxId}
				type="checkbox"
				bind:checked
				{disabled}
				class="mt-2 h-5 w-5 shrink-0 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
			/>
			<span class="min-w-0 pt-0.5 leading-snug">
				<span class="block text-[11px] font-semibold uppercase tracking-wide text-muted">
					{pillarTitle}
				</span>
				{label}
			</span>
		</label>
		<button
			type="button"
			class="mr-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-gray-50 hover:text-forest-900"
			aria-expanded={expanded}
			aria-controls={detailsId}
			aria-label={detailsLabel}
			onclick={ontoggle}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class={['h-4 w-4 transition-transform', expanded && 'rotate-180']}
				aria-hidden="true"
			>
				<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
	</div>
	{#if expanded}
		<div id={detailsId} class="space-y-3 border-t border-gray-100 px-3 py-3">
			{@render children()}
		</div>
	{/if}
</div>
