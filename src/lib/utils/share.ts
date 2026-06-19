import type { Tree } from '$lib/types/tree';
import { formatDate } from '$lib/utils/date';
import { formatBiologicalAltitude } from '$lib/utils/altitude';
import { formatFrontHeading } from '$lib/utils/compass';
import { formatAccuracy } from '$lib/utils/gps';

function buildShareText(tree: Tree, url: string): string {
	const lines = [
		`Yamadori — ${tree.species}`,
		`Date : ${formatDate(tree.capturedAt)}`
	];

	if (tree.latitude !== null && tree.longitude !== null) {
		lines.push(
			`GPS : ${tree.latitude.toFixed(5)}, ${tree.longitude.toFixed(5)}`,
			`Précision : ${formatAccuracy(tree.accuracyMeters)}`
		);
		const altitude = formatBiologicalAltitude(tree.altitudeMeters);
		if (altitude) {
			lines.push(`Altitude : ${altitude}`);
		}
		const front = formatFrontHeading(tree.frontHeadingDegrees);
		if (front) {
			lines.push(`Front : ${front}`);
		}
	}

	if (tree.notes.trim()) {
		const notes =
			tree.notes.length > 200 ? `${tree.notes.slice(0, 200).trim()}…` : tree.notes.trim();
		lines.push(`Notes : ${notes}`);
	}

	lines.push(url);
	return lines.join('\n');
}

export async function shareTree(
	tree: Tree,
	url: string
): Promise<'shared' | 'copied' | 'failed'> {
	const text = buildShareText(tree, url);
	const title = `Yamadori — ${tree.species}`;

	if (navigator.share) {
		try {
			await navigator.share({ title, text, url });
			return 'shared';
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				return 'failed';
			}
		}
	}

	try {
		await navigator.clipboard.writeText(text);
		return 'copied';
	} catch {
		return 'failed';
	}
}
