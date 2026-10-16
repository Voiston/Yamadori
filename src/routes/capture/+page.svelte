<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import CaptureForm from '$lib/components/CaptureForm.svelte';
	import FirstCaptureGuide from '$lib/components/FirstCaptureGuide.svelte';
	import FocusModeCoach from '$lib/components/FocusModeCoach.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import {
		advanceOnboardingPhase,
		onboardingState,
		setCaptureSavedDuringTutorial
	} from '$lib/stores/onboarding.svelte';
	import { treeStore } from '$lib/stores/trees.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { isNativeApp } from '$lib/utils/platform';
	import { releaseOnboardingUiLocks } from '$lib/utils/onboardingUi';
	import { teardownCaptureTutorial } from '$lib/utils/captureTutorialTeardown';
	import {
		hasSeenFocusModeCoach,
		markFocusModeCoachSeen,
		shouldShowFocusModeCoach
	} from '$lib/utils/focusModeCoach';
	import { onMount, tick } from 'svelte';

	const CAPTURE_ENTRY_KEY = 'yamadori-capture-entry';

	function bumpCaptureEntry(): number {
		if (!isNativeApp()) {
			return 1;
		}
		const entry = Number(sessionStorage.getItem(CAPTURE_ENTRY_KEY) ?? 0) + 1;
		sessionStorage.setItem(CAPTURE_ENTRY_KEY, String(entry));
		return entry;
	}

	let formKey = $state(bumpCaptureEntry());
	let skipNextCaptureNavigateBump = true;
	let guideDismissed = $state(false);

	let showCaptureGuide = $derived(
		!guideDismissed &&
			isNativeApp() &&
			onboardingState.loaded &&
			onboardingState.phase === 'capture'
	);

	let focusCoachReady = $state(false);
	let focusCoachSeen = $state(false);
	let focusCoachActive = $state(false);

	onMount(() => {
		focusCoachSeen = hasSeenFocusModeCoach();
		focusCoachReady = true;
	});

	let focusCoachEligible = $derived(
		focusCoachReady &&
			shouldShowFocusModeCoach({
				treesReady: treeStore.indexReady,
				treeCount: treeStore.trees.length,
				onboardingDone: onboardingState.loaded && onboardingState.phase === 'done',
				tutorialActive: showCaptureGuide,
				simpleMode: appearanceSettingsState.simpleMode,
				seen: focusCoachSeen
			})
	);

	$effect(() => {
		if (focusCoachEligible) {
			focusCoachActive = true;
		}
	});

	let showFocusCoach = $derived(focusCoachActive);

	function dismissFocusCoach(): void {
		markFocusModeCoachSeen();
		focusCoachSeen = true;
		focusCoachActive = false;
	}

	async function handleCaptureGuideSkip() {
		guideDismissed = true;
		teardownCaptureTutorial();
		await tick();
		setCaptureSavedDuringTutorial(false);
		await advanceOnboardingPhase('protection');
		await releaseOnboardingUiLocks();
	}

	afterNavigate(({ to }) => {
		if (!isNativeApp() || !to?.url.pathname.endsWith('/capture')) {
			return;
		}
		if (skipNextCaptureNavigateBump) {
			skipNextCaptureNavigateBump = false;
			return;
		}
		formKey = bumpCaptureEntry();
	});

	let pageTitle = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.title_capture();
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

{#key formKey}
	<div class="capture-tutorial-root relative flex min-h-0 flex-1 flex-col">
		<CaptureForm tutorialActive={showCaptureGuide} />
		{#if showCaptureGuide}
			<FirstCaptureGuide onskip={() => void handleCaptureGuideSkip()} />
		{:else if showFocusCoach}
			<FocusModeCoach ondismiss={dismissFocusCoach} />
		{/if}
	</div>
{/key}
