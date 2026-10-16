<script lang="ts">
	import type { CadastreInfo } from '$lib/types/cadastre';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { getCadastreAccentClasses, getCadastreSummary } from '$lib/utils/cadastre';
	import { effectiveCollectStatus } from '$lib/utils/cadastreRefs';
	import { cadastreEmptyCopy, cadastreErrorCopy } from '$lib/utils/errorCopy';
	import * as m from '$lib/paraglide/messages.js';

	let {
		info = null,
		loading = false,
		floating = false,
		compact = false,
		minimal = false,
		dismissible = false,
		checklistOpen = false,
		failed = false,
		ondismiss,
		onchecklisttoggle,
		onretry
	}: {
		info?: CadastreInfo | null;
		loading?: boolean;
		floating?: boolean;
		compact?: boolean;
		minimal?: boolean;
		dismissible?: boolean;
		checklistOpen?: boolean;
		failed?: boolean;
		ondismiss?: () => void;
		onchecklisttoggle?: () => void;
		onretry?: () => void;
	} = $props();

	const accent = $derived(info ? getCadastreAccentClasses(info.zoneType) : null);
	const summary = $derived(info ? getCadastreSummary(info) : '');
	const collectStatus = $derived(info ? effectiveCollectStatus(info) : null);
	const cardPadding = $derived(compact ? 'px-3 py-2' : 'px-3 py-2.5');
	const cardChrome = $derived(
		`app-card relative overflow-hidden bg-white/95 text-left backdrop-blur-md ${
			floating ? 'ring-1 ring-black/5' : ''
		} ${cardPadding}`
	);

	function collectStatusLabel(status: NonNullable<CadastreInfo['collectStatus']>): string {
		switch (status) {
			case 'forbidden':
				return m.collect_status_forbidden();
			case 'permit_required':
				return m.collect_status_permit_required();
			case 'forbidden_or_agency':
				return m.collect_status_forbidden_or_agency();
			case 'owner_permission':
				return m.collect_status_owner_permission();
			default:
				return m.collect_status_unknown();
		}
	}

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
		data-capture-tutorial="cadastre"
		class="{cardChrome} border-gray-200"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<div class="absolute inset-y-0 left-0 w-1 bg-gray-200" aria-hidden="true"></div>

		<div class="flex items-start gap-2 pl-2">
			<div class="min-w-0 flex-1">
				<p class="text-xs leading-snug text-forest-900">{m.cadastre_loading()}</p>
				<Skeleton class="mt-1.5 h-2.5 w-[88%] rounded" decorative />
				<Skeleton class="mt-1 h-2 w-[52%] rounded" decorative />
				{#if !minimal}
					<Skeleton class="mt-1 h-2 w-[40%] rounded" decorative />
				{/if}
			</div>
		</div>
	</div>
{:else if info && accent}
	<div
		data-capture-tutorial="cadastre"
		class="{cardChrome} {accent.border}"
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
				{#if collectStatus}
					<p class="mt-0.5 text-[10px] font-medium text-forest-800">
						{collectStatusLabel(collectStatus)}
					</p>
				{/if}
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
{:else if failed}
	<ErrorBanner copy={cadastreErrorCopy()} tone="warning" onretry={onretry} />
{:else}
	<ErrorBanner copy={cadastreEmptyCopy()} tone="warning" />
{/if}
