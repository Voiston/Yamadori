<script lang="ts">
	import type { CadastreInfo } from '$lib/types/cadastre';
	import { getCadastreAccentClasses, getCadastreSummary } from '$lib/utils/cadastre';
	import * as m from '$lib/paraglide/messages.js';

	let {
		info = null,
		loading = false,
		floating = false,
		compact = false,
		minimal = false,
		dismissible = false,
		checklistOpen = false,
		ondismiss,
		onchecklisttoggle
	}: {
		info?: CadastreInfo | null;
		loading?: boolean;
		floating?: boolean;
		compact?: boolean;
		minimal?: boolean;
		dismissible?: boolean;
		checklistOpen?: boolean;
		ondismiss?: () => void;
		onchecklisttoggle?: () => void;
	} = $props();

	const accent = $derived(info ? getCadastreAccentClasses(info.zoneType) : null);
	const summary = $derived(info ? getCadastreSummary(info) : '');

	function handleMainClick() {
		if (!info) return;
		onchecklisttoggle?.();
	}

	function handleDismiss(event: MouseEvent) {
		event.stopPropagation();
		ondismiss?.();
	}
</script>

{#if loading}
	<div
		class="rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-xs text-muted shadow-lg backdrop-blur-md {floating
			? 'ring-1 ring-black/5'
			: 'shadow-sm'}"
		role="status"
		aria-live="polite"
	>
		{m.cadastre_loading()}
	</div>
{:else if info && accent}
	<div
		class="relative overflow-hidden rounded-xl border bg-white/95 text-left shadow-lg backdrop-blur-md {accent.border} {floating
			? 'ring-1 ring-black/5'
			: 'shadow-sm'} {compact ? 'px-3 py-2' : 'px-3 py-2.5'}"
		role="status"
		aria-live="polite"
	>
		<div class="absolute inset-y-0 left-0 w-1 {accent.accent}" aria-hidden="true"></div>

		<div class="flex items-start gap-2 pl-2">
			<button
				type="button"
				class="min-w-0 flex-1 text-left"
				aria-expanded={checklistOpen}
				aria-label={checklistOpen ? m.veto_close_checklist() : m.veto_open_checklist()}
				onclick={handleMainClick}
			>
				<p class="text-xs leading-snug text-forest-900">{summary}</p>
				{#if !minimal || checklistOpen}
					<p class="mt-0.5 text-[10px] text-muted">
						{checklistOpen ? m.veto_close_checklist() : m.veto_open_checklist()}
					</p>
				{/if}
			</button>

			{#if dismissible}
				<button
					type="button"
					class="shrink-0 rounded-md p-1 text-muted transition hover:bg-gray-100 hover:text-forest-900"
					aria-label={m.action_close()}
					onclick={handleDismiss}
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
						<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}
