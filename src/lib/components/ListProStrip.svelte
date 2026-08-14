<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		variant: 'locked' | 'promo';
		hiddenCount?: number;
		onclick: () => void;
		ondismiss?: () => void;
	}

	let { variant, hiddenCount = 0, onclick, ondismiss }: Props = $props();

	const showDismiss = $derived(variant === 'promo' && !!ondismiss);
</script>

<div
	class={[
		'pro-promo relative flex w-full items-start gap-3 px-3 py-2.5',
		showDismiss && 'pr-10'
	]}
>
	<button
		type="button"
		class="min-w-0 flex-1 text-left transition active:scale-[0.99]"
		{onclick}
	>
		<div class="flex items-center gap-2">
			<span class="pro-badge pro-badge--on-light">{m.pro_badge_short()}</span>
			{#if variant === 'locked'}
				<p class="text-sm font-semibold text-forest-900">
					{m.pro_trees_hidden_banner({ count: String(hiddenCount) })}
				</p>
			{:else}
				<p class="text-sm font-semibold text-forest-900">{m.pro_promo_title()}</p>
			{/if}
		</div>
		<p class="mt-1 text-xs font-medium text-forest-800">{m.pro_upgrade_cta()}</p>
	</button>

	{#if showDismiss}
		<button
			type="button"
			class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-forest-700 transition hover:bg-forest-100 active:scale-95"
			aria-label={m.pro_promo_dismiss()}
			onclick={() => ondismiss?.()}
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
