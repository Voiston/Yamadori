<script lang="ts">
	import type { SpeciesProtectionHit } from '$lib/geo/providers/species-protection/types';
	import * as m from '$lib/paraglide/messages.js';

	let {
		hit,
		coverage = undefined,
		compact = false
	}: {
		hit: SpeciesProtectionHit | null;
		coverage?: 'full' | 'partial' | 'unsupported' | undefined;
		compact?: boolean;
	} = $props();

	const isVeto = $derived(hit?.level === 'veto');
	const showPartialHint = $derived(
		!hit && (coverage === 'partial' || coverage === 'unsupported')
	);
</script>

{#if hit}
	<div
		class="rounded-lg border px-3 py-2.5 text-xs leading-relaxed {isVeto
			? 'border-red-200 bg-red-50 text-red-950'
			: 'border-amber-200 bg-amber-50 text-amber-950'} {compact ? 'py-2' : ''}"
		role="alert"
	>
		<p class="font-semibold">
			{isVeto ? m.species_protection_alert_veto() : m.species_protection_alert_caution()}
		</p>
		<p class="mt-1">{m.species_protection_matched({ label: hit.label, matched: hit.matchedName })}</p>
		<a
			href={hit.sourceUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="mt-2 inline-flex font-medium underline decoration-current/40 underline-offset-2"
		>
			{m.veto_species_inpn_link({ source: hit.sourceName })}
		</a>
	</div>
{:else if showPartialHint}
	<p class="text-xs leading-relaxed text-muted" role="status">
		{m.species_protection_pack_partial()}
	</p>
{/if}
