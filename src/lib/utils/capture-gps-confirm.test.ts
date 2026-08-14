import { describe, expect, it } from 'vitest';
import {
	needsLocationPromptBeforePhoto,
	shouldConfirmGpsBeforeSave
} from './capture-gps-confirm';

const position = (accuracyMeters: number | null) => ({
	latitude: 48.1,
	longitude: 2.3,
	accuracyMeters
});

describe('shouldConfirmGpsBeforeSave', () => {
	it('requires confirmation when position is missing', () => {
		expect(shouldConfirmGpsBeforeSave(null)).toBe(true);
	});

	it('requires confirmation when accuracy is unknown', () => {
		expect(shouldConfirmGpsBeforeSave(position(null))).toBe(true);
	});

	it('requires confirmation when accuracy is poor', () => {
		expect(shouldConfirmGpsBeforeSave(position(26))).toBe(true);
	});

	it('does not require confirmation at the poor threshold boundary', () => {
		expect(shouldConfirmGpsBeforeSave(position(25))).toBe(false);
	});

	it('does not require confirmation when accuracy is good', () => {
		expect(shouldConfirmGpsBeforeSave(position(10))).toBe(false);
	});
});

describe('needsLocationPromptBeforePhoto', () => {
	it('prompts when permission can still show the system dialog', () => {
		expect(
			needsLocationPromptBeforePhoto({
				permissionStatus: 'prompt',
				hasPosition: false,
				locationError: ''
			})
		).toBe('prompt');
	});

	it('prompts when permission is denied', () => {
		expect(
			needsLocationPromptBeforePhoto({
				permissionStatus: 'denied',
				hasPosition: false,
				locationError: ''
			})
		).toBe('denied');
	});

	it('prompts when only coarse location is granted', () => {
		expect(
			needsLocationPromptBeforePhoto({
				permissionStatus: 'coarse-only',
				hasPosition: true,
				locationError: ''
			})
		).toBe('coarse-only');
	});

	it('prompts when location is unsupported', () => {
		expect(
			needsLocationPromptBeforePhoto({
				permissionStatus: 'unsupported',
				hasPosition: false,
				locationError: ''
			})
		).toBe('unsupported');
	});

	it('prompts when there is an error and no position', () => {
		expect(
			needsLocationPromptBeforePhoto({
				permissionStatus: 'granted',
				hasPosition: false,
				locationError: 'Location denied'
			})
		).toBe('unavailable');
	});

	it('does not prompt while still acquiring with no error', () => {
		expect(
			needsLocationPromptBeforePhoto({
				permissionStatus: 'granted',
				hasPosition: false,
				locationError: ''
			})
		).toBeNull();
	});

	it('does not prompt when a position is available and permission is granted', () => {
		expect(
			needsLocationPromptBeforePhoto({
				permissionStatus: 'granted',
				hasPosition: true,
				locationError: ''
			})
		).toBeNull();
	});

	it('does not prompt on stale error if a position already exists', () => {
		expect(
			needsLocationPromptBeforePhoto({
				permissionStatus: 'granted',
				hasPosition: true,
				locationError: 'Temporary glitch'
			})
		).toBeNull();
	});
});
