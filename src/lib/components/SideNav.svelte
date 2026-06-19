<script lang="ts">
	import { page } from '$app/state';
	import { mainNavTabs, settingsNav } from '$lib/navigation';
	import NavIcon from './NavIcon.svelte';

	let routeId = $derived(page.route.id);
</script>

<nav
	class="hidden w-56 shrink-0 flex-col border-r border-gray-100 bg-white lg:flex"
	aria-label="Navigation principale"
>
	<div class="border-b border-gray-100 px-5 py-5">
		<p class="text-lg font-semibold text-forest-900">Yamadori</p>
		<p class="text-xs text-muted">Scouting</p>
	</div>

	<div class="flex flex-1 flex-col gap-1 p-3">
		{#each mainNavTabs as tab (tab.href)}
			{@const active = routeId === tab.routeId}
			<a
				href={tab.href}
				class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition active:scale-[0.98] lg:hover:bg-gray-50 {active
					? 'bg-forest-800/10 text-forest-800'
					: 'text-forest-900'}"
				aria-current={active ? 'page' : undefined}
			>
				<NavIcon icon={tab.icon} class="h-5 w-5" />
				{tab.label}
			</a>
		{/each}
	</div>

	<div class="border-t border-gray-100 p-3">
		<a
			href={settingsNav.href}
			class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition active:scale-[0.98] lg:hover:bg-gray-50 {routeId ===
			settingsNav.routeId
				? 'bg-forest-800/10 text-forest-800'
				: 'text-forest-900'}"
			aria-current={routeId === settingsNav.routeId ? 'page' : undefined}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-5 w-5"
				aria-hidden="true"
			>
				<path
					d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.77 1.05 1.41 1.1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			{settingsNav.label}
		</a>
	</div>
</nav>
