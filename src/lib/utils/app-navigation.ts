import { goto } from '$app/navigation';
import { base } from '$app/paths';

/** Retour accueil — navigation client (compatible hors-ligne). */
export async function goHome(): Promise<void> {
	await goto(`${base}/`);
}
