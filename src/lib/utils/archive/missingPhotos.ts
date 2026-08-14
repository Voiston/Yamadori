import type { Tree } from '$lib/types/tree';

/**
 * Count trees whose full-hydration payload still has empty photo slots while
 * thumbs (or empty placeholders) indicate media was expected.
 * Used to warn before exporting an incomplete backup.
 */
export function countTreesWithMissingPhotos(trees: Tree[]): number {
	let count = 0;
	for (const tree of trees) {
		const missing = tree.visits.some((visit) => {
			const photos = visit.photos ?? [];
			const thumbs = visit.photoThumbs ?? [];
			const hasFull = photos.some((p) => Boolean(p?.trim()));
			const hasThumb = thumbs.some((t) => Boolean(t?.trim()));
			const hasEmptyFullSlot = photos.some((p) => !p?.trim());

			// Stored media id present but blob missing → '' in photos after full load
			if (photos.length > 0 && hasEmptyFullSlot && !hasFull) return true;
			// Thumb survived but full media did not
			if (hasThumb && !hasFull) return true;
			return false;
		});
		if (missing) count += 1;
	}
	return count;
}
