export type FetchSignalOptions = {
	signal?: AbortSignal;
};

export function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new DOMException('The operation was aborted', 'AbortError');
	}
}

/** Combines an optional external abort with a timeout into one signal. */
export function createTimedAbortSignal(
	timeoutMs: number,
	external?: AbortSignal
): { signal: AbortSignal; dispose: () => void } {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	const onExternalAbort = () => controller.abort();

	if (external) {
		if (external.aborted) {
			controller.abort();
		} else {
			external.addEventListener('abort', onExternalAbort, { once: true });
		}
	}

	return {
		signal: controller.signal,
		dispose: () => {
			clearTimeout(timeoutId);
			external?.removeEventListener('abort', onExternalAbort);
		}
	};
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}
