import { get, set } from 'idb-keyval';
import type { SyncMutation } from '$lib/types/sync';
import { toStorable } from '$lib/utils/idb-store';

const QUEUE_KEY = 'yamadori-sync-queue';

export async function loadQueue(): Promise<SyncMutation[]> {
	return (await get<SyncMutation[]>(QUEUE_KEY)) ?? [];
}

export async function saveQueue(queue: SyncMutation[]): Promise<SyncMutation[]> {
	await set(QUEUE_KEY, toStorable(queue));
	return queue;
}

export async function enqueueMutation(mutation: SyncMutation): Promise<void> {
	const queue = await loadQueue();
	const withoutDuplicate = queue.filter((item) => {
		if (item.type === 'delete' && mutation.type === 'delete') {
			return item.treeId !== mutation.treeId;
		}
		if (item.type === 'upsert' && mutation.type === 'upsert') {
			return item.treeId !== mutation.treeId;
		}
		if (item.type === 'upsert' && mutation.type === 'delete') {
			return item.treeId !== mutation.treeId;
		}
		return true;
	});

	if (mutation.type === 'delete') {
		const filtered = withoutDuplicate.filter(
			(item) => !(item.type === 'upsert' && item.treeId === mutation.treeId)
		);
		await saveQueue([...filtered, mutation]);
		return;
	}

	await saveQueue([...withoutDuplicate, mutation]);
}

export async function dropMutationsForTree(treeId: string): Promise<void> {
	const queue = await loadQueue();
	await saveQueue(queue.filter((item) => item.treeId !== treeId));
}

export async function clearQueue(): Promise<void> {
	await saveQueue([]);
}
