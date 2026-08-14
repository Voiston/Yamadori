import { createTapDeduper } from '$lib/utils/tap-dedupe';

type TapParams = {
	onactivate: (event: Event) => void;
	label?: string;
};

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
			h.onSpecies(name, event);
			return;
		}

		if (action === 'submit') {
			h.onSubmit(event);
			return;
		}

		if (action === 'climate-retry') {
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
