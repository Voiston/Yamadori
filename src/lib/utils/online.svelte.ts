export const onlineState = $state({
	online: true,
	initialized: false
});

export function initOnlineState(): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	onlineState.online = navigator.onLine;
	onlineState.initialized = true;

	const handleOnline = () => {
		onlineState.online = true;
	};
	const handleOffline = () => {
		onlineState.online = false;
	};

	window.addEventListener('online', handleOnline);
	window.addEventListener('offline', handleOffline);

	return () => {
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
	};
}
