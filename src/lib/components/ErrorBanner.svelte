<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { ErrorCopy } from '$lib/utils/userFacingError';
	import { openAppSettings } from '$lib/utils/openAppSettings';

	let {
		copy,
		tone = 'danger',
		onretry,
		class: className = ''
	}: {
		copy: ErrorCopy;
		tone?: 'danger' | 'warning';
		onretry?: () => void;
		class?: string;
	} = $props();

	const toneClass = $derived(
		tone === 'warning'
			? 'border-amber-200 bg-amber-50 text-amber-950'
			: 'border-red-200 bg-red-50 text-red-950'
	);

	const actionHref = $derived.by(() => {
		if (copy.action.kind !== 'link' || !copy.action.href) return null;
		const [path, hash] = copy.action.href.split('#');
		const resolved = (resolve as (pathname: string) => string)(path || '/');
		return hash ? `${resolved}#${hash}` : resolved;
	});

	async function handleAction(): Promise<void> {
		switch (copy.action.kind) {
			case 'retry':
				onretry?.();
				return;
			case 'settings':
				await openAppSettings();
				onretry?.();
				return;
			case 'link':
				if (actionHref) await goto(actionHref);
				return;
			case 'dismiss':
				return;
		}
	}
</script>

<div class="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm {toneClass} {className}" role="alert">
	<p class="font-medium">{copy.what}</p>
	{#if copy.why}
		<p class="text-xs leading-relaxed opacity-90">{copy.why}</p>
	{/if}
	{#if copy.action.kind === 'link' && actionHref}
		<a
			href={actionHref}
			class="mt-1 self-start text-xs font-semibold underline underline-offset-2"
		>
			{copy.action.label}
		</a>
	{:else if copy.action.kind === 'dismiss'}
		<p class="mt-1 text-xs font-medium">{copy.action.label}</p>
	{:else}
		<button
			type="button"
			class="mt-1 self-start text-xs font-semibold underline underline-offset-2"
			onclick={() => void handleAction()}
		>
			{copy.action.label}
		</button>
	{/if}
</div>
