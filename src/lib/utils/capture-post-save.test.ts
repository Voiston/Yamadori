import { describe, expect, it, vi } from 'vitest';
import { handlePostCaptureSaveNavigation } from './capture-post-save';

describe('handlePostCaptureSaveNavigation', () => {
	it('advances to protection during capture onboarding without going home', async () => {
		const advanceToProtection = vi.fn().mockResolvedValue(undefined);
		const markCaptureSavedDuringTutorial = vi.fn();
		const goHome = vi.fn().mockResolvedValue(undefined);

		await handlePostCaptureSaveNavigation({
			phase: 'capture',
			advanceToProtection,
			markCaptureSavedDuringTutorial,
			goHome
		});

		expect(markCaptureSavedDuringTutorial).toHaveBeenCalledOnce();
		expect(advanceToProtection).toHaveBeenCalledOnce();
		expect(goHome).not.toHaveBeenCalled();
	});

	it('navigates home when not in capture onboarding', async () => {
		const advanceToProtection = vi.fn();
		const markCaptureSavedDuringTutorial = vi.fn();
		const goHome = vi.fn().mockResolvedValue(undefined);

		await handlePostCaptureSaveNavigation({
			phase: 'done',
			advanceToProtection,
			markCaptureSavedDuringTutorial,
			goHome
		});

		expect(goHome).toHaveBeenCalledOnce();
		expect(advanceToProtection).not.toHaveBeenCalled();
		expect(markCaptureSavedDuringTutorial).not.toHaveBeenCalled();
	});
});
