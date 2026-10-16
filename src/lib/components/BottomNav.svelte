<script lang="ts">
	import { page } from '$app/state';
	import { getMainNavTabs } from '$lib/navigation';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { hapticSelection } from '$lib/utils/haptics';
	import * as m from '$lib/paraglide/messages.js';
	import NavIcon from './NavIcon.svelte';

	let routeId = $derived(page.route.id);

	let navTabs = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getMainNavTabs();
	});

	function onNavSelect() {
		void hapticSelection();
	}
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white pb-safe-unified"
	aria-label={m.nav_main()}
>
	<div class="flex h-16 w-full items-stretch">
		{#each navTabs as tab (tab.href)}
			{@const active = routeId === tab.routeId}
			{@const isCaptureTab = tab.routeId === '/capture'}
			<a
				href={tab.href}
				class="flex flex-1 flex-col items-center justify-center gap-1 transition active:scale-95 {active
					? 'text-forest-800'
					: 'text-muted'}"
				aria-current={active ? 'page' : undefined}
				onclick={onNavSelect}
			>
				<span
					class="nav-tab-icon"
					class:nav-tab-icon--active={active}
					class:nav-tab-icon--capture={isCaptureTab && !active}
				>
					<NavIcon icon={tab.icon} class={isCaptureTab ? 'h-7 w-7' : 'h-6 w-6'} />
				</span>
				<span class="text-xs {active ? 'font-semibold' : 'font-medium'}">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>
