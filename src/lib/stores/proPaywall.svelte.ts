import { isProUnlocked } from '$lib/utils/featurePolicy';
import { startPromoWindowIfNeeded } from '$lib/stores/proPromo.svelte';

export type ProPaywallReason = 'tree_locked' | 'tree_limit' | 'yrs_details';

export const proPaywallState = $state({
	open: false,
	reason: 'tree_locked' as ProPaywallReason
});

export function openProPaywall(reason: ProPaywallReason): void {
	if (isProUnlocked()) {
		return;
	}
	proPaywallState.reason = reason;
	proPaywallState.open = true;
	if (reason === 'tree_limit') {
		void startPromoWindowIfNeeded();
	}
}

export function closeProPaywall(): void {
	proPaywallState.open = false;
}
