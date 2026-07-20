let queue: Promise<void> = Promise.resolve();
let activeTaskCount = 0;

/** Serialize native Play Billing calls — only one operation at a time. */
export function runBillingTask<T>(fn: () => Promise<T>): Promise<T> {
	activeTaskCount += 1;
	const run = async (): Promise<T> => {
		try {
			return await fn();
		} finally {
			activeTaskCount -= 1;
		}
	};

	const result = queue.then(run, run);
	queue = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}

export function isBillingTaskRunning(): boolean {
	return activeTaskCount > 0;
}

/** Wait until all queued billing tasks have settled. */
export function waitForBillingIdle(): Promise<void> {
	return queue.then(() => undefined);
}

/** @internal Test helper — reset queue between tests. */
export function resetBillingQueueForTests(): void {
	queue = Promise.resolve();
	activeTaskCount = 0;
}
