import { describe, expect, it, vi } from 'vitest';
import { isBillingTaskRunning, runBillingTask, waitForBillingIdle } from './billing-native-queue';

describe('billing-native-queue', () => {
	it('runs tasks sequentially', async () => {
		const order: number[] = [];

		const first = runBillingTask(async () => {
			order.push(1);
			await new Promise((resolve) => setTimeout(resolve, 10));
			order.push(2);
		});
		const second = runBillingTask(async () => {
			order.push(3);
		});

		await Promise.all([first, second]);
		expect(order).toEqual([1, 2, 3]);
	});

	it('tracks running state and idle wait', async () => {
		let releaseTask: (() => void) | undefined;
		const blocked = runBillingTask(
			() =>
				new Promise<void>((resolve) => {
					releaseTask = resolve;
				})
		);

		expect(isBillingTaskRunning()).toBe(true);
		const idlePromise = waitForBillingIdle();
		let idleResolved = false;
		void idlePromise.then(() => {
			idleResolved = true;
		});

		await vi.waitFor(() => expect(isBillingTaskRunning()).toBe(true));
		expect(idleResolved).toBe(false);

		releaseTask?.();
		await blocked;
		await idlePromise;
		expect(isBillingTaskRunning()).toBe(false);
	});
});
