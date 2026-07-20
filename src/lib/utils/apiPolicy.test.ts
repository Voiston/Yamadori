import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSettingsState } from '$lib/stores/apiSettings.svelte';
import { onlineState } from '$lib/utils/online.svelte';
import { canUseApi, getApiDisabledError, isApiEnabled } from '$lib/utils/apiPolicy';

describe('apiPolicy', () => {
	beforeEach(() => {
		apiSettingsState.loaded = true;
		apiSettingsState.ignMap = true;
		apiSettingsState.ignCadastre = true;
		apiSettingsState.ignProtectedAreas = true;
		apiSettingsState.openMeteoForecast = true;
		apiSettingsState.openMeteoArchive = true;
		apiSettingsState.nominatim = true;
		apiSettingsState.servicePublicAnnuaire = true;
		onlineState.online = true;
	});

	afterEach(() => {
		apiSettingsState.loaded = true;
		onlineState.online = true;
	});

	it('treats all APIs as disabled while settings are loading', () => {
		apiSettingsState.loaded = false;
		apiSettingsState.nominatim = true;
		expect(isApiEnabled('nominatim')).toBe(false);
		expect(canUseApi('nominatim')).toBe(false);
	});

	it('respects user preference when loaded', () => {
		apiSettingsState.nominatim = false;
		expect(isApiEnabled('nominatim')).toBe(false);
		expect(canUseApi('nominatim')).toBe(false);
	});

	it('requires network for canUseApi', () => {
		apiSettingsState.openMeteoForecast = false;
		onlineState.online = true;
		expect(canUseApi('openMeteoForecast')).toBe(false);

		apiSettingsState.openMeteoForecast = true;
		onlineState.online = false;
		expect(canUseApi('openMeteoForecast')).toBe(false);

		onlineState.online = true;
		expect(canUseApi('openMeteoForecast')).toBe(true);
	});

	it('returns a service-specific disabled error message', () => {
		expect(getApiDisabledError('ignMap')).toContain('IGN');
		expect(getApiDisabledError('nominatim')).toContain('Nominatim');
	});
});
