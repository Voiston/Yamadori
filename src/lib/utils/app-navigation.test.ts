import { describe, expect, it } from 'vitest';
import { getBackNavigationTarget } from './app-navigation';

describe('getBackNavigationTarget', () => {
	it('sends settings child routes back to settings', () => {
		for (const routeId of [
			'/settings/privacy',
			'/settings/legal',
			'/settings/terms',
			'/settings/sale'
		]) {
			expect(getBackNavigationTarget(routeId, null)).toEqual({
				showBack: true,
				href: '/settings'
			});
		}
	});

	it('sends the settings root back home', () => {
		expect(getBackNavigationTarget('/settings', null)).toEqual({
			showBack: true,
			href: '/'
		});
	});
});
