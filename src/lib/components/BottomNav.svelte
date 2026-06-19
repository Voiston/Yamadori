<script lang="ts">
	import { page } from '$app/state';
	import { mainNavTabs } from '$lib/navigation';
	import NavIcon from './NavIcon.svelte';

	let routeId = $derived(page.route.id);
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white pb-safe lg:hidden"
	aria-label="Navigation principale"
>
	<div class="mx-auto flex h-16 max-w-lg items-stretch">
		{#each mainNavTabs as tab (tab.href)}
			{@const active = routeId === tab.routeId}
			<a
				href={tab.href}
				class="flex flex-1 flex-col items-center justify-center gap-1 transition active:scale-95 {active
					? 'text-forest-800'
					: 'text-muted'}"
				aria-current={active ? 'page' : undefined}
			>
				<NavIcon icon={tab.icon} />
				<span class="text-xs font-medium">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>
