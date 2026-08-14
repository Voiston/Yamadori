<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import ProPurchaseCta from '$lib/components/ProPurchaseCta.svelte';
	import {
		closeProPaywall,
		proPaywallState,
		type ProPaywallReason
	} from '$lib/stores/proPaywall.svelte';
	import { isProUnlocked } from '$lib/utils/featurePolicy';
	import { portal } from '$lib/utils/portal';
	import { modalFocus } from '$lib/utils/modalFocus';
	import { sheetBackdrop, sheetPanel } from '$lib/utils/motion';
	import * as m from '$lib/paraglide/messages.js';

	let feedback = $state<string | null>(null);
	let billingError = $state<string | null>(null);

	const open = $derived(proPaywallState.open);
	const reason = $derived(proPaywallState.reason);

	const reasonMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		const messages: Record<ProPaywallReason, () => string> = {
			tree_locked: () => m.pro_modal_reason_tree_locked(),
			tree_limit: () => m.pro_modal_reason_tree_limit(),
			yrs_details: () => m.pro_modal_reason_yrs_details()
		};
		return messages[reason]();
	});

	$effect(() => {
		if (open && isProUnlocked()) {
			closeProPaywall();
		}
	});

	$effect(() => {
		if (!open) {
			return;
		}
		if (feedback === m.pro_purchase_success() || feedback === m.pro_restore_success()) {
			const timeoutId = setTimeout(() => close(), 1200);
			return () => clearTimeout(timeoutId);
		}
	});

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			close();
		}
	}

	function close(): void {
		feedback = null;
		billingError = null;
		closeProPaywall();
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
		role="presentation"
	>
		<div
			class="absolute inset-0 bg-forest-900/40"
			role="presentation"
			transition:sheetBackdrop
			onclick={handleBackdropClick}
		></div>
		<div
			class="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pro-paywall-title"
			aria-describedby="pro-paywall-desc"
			transition:sheetPanel
			use:modalFocus
		>
			<div class="bg-gradient-to-br from-forest-800 to-forest-900 px-6 pb-8 pt-6 text-white">
				<div
					class="sheet-grabber sheet-grabber--on-dark mb-4 sm:hidden"
					aria-hidden="true"
				></div>
				<button
					type="button"
					class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg leading-none transition active:scale-95"
					aria-label={m.pro_modal_close()}
					onclick={close}
				>
					×
				</button>
				<span class="pro-badge">{m.pro_badge_short()}</span>
				<h2 id="pro-paywall-title" class="mt-3 text-2xl font-semibold">{m.pro_modal_title()}</h2>
				<p class="mt-1 text-sm text-forest-100/90">{m.pro_modal_subtitle()}</p>
			</div>

			<div class="px-6 py-5">
				<p id="pro-paywall-desc" class="text-sm font-medium text-forest-900">{reasonMessage}</p>

				<ul class="mt-4 flex flex-col gap-3">
					<li class="flex items-start gap-3 rounded-xl border border-gray-100 bg-forest-50/60 px-4 py-3">
						<span
							class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-800 text-xs font-bold text-white"
							aria-hidden="true"
						>
							✓
						</span>
						<span class="text-sm text-forest-900">{m.pro_modal_feature_trees()}</span>
					</li>
					<li class="flex items-start gap-3 rounded-xl border border-gray-100 bg-forest-50/60 px-4 py-3">
						<span
							class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-800 text-xs font-bold text-white"
							aria-hidden="true"
						>
							✓
						</span>
						<span class="text-sm text-forest-900">{m.pro_modal_feature_yrs()}</span>
					</li>
				</ul>

				<div class="mt-5">
					<ProPurchaseCta active={open} bind:feedback bind:billingError />
				</div>

				<button
					type="button"
					class="mt-4 w-full py-2 text-sm text-muted transition active:scale-[0.98]"
					onclick={close}
				>
					{m.pro_modal_close()}
				</button>
			</div>
		</div>
	</div>
{/if}
