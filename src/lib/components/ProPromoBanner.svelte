<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import type { ProActiveOffer } from '$lib/utils/billing';
	import { formatPromoCountdown } from '$lib/utils/proOffer';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		offer: ProActiveOffer;
	}

	let { offer }: Props = $props();

	const promoPrice = $derived.by(() => {
		void appearanceSettingsState.locale;
		return offer.priceString ?? m.pro_price_fallback_promo();
	});

	const fullPrice = $derived.by(() => {
		void appearanceSettingsState.locale;
		return offer.fullPriceString ?? m.pro_price_fallback_full();
	});

	const countdown = $derived(formatPromoCountdown(offer.remainingMs));
</script>

{#if offer.phase === 'promo'}
	<div
		class="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-3"
		role="status"
	>
		<p class="text-sm font-semibold text-amber-950">
			<span aria-hidden="true">⏳ </span>{m.pro_promo_title()}
		</p>
		<p class="mt-1 text-sm text-amber-900">
			{m.pro_promo_body({ promoPrice, fullPrice })}
		</p>
		<p class="mt-2 text-xs font-medium tabular-nums text-amber-800">
			{m.pro_promo_countdown({ time: countdown })}
		</p>
	</div>
{/if}
