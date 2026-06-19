import type { Tree } from '$lib/types/tree';
import { getLastVisitAt } from '$lib/types/tree';
import {
	BARK_OPTIONS,
	CALIBER_OPTIONS,
	DEADWOOD_OPTIONS,
	NEARI_OPTIONS,
	SIZE_OPTIONS
} from '$lib/constants/assessment';
import { getBiologicalTier } from '$lib/utils/altitude';
import { formatFrontHeading } from '$lib/utils/compass';

function escapeCsvField(value: string): string {
	if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
}

function formatNullable(value: number | null): string {
	return value === null ? '' : String(value);
}

function labelFor<T extends string>(
	options: { value: T; label: string }[],
	value: T | null
): string {
	if (!value) return '';
	return options.find((option) => option.value === value)?.label ?? value;
}

export function exportTreesCsv(trees: Tree[]): void {
	const headers = [
		'id',
		'species',
		'capturedAt',
		'latitude',
		'longitude',
		'locationLabel',
		'accuracyMeters',
		'altitudeMeters',
		'biologicalTier',
		'frontHeadingDegrees',
		'frontHeadingLabel',
		'isFavorite',
		'notes',
		'visitCount',
		'lastVisitAt',
		'nebari',
		'trunkDiameterCm',
		'bark',
		'deadwood',
		'sizeClass',
		'caliber',
		'potentialScore',
		'hasVoiceNote'
	];

	const rows = trees.map((tree) =>
		[
			tree.id,
			tree.species,
			tree.capturedAt,
			formatNullable(tree.latitude),
			formatNullable(tree.longitude),
			tree.locationLabel ?? '',
			formatNullable(tree.accuracyMeters),
			formatNullable(tree.altitudeMeters),
			getBiologicalTier(tree.altitudeMeters)?.label ?? '',
			formatNullable(tree.frontHeadingDegrees),
			formatFrontHeading(tree.frontHeadingDegrees) ?? '',
			tree.isFavorite ? 'true' : 'false',
			tree.notes,
			String(tree.visits.length),
			getLastVisitAt(tree) ?? '',
			labelFor(NEARI_OPTIONS, tree.assessment.nebari),
			formatNullable(tree.assessment.trunkDiameterCm),
			labelFor(BARK_OPTIONS, tree.assessment.bark),
			labelFor(DEADWOOD_OPTIONS, tree.assessment.deadwood),
			labelFor(SIZE_OPTIONS, tree.assessment.sizeClass),
			labelFor(CALIBER_OPTIONS, tree.assessment.caliber),
			formatNullable(tree.assessment.potentialScore),
			tree.voiceNote ? 'oui' : 'non'
		]
			.map((field) => escapeCsvField(field))
			.join(',')
	);

	const csv = [headers.join(','), ...rows].join('\r\n');
	const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const date = new Date().toISOString().slice(0, 10);

	const link = document.createElement('a');
	link.href = url;
	link.download = `yamadori-export-${date}.csv`;
	link.click();

	URL.revokeObjectURL(url);
}
