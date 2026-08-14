<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { proEntitlementState } from '$lib/stores/proEntitlement.svelte';
	import { proPromoState } from '$lib/stores/proPromo.svelte';
	import ProPromoBanner from '$lib/components/ProPromoBanner.svelte';
	import {
		getActiveProOffer,
		isBillingAvailable,
		purchasePro,
		restoreProPurchase,
		type ProActiveOffer
	} from '$lib/utils/billing';
	import { formatBillingError } from '$lib/utils/billing-errors';
	import {
		getProPromoState,
		resolveProProductId,
		createPromoBannerOffer,
		canEnableProPurchase
	} from '$lib/utils/proOffer';
	import { isNativeApp } from '$lib/utils/platform';
	import { App } from '@capacitor/app';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		/** When true, reload offer (e.g. paywall opened). */
		active?: boolean;
		showPromoBanner?: boolean;
		feedback?: string | null;
		billingError?: string | null;
		onfeedback?: (message: string | null) => void;
	}

	let {
		active = true,
		showPromoBanner = true,
		feedback = $bindable(null),
		billingError = $bindable(null),
		onfeedback
	}: Props = $props();

	let nowMs = $state(Date.now());
	let priceOffer = $state<ProActiveOffer | null>(null);
	let pricesLoaded = $state(false);
	let purchasingUi = $state(false);
	let loadGeneration = 0;

	const pending = $derived(proEntitlementState.purchasePending);

	const promoUi = $derived.by(() => {
		void proPromoState.promoEndsAt;
		void nowMs;
		return getProPromoState(proPromoState.promoEndsAt, nowMs);
	});

	const showPromo = $derived(active && promoUi.phase === 'promo');

	const expectedProductId = $derived.by(() => {
		void proPromoState.promoEndsAt;
		void promoUi.phase;
		return resolveProProductId(proPromoState.promoEndsAt, nowMs);
	});

	const pricesReady = $derived.by(() => {
		if (!pricesLoaded || !priceOffer) return false;
		if (priceOffer.productId !== expectedProductId) return false;
		if (!priceOffer.priceString) return false;
		return true;
	});

	const purchaseDisabled = $derived(
		!canEnableProPurchase(proPromoState.loaded, showPromo, pricesReady)
	);

	const bannerOffer = $derived.by((): ProActiveOffer | null => {
		return createPromoBannerOffer(showPromo, expectedProductId, promoUi, priceOffer);
	});

	const displayPrice = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!proPromoState.loaded || (showPromo && !pricesLoaded)) {
			return m.pro_price_loading();
		}
		if (pricesReady && priceOffer?.priceString) {
			return priceOffer.priceString;
		}
		if (showPromo) {
			return priceOffer?.priceString ?? m.pro_price_fallback_promo();
		}
		return priceOffer?.priceString ?? m.pro_price_fallback_full();
	});

	const buttonLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (purchasingUi) {
			return m.pro_purchase_opening();
		}
		return displayPrice;
	});

	async function refreshPrices(): Promise<void> {
		if (proEntitlementState.purchasePending) {
			return;
		}
		const generation = ++loadGeneration;
		try {
			const next = await getActiveProOffer(Date.now());
			if (generation === loadGeneration) {
				priceOffer = next;
			}
		} finally {
			if (generation === loadGeneration) {
				pricesLoaded = true;
			}
		}
	}

	$effect(() => {
		if (!active || !proPromoState.loaded || pending) {
			return;
		}
		void expectedProductId;
		if (priceOffer?.productId === expectedProductId && pricesLoaded) {
			return;
		}
		priceOffer = null;
		pricesLoaded = false;
		void refreshPrices();
	});

	$effect(() => {
		if (!active || !isNativeApp()) {
			return;
		}

		let removeAppStateListener: (() => void) | undefined;

		void App.addListener('appStateChange', ({ isActive }) => {
			if (isActive && !proEntitlementState.purchasePending) {
				void refreshPrices();
			}
		}).then((handle) => {
			removeAppStateListener = () => {
				void handle.remove();
			};
		});

		return () => {
			removeAppStateListener?.();
		};
	});

	$effect(() => {
		if (!showPromo) {
			return;
		}

		const intervalId = setInterval(() => {
			nowMs = Date.now();
		}, 1000);

		return () => clearInterval(intervalId);
	});

	function setFeedback(message: string | null): void {
		feedback = message;
		onfeedback?.(message);
	}

	async function handlePurchase(): Promise<void> {
		if (purchasingUi) {
			return;
		}
		setFeedback(null);
		billingError = null;
		purchasingUi = true;
		try {
			const success = await purchasePro();
			if (success) {
				setFeedback(m.pro_purchase_success());
			} else if (proEntitlementState.lastError) {
				billingError = formatBillingError(proEntitlementState.lastError);
			}
		} finally {
			purchasingUi = false;
		}
	}

	async function handleRestore(): Promise<void> {
		setFeedback(null);
		billingError = null;
		const restored = await restoreProPurchase();
		if (restored) {
			setFeedback(m.pro_restore_success());
			return;
		}
		if (proEntitlementState.lastError) {
			billingError = formatBillingError(proEntitlementState.lastError);
			return;
		}
		setFeedback(m.pro_restore_none());
	}
</script>

{#if !isBillingAvailable()}
	<p class="text-sm text-muted">{m.pro_billing_unavailable()}</p>
{:else}
	{#if showPromoBanner && bannerOffer}
		<div class="mb-4">
			<ProPromoBanner offer={bannerOffer} />
		</div>
	{/if}

	{#if showPromo && pricesLoaded && !pricesReady}
		<div class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950" role="status">
			<p>{m.pro_promo_purchase_unavailable()}</p>
			<button
				type="button"
				class="mt-1.5 font-medium text-forest-700 underline-offset-2 transition hover:underline disabled:opacity-60"
				disabled={pending}
				onclick={() => {
					pricesLoaded = false;
					void refreshPrices();
				}}
			>
				{m.action_retry()}
			</button>
		</div>
	{/if}

	<button
		type="button"
		class="btn-primary"
		disabled={purchaseDisabled}
		onclick={() => void handlePurchase()}
	>
		{m.pro_upgrade_cta()} — {buttonLabel}
	</button>
	<p class="mt-1.5 text-center text-xs text-muted">{m.pro_lifetime_hint()}</p>
	<button
		type="button"
		class="mt-3 w-full text-center text-sm font-medium text-forest-700 underline-offset-2 transition hover:underline disabled:opacity-60"
		disabled={pending}
		onclick={() => void handleRestore()}
	>
		{m.pro_restore()}
	</button>
{/if}

{#if billingError}
	<p class="mt-3 text-xs text-red-700">{billingError}</p>
{/if}
{#if feedback}
	<p class="mt-3 text-xs text-emerald-700">{feedback}</p>
{/if}
