type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const installState = $state({
	canInstall: false,
	isInstalled: false,
	isIos: false
});

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function detectInstalled(): boolean {
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}

function detectIos(): boolean {
	return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function initInstallPrompt(): () => void {
	installState.isInstalled = detectInstalled();
	installState.isIos = detectIos();

	const handleBeforeInstall = (event: Event) => {
		event.preventDefault();
		deferredPrompt = event as BeforeInstallPromptEvent;
		installState.canInstall = true;
	};

	const handleInstalled = () => {
		deferredPrompt = null;
		installState.canInstall = false;
		installState.isInstalled = true;
	};

	window.addEventListener('beforeinstallprompt', handleBeforeInstall);
	window.addEventListener('appinstalled', handleInstalled);

	return () => {
		window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
		window.removeEventListener('appinstalled', handleInstalled);
	};
}

export async function promptInstall(): Promise<boolean> {
	if (!deferredPrompt) return false;
	await deferredPrompt.prompt();
	const { outcome } = await deferredPrompt.userChoice;
	deferredPrompt = null;
	installState.canInstall = false;
	if (outcome === 'accepted') {
		installState.isInstalled = true;
	}
	return outcome === 'accepted';
}
