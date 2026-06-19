import { base } from '$app/paths';

export type NavIcon = 'list' | 'map' | 'add';

export type NavTab = {
	href: string;
	label: string;
	routeId: string;
	icon: NavIcon;
};

export const mainNavTabs: NavTab[] = [
	{
		href: `${base}/`,
		label: 'Liste',
		routeId: '/',
		icon: 'list'
	},
	{
		href: `${base}/map`,
		label: 'Carte',
		routeId: '/map',
		icon: 'map'
	},
	{
		href: `${base}/capture`,
		label: 'Ajouter',
		routeId: '/capture',
		icon: 'add'
	}
];

export const settingsNav = {
	href: `${base}/settings`,
	label: 'Réglages',
	routeId: '/settings'
} as const;
