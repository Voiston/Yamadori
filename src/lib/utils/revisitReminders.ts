import { speciesDisplayName } from '$lib/constants/species-i18n';
import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
import { treeStore, updateTree, runPersistBatch } from '$lib/stores/trees.svelte';
import { refreshWeekWindow, weekWindowState } from '$lib/stores/weekWindow.svelte';
import type { Tree } from '$lib/types/tree';
import { isAndroidApp } from '$lib/utils/platform';
import {
	cancelHarvestWindowNotification,
	cancelRevisitDateNotification,
	fireWindowOpenedNotification,
	scheduleHarvestWindowNotification,
	scheduleRevisitDateNotification
} from '$lib/utils/revisitNotifications';
import { isHarvestWindowRank, nextYrsNotifyAt, treeHarvestInWindow } from '$lib/utils/weekWindow';

function treeTitle(tree: Pick<Tree, 'species'>): string {
	void appearanceSettingsState.locale;
	const raw = tree.species.trim();
	return raw ? speciesDisplayName(raw) : tree.species;
}

export async function rescheduleRevisitDateNotifications(trees: Tree[]): Promise<void> {
	if (!isAndroidApp()) return;
	await refreshWeekWindow(trees);
	await runPersistBatch(async () => {
		for (const tree of trees) {
			if (tree.nextRevisitAt) {
				try {
					const result = await scheduleRevisitDateNotification(
						tree.id,
						treeTitle(tree),
						tree.nextRevisitAt,
						{ alreadySentFor: tree.dateNotifySentFor }
					);
					if (result === 'fired' && tree.dateNotifySentFor !== tree.nextRevisitAt) {
						await updateTree(tree.id, { dateNotifySentFor: tree.nextRevisitAt });
					}
				} catch (error) {
					console.error('scheduleRevisitDateNotification failed:', error);
				}
			} else {
				await cancelRevisitDateNotification(tree.id);
				if (tree.dateNotifySentFor) {
					await updateTree(tree.id, { dateNotifySentFor: null });
				}
			}
			if (tree.notifyOnWindow) {
				try {
					await scheduleHarvestWindowNotification(tree, treeTitle(tree), {
						yrsAt: nextYrsNotifyAt(weekWindowState.viabilityById[tree.id])
					});
				} catch (error) {
					console.error('scheduleHarvestWindowNotification failed:', error);
				}
			} else {
				await cancelHarvestWindowNotification(tree.id);
			}
		}
	});
}

export async function processWindowNotifications(trees: Tree[]): Promise<void> {
	if (!isAndroidApp() || !treeStore.loaded) return;

	await refreshWeekWindow(trees);

	await runPersistBatch(async () => {
		for (const tree of trees) {
			if (!tree.notifyOnWindow) continue;
			const yrsOpen = isHarvestWindowRank(weekWindowState.byId[tree.id]?.rank);
			const calendarOpen = treeHarvestInWindow(tree);
			const open = yrsOpen || calendarOpen;
			const armed = tree.windowNotifyArmed === true;

			if (open && armed) {
				try {
					await fireWindowOpenedNotification(tree.id, treeTitle(tree));
				} catch (error) {
					console.error('fireWindowOpenedNotification failed:', error);
				}
				await updateTree(tree.id, { windowNotifyArmed: false });
			} else if (!open && !armed) {
				await updateTree(tree.id, { windowNotifyArmed: true });
			}
		}
	});
}

export async function syncRevisitReminders(trees: Tree[]): Promise<void> {
	await rescheduleRevisitDateNotifications(trees);
	await processWindowNotifications(trees);
}
