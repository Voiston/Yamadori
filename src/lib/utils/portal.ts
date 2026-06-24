export function portal(node: HTMLElement, target: HTMLElement | string = 'body') {
	if (typeof document === 'undefined') {
		return {};
	}

	const targetEl =
		typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
	targetEl?.appendChild(node);

	return {
		destroy() {
			node.remove();
		}
	};
}
