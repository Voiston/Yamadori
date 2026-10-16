import { ArchiveError } from '$lib/utils/archive/types';

export type ErrorActionKind = 'retry' | 'link' | 'settings' | 'dismiss';

export type ErrorAction = {
	label: string;
	kind: ErrorActionKind;
	href?: string;
};

export type ErrorCopy = {
	what: string;
	why?: string;
	action: ErrorAction;
	code?: string;
};

export class UserFacingError extends Error {
	readonly copy: ErrorCopy;

	constructor(copy: ErrorCopy) {
		super(copy.what);
		this.name = 'UserFacingError';
		this.copy = copy;
	}
}

export function isErrorCopy(value: unknown): value is ErrorCopy {
	return (
		typeof value === 'object' &&
		value !== null &&
		'what' in value &&
		typeof (value as ErrorCopy).what === 'string' &&
		'action' in value &&
		typeof (value as ErrorCopy).action === 'object' &&
		(value as ErrorCopy).action !== null
	);
}

export function formatErrorToast(copy: ErrorCopy): string {
	const action = copy.action.label;
	if (copy.why) {
		const withWhy = `${copy.what} ${copy.why} — ${action}`;
		if (withWhy.length <= 120) return withWhy;
	}
	return `${copy.what} — ${action}`;
}

export function resolveErrorCopy(error: unknown, fallback: ErrorCopy): ErrorCopy {
	if (error instanceof UserFacingError) {
		return error.copy;
	}
	if (isErrorCopy(error)) {
		return error;
	}
	if (error instanceof ArchiveError && error.message.trim()) {
		return {
			what: error.message,
			why: fallback.why,
			action: fallback.action,
			code: error.code
		};
	}
	return fallback;
}

/** Keep localized ArchiveError / UserFacingError copy; never leak native OS strings. */
export function formatUserFacingError(error: unknown, fallback: string): string {
	if (error instanceof UserFacingError) {
		return formatErrorToast(error.copy);
	}
	if (error instanceof ArchiveError && error.message.trim()) {
		return error.message;
	}
	return fallback;
}
