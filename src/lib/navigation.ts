import { base } from '$app/paths';
import * as m from '$lib/paraglide/messages.js';

export type NavIcon = 'list' | 'map' | 'add';

export type NavTab = {
	href: string;
	label: string;
	routeId: string;
	icon: NavIcon;
};

export function getMainNavTabs(): NavTab[] {
	return [
		{
			href: `${base}/`,
			label: m.nav_list(),
			routeId: '/',
			icon: 'list'
		},
		{
			href: `${base}/map`,
			label: m.nav_map(),
			routeId: '/map',
			icon: 'map'
		},
		{
			href: `${base}/capture`,
			label: m.nav_add(),
			routeId: '/capture',
			icon: 'add'
		}
	];
}

export function getSettingsNav() {
	return {
		href: `${base}/settings`,
		label: m.nav_settings(),
		routeId: '/settings'
	} as const;
}
