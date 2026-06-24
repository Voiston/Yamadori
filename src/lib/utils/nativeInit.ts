import { App } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeApp } from '$lib/utils/platform';

function updateViewportInsets(): void {
	if (typeof window === 'undefined') {
		return;
	}

	const viewport = window.visualViewport;
	if (!viewport) {
		return;
	}

	const bottomInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
	document.documentElement.style.setProperty('--inset-bottom', `${bottomInset}px`);
}

/** Keeps --inset-bottom in sync when env(safe-area-inset-bottom) is 0 in the WebView (ex. barre 3 boutons Xiaomi). */
export function initViewportInsets(): () => void {
	if (!isNativeApp() || typeof window === 'undefined') {
		return () => {};
	}

	updateViewportInsets();

	const viewport = window.visualViewport;
	viewport?.addEventListener('resize', updateViewportInsets);
	viewport?.addEventListener('scroll', updateViewportInsets);
	window.addEventListener('resize', updateViewportInsets);

	return () => {
		viewport?.removeEventListener('resize', updateViewportInsets);
		viewport?.removeEventListener('scroll', updateViewportInsets);
		window.removeEventListener('resize', updateViewportInsets);
		document.documentElement.style.removeProperty('--inset-bottom');
	};
}

export async function applyStatusBarForAppearance(
	outdoorMode: boolean,
	darkMode: boolean
): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	try {
		if (outdoorMode) {
			await StatusBar.setStyle({ style: Style.Light });
			await StatusBar.setBackgroundColor({ color: '#ffffff' });
		} else if (darkMode) {
			await StatusBar.setStyle({ style: Style.Light });
			await StatusBar.setBackgroundColor({ color: '#000000' });
		} else {
			await StatusBar.setStyle({ style: Style.Dark });
			await StatusBar.setBackgroundColor({ color: '#1a2e1a' });
		}
	} catch {
		// Status bar plugin unavailable.
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
