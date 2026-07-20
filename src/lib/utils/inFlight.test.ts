import { describe, expect, it } from 'vitest';
import { createInFlightMap } from './inFlight';

describe('createInFlightMap', () => {
	it('coalesces concurrent calls for the same key into one factory run', async () => {
		const map = createInFlightMap<number>();
		let runs = 0;

		const [a, b] = await Promise.all([
			map.run('k', async () => {
				runs += 1;
				await new Promise((r) => setTimeout(r, 20));
				return 42;
			}),
			map.run('k', async () => {
				runs += 1;
				return 99;
			})
		]);

		expect(a).toBe(42);
		expect(b).toBe(42);
		expect(runs).toBe(1);
	});

	it('allows a new run after the previous promise settles', async () => {
		const map = createInFlightMap<number>();
		let runs = 0;

		await map.run('k', async () => {
			runs += 1;
			return 1;
		});
		await map.run('k', async () => {
			runs += 1;
			return 2;
		});

		expect(runs).toBe(2);
	});
});
