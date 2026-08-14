import { App } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { SystemBars, SystemBarsStyle, type PluginListenerHandle } from '@capacitor/core';
import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
import { SafeAreaInsets, type SafeAreaInsetsPayload } from '$lib/utils/safeAreaInsetsPlugin';

/** Fallback when le mode système n'est pas exposé (vieille build). */
export const THREE_BUTTON_NAV_THRESHOLD_PX = 36;

/** Plafond OEM pour la barre 3 boutons (évite un vide énorme si surévalué). */
export const BUTTON_NAV_INSET_MAX_PX = 48;

/** Marge basse en mode gestes (onboarding, footer capture). */
export const GESTURE_CLEARANCE_PX = 18;

/** Marge légère pour la barre d'onglets en mode gestes. */
export const GESTURE_UI_BREATHING_PX = 10;

function applyGestureClearance(): void {
	document.documentElement.style.setProperty('--gesture-clearance', `${GESTURE_CLEARANCE_PX}px`);
}

function clearGestureClearance(): void {
	document.documentElement.style.removeProperty('--gesture-clearance');
}

let nativeBottomInset = 0;
let nativeNavMode: SafeAreaInsetsPayload['mode'];
let nativeInsetsBound = false;

function setNativeInsetsBound(bound: boolean): void {
	nativeInsetsBound = bound;
}

function applyBottomInset(px: number): void {
	document.documentElement.style.setProperty('--inset-bottom', `${px}px`);
}

function capButtonNavInset(px: number): number {
	return Math.min(px, BUTTON_NAV_INSET_MAX_PX);
}

/** Applies full inset only for 3-button nav; gesture nav keeps layout like before. */
export function applyNativeBottomInset(
	measuredBottom: number,
	options?: { nativeMeasured?: boolean }
): void {
	if (measuredBottom >= THREE_BUTTON_NAV_THRESHOLD_PX) {
		document.documentElement.dataset.navBar = 'buttons';
		clearGestureClearance();
		applyBottomInset(capButtonNavInset(measuredBottom));
		return;
	}

	if (options?.nativeMeasured) {
		document.documentElement.dataset.navBar = 'gesture';
		clearGestureClearance();
	} else {
		delete document.documentElement.dataset.navBar;
		clearGestureClearance();
	}
	applyBottomInset(0);
}

export function applyNavInsets(insets: SafeAreaInsetsPayload): void {
	nativeBottomInset = insets.bottom ?? 0;
	nativeNavMode = insets.mode;

	if (insets.mode === 'gesture') {
		document.documentElement.dataset.navBar = 'gesture';
		applyBottomInset(0);
		applyGestureClearance();
		return;
	}

	if (insets.mode === 'buttons') {
		document.documentElement.dataset.navBar = 'buttons';
		clearGestureClearance();
		applyBottomInset(capButtonNavInset(nativeBottomInset));
		return;
	}

	applyNativeBottomInset(nativeBottomInset, { nativeMeasured: nativeInsetsBound });
}

function updateViewportInsets(): void {
	if (typeof window === 'undefined') {
		return;
	}

	if (nativeInsetsBound) {
		applyNavInsets({ top: 0, bottom: nativeBottomInset, mode: nativeNavMode });
		return;
	}

	const viewport = window.visualViewport;
	const fromViewport = viewport
		? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
		: 0;

	applyNativeBottomInset(Math.max(fromViewport, nativeBottomInset));
}

/** Keeps --inset-bottom in sync when env(safe-area-inset-bottom) is 0 in the WebView (ex. barre 3 boutons). */
export function initViewportInsets(): () => void {
	if (!isNativeApp() || typeof window === 'undefined') {
		return () => {};
	}

	let insetListener: PluginListenerHandle | undefined;

	const bindNativeInsets = async () => {
		if (!isAndroidApp()) {
			return;
		}

		try {
			const insets = await SafeAreaInsets.getInsets();
			setNativeInsetsBound(true);
			applyNavInsets(insets);
			insetListener = await SafeAreaInsets.addListener('insetsChange', (event) => {
				applyNavInsets(event);
			});
		} catch {
			setNativeInsetsBound(false);
			// Native plugin unavailable (web preview, older build).
		}
	};

	void bindNativeInsets();
	updateViewportInsets();

	const viewport = window.visualViewport;
	viewport?.addEventListener('resize', updateViewportInsets);
	viewport?.addEventListener('scroll', updateViewportInsets);
	window.addEventListener('resize', updateViewportInsets);

	return () => {
		void insetListener?.remove();
		viewport?.removeEventListener('resize', updateViewportInsets);
		viewport?.removeEventListener('scroll', updateViewportInsets);
		window.removeEventListener('resize', updateViewportInsets);
		nativeBottomInset = 0;
		nativeNavMode = undefined;
		setNativeInsetsBound(false);
		clearGestureClearance();
		delete document.documentElement.dataset.navBar;
		document.documentElement.style.removeProperty('--inset-bottom');
	};
}

export async function applyStatusBarForAppearance(
	outdoorMode: boolean,
	_darkMode: boolean
): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	try {
		await SystemBars.setStyle({
			style: outdoorMode ? SystemBarsStyle.Light : SystemBarsStyle.Dark
		});
	} catch {
		// System Bars API unavailable.
	}
}

/** @deprecated Use applyStatusBarForAppearance */
export async function applyStatusBarForOutdoorMode(outdoorMode: boolean): Promise<void> {
	await applyStatusBarForAppearance(outdoorMode, false);
}

export async function initNativeUi(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	await applyStatusBarForAppearance(false, false);

	try {
		await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
	} catch {
		// Keyboard plugin unavailable.
	}
}

export async function getAppVersionLabel(): Promise<string | null> {
	if (!isNativeApp()) {
		return null;
	}

	try {
		const info = await App.getInfo();
		return `${info.version} (${info.build})`;
	} catch {
		return null;
	}
}
