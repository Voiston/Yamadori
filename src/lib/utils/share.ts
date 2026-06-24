import * as m from '$lib/paraglide/messages.js';
import type { Tree } from '$lib/types/tree';
import { getTreeDisplayLabel } from '$lib/types/tree';
import { formatDate } from '$lib/utils/date';
import { formatBiologicalAltitude } from '$lib/utils/altitude';
import { formatFrontHeading } from '$lib/utils/compass';
import { formatAccuracy } from '$lib/utils/gps';
import { isNativeApp } from '$lib/utils/platform';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

function buildShareText(tree: Tree, url: string): string {
	const label = getTreeDisplayLabel(tree);
	const lines: string[] = [m.share_tree_title({ label }), m.share_date({ date: formatDate(tree.capturedAt) })];

	if (tree.latitude !== null && tree.longitude !== null) {
		if (tree.locationLabel) {
			lines.push(m.share_location({ location: tree.locationLabel }));
		}
		lines.push(
			m.share_gps({ lat: tree.latitude.toFixed(5), lng: tree.longitude.toFixed(5) }),
			`geo:${tree.latitude},${tree.longitude}?q=${tree.latitude},${tree.longitude}(${encodeURIComponent(label)})`,
			m.share_accuracy({ accuracy: formatAccuracy(tree.accuracyMeters) })
		);
		const altitude = formatBiologicalAltitude(tree.altitudeMeters);
		if (altitude) {
			lines.push(altitude);
		}
		const front = formatFrontHeading(tree.frontHeadingDegrees);
		if (front) {
			lines.push(m.compass_front({ heading: front }));
		}
	}

	if (tree.notes.trim()) {
		const notes =
			tree.notes.length > 200 ? `${tree.notes.slice(0, 200).trim()}…` : tree.notes.trim();
		lines.push(m.share_notes({ notes }));
	}

	lines.push(url);
	return lines.join('\n');
}

export async function shareTree(
	tree: Tree,
	url: string
): Promise<'shared' | 'copied' | 'failed'> {
	const text = buildShareText(tree, url);
	const title = m.share_tree_title({ label: getTreeDisplayLabel(tree) });

	if (isNativeApp()) {
		try {
			await Share.share({ title, text, url, dialogTitle: title });
			return 'shared';
		} catch (err) {
			if (err instanceof Error && err.message.toLowerCase().includes('cancel')) {
				return 'failed';
			}
		}
	}

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

function dataUrlToBase64(dataUrl: string): string {
	const commaIndex = dataUrl.indexOf(',');
	return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

export async function shareTreePhoto(tree: Tree): Promise<'shared' | 'failed'> {
	const photo = tree.photos[0];
	if (!photo || !isNativeApp()) {
		return 'failed';
	}

	const label = getTreeDisplayLabel(tree);
	const path = `share-${tree.id}-${Date.now()}.jpg`;

	try {
		await Filesystem.writeFile({
			path,
			data: dataUrlToBase64(photo),
			directory: Directory.Cache
		});

		const { uri } = await Filesystem.getUri({
			path,
			directory: Directory.Cache
		});

		await Share.share({
			title: m.share_tree_title({ label }),
			text:
				tree.latitude !== null && tree.longitude !== null
					? `geo:${tree.latitude},${tree.longitude}`
					: label,
			files: [uri],
			dialogTitle: m.share_photo()
		});

		return 'shared';
	} catch {
		return 'failed';
	}
}
