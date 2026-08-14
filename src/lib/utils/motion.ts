import { cubicOut } from 'svelte/easing';
import { fade, fly, scale } from 'svelte/transition';
import type { TransitionConfig } from 'svelte/transition';

/** Durations aligned with CSS `--motion-*` tokens in `app.css`. */
export const MOTION_MS = {
	fast: 150,
	sheet: 200,
	toast: 180,
	backdrop: 180,
	pulse: 350,
	boot: 320,
	bootMin: 900
} as const;

const MOTION_EASING = cubicOut;

export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function motionDuration(ms: number): number {
	return prefersReducedMotion() ? 0 : ms;
}

export function sheetBackdrop(
	node: Element,
	_params?: Record<string, never>
): TransitionConfig {
	return fade(node, {
		duration: motionDuration(MOTION_MS.backdrop),
		easing: MOTION_EASING
	});
}

/**
 * Bottom sheet fly on narrow viewports; centered scale+fade from `sm` up.
 */
export function sheetPanel(node: Element, _params?: Record<string, never>): TransitionConfig {
	const duration = motionDuration(MOTION_MS.sheet);
	if (duration === 0) {
		return { duration: 0 };
	}

	const centered =
		typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;

	if (centered) {
		return scale(node, {
			duration,
			start: 0.96,
			easing: MOTION_EASING
		});
	}

	return fly(node, {
		y: 20,
		duration,
		easing: MOTION_EASING
	});
}

export function toastIn(node: Element, _params?: Record<string, never>): TransitionConfig {
	const duration = motionDuration(MOTION_MS.toast);
	if (duration === 0) {
		return { duration: 0 };
	}

	// Only animate Y/opacity — horizontal centering is handled by a flex wrapper
	// so we never fight Tailwind `-translate-x-1/2` on first paint.
	return {
		duration,
		easing: MOTION_EASING,
		css: (t) => {
			const y = (1 - t) * 12;
			return `opacity: ${t}; transform: translateY(${y}px)`;
		}
	};
}

export function toastOut(node: Element, _params?: Record<string, never>): TransitionConfig {
	const duration = motionDuration(MOTION_MS.fast);
	if (duration === 0) {
		return { duration: 0 };
	}

	return {
		duration,
		easing: MOTION_EASING,
		css: (t) => `opacity: ${t}; transform: translateY(0)`
	};
}
