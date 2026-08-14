import { getTreeDisplayLabel, type Tree } from '$lib/types/tree';
import { isValidTreeId } from '$lib/utils/id';

/** Escape text for safe insertion into MapLibre popup HTML. */
export function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

/**
 * Build a path-safe tree detail href segment.
 * Invalid IDs are rejected so they cannot break out of `/tree/…`.
 */
export function safeTreeHrefId(id: string): string {
	if (!isValidTreeId(id)) {
		return '';
	}
	return encodeURIComponent(id);
}

export type TreePopupHtmlOptions = {
	base: string;
	outdoor: boolean;
	viewLabel: string;
	formatAccuracy: (meters: number) => string;
};

/** Build MapLibre popup HTML with all user-controlled fields escaped. */
export function buildTreePopupHtml(tree: Tree, options: TreePopupHtmlOptions): string {
	const idSegment = safeTreeHrefId(tree.id);
	const link = idSegment ? `${options.base}/tree/${idSegment}` : `${options.base}/`;
	const secondaryColor = options.outdoor ? '#000000' : '#374151';
	const mutedColor = options.outdoor ? '#000000' : '#6b7280';
	const linkColor = options.outdoor ? '#000000' : '#2d4a2d';
	const weight = options.outdoor ? 700 : 400;

	const locationLine = tree.locationLabel
		? `<br><span style="color:${secondaryColor};font-size:13px;font-weight:${weight};">${escapeHtml(tree.locationLabel)}</span>`
		: '';
	const accuracyLine =
		tree.accuracyMeters !== null
			? `<br><span style="color:${mutedColor};font-size:12px;font-weight:${weight};">${escapeHtml(options.formatAccuracy(tree.accuracyMeters))}</span>`
			: '';

	return `<strong style="color:#000000;">${escapeHtml(getTreeDisplayLabel(tree))}</strong>${locationLine}${accuracyLine}<br><a href="${link}" style="color:${linkColor};font-weight:700;">${escapeHtml(options.viewLabel)}</a>`;
}
