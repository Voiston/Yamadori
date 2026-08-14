import * as v from 'valibot';
import * as m from '$lib/paraglide/messages.js';
import { ARCHIVE_FORMAT_VERSION, ArchiveError, type YamadoriArchiveData } from './types';

const MAX_TREES = 10_000;
const MAX_VISITS_PER_TREE = 500;
const MAX_PHOTOS_PER_TREE = 50;
const MAX_STRING = 10_000;
const MAX_SHORT = 256;
const MAX_PATH = 512;
const MAX_ID = 128;

const mediaPathSchema = v.pipe(v.string(), v.maxLength(MAX_PATH));

const voiceNoteArchiveSchema = v.object({
	recordedAt: v.pipe(v.string(), v.maxLength(MAX_SHORT)),
	durationMs: v.pipe(v.number(), v.minValue(0), v.maxValue(3_600_000)),
	mimeType: v.pipe(v.string(), v.maxLength(MAX_SHORT)),
	mediaPath: mediaPathSchema
});

const treeVisitArchiveSchema = v.object({
	id: v.pipe(v.string(), v.maxLength(MAX_ID)),
	visitedAt: v.pipe(v.string(), v.maxLength(MAX_SHORT)),
	note: v.pipe(v.string(), v.maxLength(MAX_STRING)),
	photoPaths: v.optional(v.pipe(v.array(mediaPathSchema), v.maxLength(3))),
	photoPath: v.optional(mediaPathSchema),
	voiceNote: v.optional(v.nullable(voiceNoteArchiveSchema)),
	yrsSnapshot: v.optional(v.nullable(v.unknown()))
});

/** Loose assessment: required object, field-level checks applied downstream via defaults. */
const assessmentSchema = v.record(v.string(), v.unknown());

const nullableLat = v.nullable(v.pipe(v.number(), v.minValue(-90), v.maxValue(90)));
const nullableLon = v.nullable(v.pipe(v.number(), v.minValue(-180), v.maxValue(180)));

const treeArchiveSchema = v.object({
	id: v.pipe(v.string(), v.maxLength(MAX_ID)),
	species: v.pipe(v.string(), v.maxLength(MAX_SHORT)),
	notes: v.pipe(v.string(), v.maxLength(MAX_STRING)),
	photos: v.pipe(v.array(mediaPathSchema), v.maxLength(MAX_PHOTOS_PER_TREE)),
	visits: v.pipe(v.array(treeVisitArchiveSchema), v.maxLength(MAX_VISITS_PER_TREE)),
	assessment: assessmentSchema,
	voiceNote: v.nullable(voiceNoteArchiveSchema),
	latitude: nullableLat,
	longitude: nullableLon,
	accuracyMeters: v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100_000))),
	altitudeMeters: v.nullable(v.pipe(v.number(), v.minValue(-500), v.maxValue(9000))),
	frontHeadingDegrees: v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(360))),
	isFavorite: v.boolean(),
	climateHistory: v.nullable(v.unknown()),
	locationLabel: v.nullable(v.pipe(v.string(), v.maxLength(MAX_SHORT))),
	cadastreInfo: v.optional(v.nullable(v.unknown())),
	harvestEthicsConfirmation: v.optional(v.nullable(v.unknown())),
	environmentExposure: v.optional(
		v.picklist(['OPEN', 'EDGE', 'FOREST_DENSE'] as const)
	),
	yrsAtCapture: v.optional(v.nullable(v.unknown())),
	capturedAt: v.pipe(v.string(), v.maxLength(MAX_SHORT))
});

const parkingSchema = v.nullable(
	v.object({
		latitude: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
		longitude: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
		accuracyMeters: v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100_000))),
		savedAt: v.pipe(v.string(), v.maxLength(MAX_SHORT))
	})
);

const appearanceSettingsSchema = v.optional(
	v.object({
		outdoorMode: v.boolean(),
		darkMode: v.optional(v.boolean()),
		simpleMode: v.optional(v.boolean()),
		locale: v.optional(v.pipe(v.string(), v.maxLength(16)))
	})
);

const apiSettingsSchema = v.optional(
	v.object({
		ignMap: v.boolean(),
		ignCadastre: v.boolean(),
		ignProtectedAreas: v.boolean(),
		openMeteoForecast: v.boolean(),
		openMeteoArchive: v.boolean(),
		nominatim: v.boolean(),
		servicePublicAnnuaire: v.boolean()
	})
);

export const yamadoriArchiveDataSchema = v.object({
	version: v.literal(ARCHIVE_FORMAT_VERSION),
	trees: v.pipe(v.array(treeArchiveSchema), v.maxLength(MAX_TREES)),
	parking: parkingSchema,
	appearanceSettings: appearanceSettingsSchema,
	apiSettings: apiSettingsSchema
});

/** Parse and validate decrypted archive JSON. Throws ArchiveError on failure. */
export function parseArchivePayload(raw: unknown): YamadoriArchiveData {
	const result = v.safeParse(yamadoriArchiveDataSchema, raw);
	if (!result.success) {
		throw new ArchiveError('ARCHIVE_INVALID_PAYLOAD', m.archive_invalid_payload());
	}
	return result.output as unknown as YamadoriArchiveData;
}
