import { debugLog } from '$lib/utils/debug-log';

type TapParams = {
	onactivate: (event: Event) => void;
	label?: string;
};

function createTapDeduper() {
	let lastAt = 0;
	return () => {
		const now = Date.now();
		if (now - lastAt < 350) {
			return false;
		}
		lastAt = now;
		return true;
	};
}

export function nativeTap(node: HTMLElement, params: TapParams) {
	let onactivate = params.onactivate;
	let label = params.label ?? 'tap';
	const shouldHandle = createTapDeduper();

	function isDisabled(): boolean {
		return (
			node.hasAttribute('disabled') ||
			(node instanceof HTMLButtonElement && node.disabled)
		);
	}

	function activate(event: Event) {
		if (!shouldHandle() || isDisabled()) {
			return;
		}
		// #region agent log
		debugLog('nativeTap', 'activated', { label, type: event.type }, 'H50');
		// #endregion
		onactivate(event);
	}

	node.addEventListener('pointerup', activate, { passive: true });
	node.addEventListener('click', activate);

	return {
		update(next: TapParams) {
			onactivate = next.onactivate;
			label = next.label ?? 'tap';
		},
		destroy() {
			node.removeEventListener('pointerup', activate);
			node.removeEventListener('click', activate);
		}
	};
}

type SpeciesDelegateParams = {
	onSelect: (name: string, event: Event) => void;
};

export function speciesPillDelegate(node: HTMLElement, params: SpeciesDelegateParams) {
	let onSelect = params.onSelect;
	const shouldHandle = createTapDeduper();

	function handle(event: Event) {
		if (!shouldHandle()) {
			return;
		}

		const pill = (event.target as HTMLElement | null)?.closest('[data-species-pill]');
		if (!pill || !(pill instanceof HTMLButtonElement) || pill.disabled) {
			return;
		}

		const name = pill.dataset.speciesPill;
		if (!name) {
			return;
		}

		// #region agent log
		debugLog('speciesPillDelegate', 'pill native tap', { name, type: event.type }, 'H50');
		// #endregion
		onSelect(name, event);
	}

	node.addEventListener('pointerup', handle, { capture: true, passive: true });
	node.addEventListener('click', handle, { capture: true });

	return {
		update(next: SpeciesDelegateParams) {
			onSelect = next.onSelect;
		},
		destroy() {
			node.removeEventListener('pointerup', handle, { capture: true });
			node.removeEventListener('click', handle, { capture: true });
		}
	};
}

export type CaptureFormHandlers = {
	onSpecies: (name: string, event: Event) => void;
	onSubmit: (event: Event) => void;
	onClimateRetry: () => void;
};

export function captureFormRoot(node: HTMLElement, handlers: CaptureFormHandlers) {
	let h = handlers;
	const shouldHandle = createTapDeduper();

	function handle(event: Event) {
		if (!shouldHandle()) {
			return;
		}

		const el = (event.target as HTMLElement | null)?.closest('[data-capture-action]');
		if (!el || (el instanceof HTMLButtonElement && el.disabled)) {
			return;
		}

		const action = el.getAttribute('data-capture-action');
		if (action === 'species') {
			const name = el.getAttribute('data-species-value');
			if (!name) {
				return;
			}
			// #region agent log
			debugLog('captureFormRoot', 'species', { name, type: event.type }, 'H53');
			// #endregion
			h.onSpecies(name, event);
			return;
		}

		if (action === 'submit') {
			// #region agent log
			debugLog('captureFormRoot', 'submit', { type: event.type }, 'H53');
			// #endregion
			h.onSubmit(event);
			return;
		}

		if (action === 'climate-retry') {
			// #region agent log
			debugLog('captureFormRoot', 'climate-retry', { type: event.type }, 'H53');
			// #endregion
			h.onClimateRetry();
		}
	}

	node.addEventListener('pointerup', handle, { capture: true, passive: true });
	node.addEventListener('click', handle, { capture: true });

	return {
		update(next: CaptureFormHandlers) {
			h = next;
		},
		destroy() {
			node.removeEventListener('pointerup', handle, { capture: true });
			node.removeEventListener('click', handle, { capture: true });
		}
	};
}
