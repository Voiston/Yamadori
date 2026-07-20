export function treeMarkerCss(outdoor: boolean): string {
	return outdoor
		? 'background:#000000;width:16px;height:16px;border-radius:50%;border:3px solid #ffffff;box-shadow:none;'
		: 'background:#2d4a2d;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
}

export function parkingMarkerCss(outdoor: boolean): string {
	return outdoor
		? 'background:#000000;width:18px;height:18px;border-radius:50%;border:3px solid #ffffff;box-shadow:none;'
		: 'background:#ea580c;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35);';
}

export function focusCenterMarkerCss(outdoor: boolean): string {
	return outdoor
		? 'background:#000000;width:16px;height:16px;border-radius:50%;border:3px solid #ffffff;box-shadow:none;'
		: 'background:#2d4a2d;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
}
