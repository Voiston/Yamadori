import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
import type { ViabilityDay } from '$lib/types/agri';
import type { Tree } from '$lib/types/tree';
import type { YrsDecision } from '$lib/types/yrs';
import { resolveAgriData } from '$lib/utils/agriDataLoader';
import { enrichAgriData } from '$lib/utils/agriCache';
import { onlineState } from '$lib/utils/online.svelte';
import {
	evaluateWeekWindow,
	lastActivityAt,
	mergeWeekWindowWithRevisits,
	plantInputsFromTree,
	treeHarvestInWindow,
	weekWindowTreesSignature,
	type WeekWindowEntry
} from '$lib/utils/weekWindow';
import {
	findCachedForecast,
	findStaleCachedForecast,
	gridKeyForCoordinates
} from '$lib/utils/weatherCache';

export const weekWindowState = $state({
	status: 'idle' as 'idle' | 'loading' | 'ready',
	byId: {} as Record<string, WeekWindowEntry>,
	orderedIds: [] as string[],
	viabilityById: {} as Record<string, ViabilityDay[]>
});

let lastSignature = '';
let generation = 0;
let inFlight: Promise<void> | null = null;

function treesSignature(trees: Tree[], simpleMode: boolean, online: boolean): string {
	return weekWindowTreesSignature(trees, simpleMode, online);
}

async function decisionsByGrid(
	trees: Tree[],
	online: boolean
): Promise<{
	decisions: Map<string, YrsDecision | null>;
	viabilityById: Record<string, ViabilityDay[]>;
}> {
	const decisions = new Map<string, YrsDecision | null>();
	const viabilityById: Record<string, ViabilityDay[]> = {};
	const groups = new Map<string, Tree[]>();

	for (const tree of trees) {
		if (tree.latitude === null || tree.longitude === null) continue;
		const key = gridKeyForCoordinates(tree.latitude, tree.longitude);
		const group = groups.get(key);
		if (group) {
			group.push(tree);
		} else {
			groups.set(key, [tree]);
		}
	}

	for (const group of groups.values()) {
		const representative = group[0];
		if (!representative || representative.latitude === null || representative.longitude === null) {
			continue;
		}

		const { latitude, longitude } = representative;
		await resolveAgriData(latitude, longitude, {}, online);

		const cached =
			(await findCachedForecast(latitude, longitude)) ??
			(await findStaleCachedForecast(latitude, longitude));

		for (const tree of group) {
			if (!cached) {
				decisions.set(tree.id, null);
				continue;
			}
			const enriched = enrichAgriData(
				cached.entry.data,
				plantInputsFromTree(tree),
				cached.entry.forecastBody
			);
			decisions.set(tree.id, enriched.yrs?.decision ?? null);
			const days = enriched.weeklyViability?.days;
			if (days?.length) {
				viabilityById[tree.id] = days;
			}
		}
	}

	return { decisions, viabilityById };
}

export async function refreshWeekWindow(trees: Tree[]): Promise<void> {
	const simpleMode = appearanceSettingsState.simpleMode;
	const online = onlineState.online;
	const signature = treesSignature(trees, simpleMode, online);
	if (lastSignature === signature) {
		if (inFlight) await inFlight;
		return;
	}

	const gen = ++generation;
	lastSignature = signature;
	weekWindowState.status = 'loading';

	const run = (async () => {
		const now = new Date();
		let decisions = new Map<string, YrsDecision | null>();
		let viabilityById: Record<string, ViabilityDay[]> = {};

		if (!simpleMode) {
			try {
				const batch = await decisionsByGrid(trees, online);
				decisions = batch.decisions;
				viabilityById = batch.viabilityById;
			} catch (error) {
				console.error('refreshWeekWindow weather batch failed:', error);
			}
		}

		if (gen !== generation) return;

		const harvestEntries: WeekWindowEntry[] = [];
		for (const tree of trees) {
			const entry = evaluateWeekWindow({
				treeId: tree.id,
				hasGps: tree.latitude !== null && tree.longitude !== null,
				simpleMode,
				decision: decisions.get(tree.id) ?? null,
				inCalendar: treeHarvestInWindow(tree, now),
				lastActivityAt: lastActivityAt(tree),
				now
			});
			if (entry) harvestEntries.push(entry);
		}

		const sorted = mergeWeekWindowWithRevisits(harvestEntries, trees, now);
		const byId: Record<string, WeekWindowEntry> = {};
		for (const entry of sorted) {
			byId[entry.treeId] = entry;
		}

		weekWindowState.byId = byId;
		weekWindowState.orderedIds = sorted.map((entry) => entry.treeId);
		weekWindowState.viabilityById = viabilityById;
		weekWindowState.status = 'ready';
	})();

	inFlight = run;
	try {
		await run;
	} finally {
		if (inFlight === run) inFlight = null;
	}
}

export function getWeekWindowEntry(treeId: string): WeekWindowEntry | undefined {
	return weekWindowState.byId[treeId];
}
