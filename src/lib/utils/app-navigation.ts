import { base } from '$app/paths';

/** Retour accueil — navigation client (compatible hors-ligne). */
export async function goHome(): Promise<void> {
	const { goto } = await import('$app/navigation');
	await goto(`${base}/`);
}

export type BackNavigationTarget = {
	showBack: boolean;
	href: string;
};

export function getBackNavigationTarget(
	routeId: string | null,
	treeId: string | null
): BackNavigationTarget {
	const isCapture = routeId === '/capture';
	const isCompass = routeId === '/tree/[id]/compass';
	const isParkingCompass = routeId === '/parking/compass';
	const isDetail = routeId === '/tree/[id]';
	const isSettings = routeId === '/settings';
	const showBack = isCapture || isDetail || isCompass || isParkingCompass || isSettings;

	const href = isParkingCompass
		? `${base}/map`
		: isCompass && treeId
			? `${base}/tree/${treeId}`
			: `${base}/`;

	return { showBack, href };
}
