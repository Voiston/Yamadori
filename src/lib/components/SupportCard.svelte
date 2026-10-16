<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import {
		SUPPORT_PRODUCT_IDS,
		type SupportProductId
	} from '$lib/constants/support';
	import { showOkToast } from '$lib/stores/appToast.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { supportBillingState } from '$lib/stores/supportBilling.svelte';
	import {
		isBillingSupported,
		loadSupportPrices,
		purchaseSupport,
		refreshLegacySupporter
	} from '$lib/utils/billing';
	import { formatBillingError } from '$lib/utils/billing-errors';
	import * as m from '$lib/paraglide/messages.js';

	let prices = $state<Partial<Record<SupportProductId, string>>>({});
	let catalogLoaded = $state(false);
	let catalogMissing = $state(false);
	let withdrawalAccepted = $state(false);
	let billingError = $state<string | null>(null);
	let purchasingId = $state<SupportProductId | null>(null);

	const billingSupported = isBillingSupported();
	const pending = $derived(supportBillingState.purchasePending || purchasingId !== null);

	const tiers = $derived.by(() => {
		void appearanceSettingsState.locale;
		return SUPPORT_PRODUCT_IDS.map((id) => ({
			id,
			name: tierName(id),
			price: prices[id] ?? fallbackPrice(id)
		}));
	});

	function tierName(id: SupportProductId): string {
		if (id === 'yamadori_support_2') return m.support_tier_name_2();
		if (id === 'yamadori_support_5') return m.support_tier_name_5();
		return m.support_tier_name_10();
	}

	function fallbackPrice(id: SupportProductId): string {
		if (id === 'yamadori_support_2') return m.support_price_fallback_2();
		if (id === 'yamadori_support_5') return m.support_price_fallback_5();
		return m.support_price_fallback_10();
	}

	onMount(() => {
		if (!billingSupported) return;
		void refreshLegacySupporter();
		void loadSupportPrices().then((list) => {
			const next: Partial<Record<SupportProductId, string>> = {};
			for (const item of list) {
				next[item.productId] = item.priceString;
			}
			prices = next;
			catalogLoaded = true;
			catalogMissing = list.length === 0;
		});
	});

	async function buy(productId: SupportProductId): Promise<void> {
		if (pending || !withdrawalAccepted) return;
		billingError = null;
		purchasingId = productId;
		try {
			const ok = await purchaseSupport(productId);
			if (ok) {
				showOkToast(m.support_purchase_success());
				withdrawalAccepted = false;
				return;
			}
			billingError = formatBillingError(supportBillingState.lastError);
		} finally {
			purchasingId = null;
		}
	}
</script>

<section class="flex flex-col gap-3">
	<div>
		<h2 class="text-lg font-semibold text-forest-900">{m.support_title()}</h2>
	</div>
	<div class="app-card-muted flex flex-col gap-3 px-4 py-3">
		<p class="text-sm text-forest-900">{m.support_body()}</p>
		<p class="text-sm text-muted">{m.support_no_unlock()}</p>
		{#if supportBillingState.legacySupporter}
			<p class="text-sm font-medium text-forest-800">{m.support_legacy_thanks()}</p>
		{/if}

		{#if !billingSupported}
			<p class="text-sm text-muted">{m.support_billing_unavailable()}</p>
		{:else}
			{#if !catalogLoaded}
				<p class="text-xs text-muted">{m.support_price_loading()}</p>
			{:else if catalogMissing}
				<p class="text-xs text-amber-900">{m.support_products_unavailable()}</p>
			{/if}

			<label class="flex items-start gap-2 text-left text-xs leading-relaxed text-muted">
				<input
					type="checkbox"
					class="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
					bind:checked={withdrawalAccepted}
					aria-required="true"
				/>
				<span>{m.support_purchase_withdrawal_checkbox()}</span>
			</label>

			<div class="flex flex-col gap-2">
				{#each tiers as tier (tier.id)}
					<button
						type="button"
						class="btn-secondary"
						disabled={pending || !withdrawalAccepted}
						onclick={() => void buy(tier.id)}
					>
						{purchasingId === tier.id
							? m.support_purchase_opening()
							: m.support_tier_button({ name: tier.name, price: tier.price })}
					</button>
				{/each}
			</div>

			<p class="text-center text-xs leading-relaxed text-muted">
				{m.support_purchase_legal_note()}
				<a
					href={resolve('/settings/sale')}
					class="font-medium text-forest-700 underline-offset-2 hover:underline"
				>
					{m.settings_sale_link()}
				</a>
			</p>
		{/if}

		{#if billingError}
			<p class="text-xs text-red-700">{billingError}</p>
		{/if}
	</div>
</section>
