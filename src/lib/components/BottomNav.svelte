<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{
			href: '/',
			label: 'Liste',
			match: (path: string) => path === '/',
			icon: 'list'
		},
		{
			href: '/map',
			label: 'Carte',
			match: (path: string) => path === '/map',
			icon: 'map'
		},
		{
			href: '/capture',
			label: 'Ajouter',
			match: (path: string) => path === '/capture',
			icon: 'add'
		}
	] as const;

	let pathname = $derived(page.url.pathname);
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white pb-safe"
	aria-label="Navigation principale"
>
	<div class="mx-auto flex h-16 max-w-lg items-stretch">
		{#each tabs as tab (tab.href)}
			{@const active = tab.match(pathname)}
			<a
				href={tab.href}
				class="flex flex-1 flex-col items-center justify-center gap-1 transition active:scale-95 {active
					? 'text-forest-800'
					: 'text-muted'}"
				aria-current={active ? 'page' : undefined}
			>
				{#if tab.icon === 'list'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="h-6 w-6"
						aria-hidden="true"
					>
						<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke-linecap="round" />
					</svg>
				{:else if tab.icon === 'map'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="h-6 w-6"
						aria-hidden="true"
					>
						<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
						<path d="M8 2v16M16 6v16" />
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						class="h-6 w-6"
						aria-hidden="true"
					>
						<path d="M12 5v14M5 12h14" stroke-linecap="round" />
					</svg>
				{/if}
				<span class="text-xs font-medium">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>
