const CONE_CLASS = 'yamadori-user-marker__cone';
const DOT_CLASS = 'yamadori-user-marker__dot';

export function createUserHeadingMarkerElement(outdoor: boolean): HTMLDivElement {
	const root = document.createElement('div');
	root.style.cssText =
		'position:relative;width:72px;height:72px;pointer-events:none;';

	const cone = document.createElement('div');
	cone.className = CONE_CLASS;
	cone.style.cssText =
		'position:absolute;inset:0;transform-origin:50% 50%;transition:transform 0.2s ease-out;';

	const coneColor = outdoor ? 'rgba(0,0,0,0.22)' : 'rgba(37,99,235,0.28)';
	cone.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
		<path d="M36 8 L58 58 L36 48 L14 58 Z" fill="${coneColor}" />
	</svg>`;

	const dot = document.createElement('div');
	dot.className = DOT_CLASS;
	dot.style.cssText = outdoor
		? 'position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#000000;border:3px solid #ffffff;box-shadow:none;'
		: 'position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35);';

	root.append(cone, dot);
	return root;
}

export function createSimpleUserMarkerElement(outdoor: boolean): HTMLDivElement {
	const el = document.createElement('div');
	el.style.cssText = outdoor
		? 'background:#000000;width:18px;height:18px;border-radius:50%;border:3px solid #ffffff;box-shadow:none;'
		: 'background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35);';
	return el;
}

export function updateUserHeadingMarker(
	element: HTMLElement,
	headingDeg: number | null,
	showCone: boolean
): void {
	const cone = element.querySelector(`.${CONE_CLASS}`) as HTMLElement | null;
	if (!cone) {
		return;
	}
	cone.style.display = showCone && headingDeg !== null ? 'block' : 'none';
	if (showCone && headingDeg !== null) {
		cone.style.transform = `rotate(${headingDeg}deg)`;
	}
}
