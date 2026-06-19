import { base } from '$app/paths';

/** Retour accueil — URL correcte sur GitHub Pages (/Yamadori/). */
export function goHome(): void {
	window.location.href = `${base}/`;
}
