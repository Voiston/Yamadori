import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockClearAllLocationLabels = vi.fn();
const mockUpdateLocationLabel = vi.fn();
const mockCanUseApi = vi.fn();
const mockReverseGeocode = vi.fn();
const mockPreferencesGet = vi.fn();
const mockPreferencesSet = vi.fn();

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: (...args: unknown[]) => mockPreferencesGet(...args),
		set: (...args: unknown[]) => mockPreferencesSet(...args)
	}
}));

vi.mock('$lib/utils/apiPolicy', () => ({
	canUseApi: (...args: unknown[]) => mockCanUseApi(...args)
}));

vi.mock('$lib/utils/geocoding', () => ({
	reverseGeocode: (...args: unknown[]) => mockReverseGeocode(...args)
}));

vi.mock('$lib/stores/trees.svelte', () => ({
	treeStore: {
		indexReady: true,
		loaded: true,
		trees: [
			{
				id: 't1',
				latitude: 48.85,
				longitude: 2.35,
				locationLabel: 'Paris',
				mediaHydration: 'thumbs',
				photos: [''],
				photoThumbs: ['data:image/jpeg;base64,thumb']
			}
		]
	},
	clearAllLocationLabels: (...args: unknown[]) => mockClearAllLocationLabels(...args),
	updateLocationLabel: (...args: unknown[]) => mockUpdateLocationLabel(...args)
}));

import { refreshLocationLabelsForUiLocale } from './refreshLocationLabels';

describe('refreshLocationLabelsForUiLocale', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('window', {});
		mockPreferencesGet.mockResolvedValue({ value: null });
		mockPreferencesSet.mockResolvedValue(undefined);
		mockCanUseApi.mockReturnValue(true);
		mockReverseGeocode.mockResolvedValue('Nouveau label');
		mockClearAllLocationLabels.mockResolvedValue(undefined);
		mockUpdateLocationLabel.mockResolvedValue(undefined);
	});

	it('clears labels then refreshes targets when locale changes', async () => {
		await refreshLocationLabelsForUiLocale('en');

		expect(mockClearAllLocationLabels).toHaveBeenCalledTimes(1);
		expect(mockUpdateLocationLabel).toHaveBeenCalledWith('t1', 'Nouveau label');
		expect(mockPreferencesSet).toHaveBeenCalledWith({
			key: 'yamadori-location-labels-locale',
			value: 'en'
		});
	});

	it('skips when stored locale already matches', async () => {
		mockPreferencesGet.mockResolvedValue({ value: 'en' });

		await refreshLocationLabelsForUiLocale('en');

		expect(mockClearAllLocationLabels).not.toHaveBeenCalled();
	});
});
