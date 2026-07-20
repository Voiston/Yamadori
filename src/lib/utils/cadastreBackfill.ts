import { lookupCadastreForCoords } from '$lib/geo/providers/cadastre/dispatch';
import { canUseApi } from '$lib/utils/apiPolicy';
import { treesMissingCadastre, updateCadastre, runPersistBatch } from '$lib/stores/trees.svelte';

const DEBOUNCE_MS = 1_500;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;
const attemptedIds = new Set<string>();

export function scheduleCadastreBackfill(): void {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		debounceTimer = null;
		void runCadastreBackfill();
	}, DEBOUNCE_MS);
}

export async function runCadastreBackfill(): Promise<void> {
	if (running || !canUseApi('ignCadastre')) return;

	running = true;
	try {
		const pending = treesMissingCadastre().filter((tree) => !attemptedIds.has(tree.id));

		await runPersistBatch(async () => {
			for (const tree of pending) {
				if (!canUseApi('ignCadastre')) break;
				if (tree.latitude === null || tree.longitude === null) continue;

				attemptedIds.add(tree.id);

				try {
					const result = await lookupCadastreForCoords(tree.latitude, tree.longitude);
					if (result) {
						await updateCadastre(tree.id, result);
					}
				} catch {
					// Rattrapage silencieux — réessai possible à la prochaine session
				}
			}
		});
	} finally {
		running = false;
	}
}
