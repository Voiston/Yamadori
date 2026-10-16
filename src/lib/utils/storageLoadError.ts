import * as m from '$lib/paraglide/messages.js';
import { isLocalEncryptionKeyMissingError } from '$lib/utils/secure-idb';
import {
	encryptionKeyMissingCopy,
	parkingLoadErrorCopy,
	treesCorruptCopy
} from '$lib/utils/errorCopy';
import type { ErrorCopy } from '$lib/utils/userFacingError';

export type StorageLoadErrorInfo = ErrorCopy & {
	suggestImport: boolean;
};

export function resolveTreesLoadError(error: unknown): StorageLoadErrorInfo {
	if (isLocalEncryptionKeyMissingError(error)) {
		return { ...encryptionKeyMissingCopy(), suggestImport: true };
	}
	return { ...treesCorruptCopy(), suggestImport: true };
}

export function resolveParkingLoadError(error: unknown): StorageLoadErrorInfo {
	if (isLocalEncryptionKeyMissingError(error)) {
		return {
			...encryptionKeyMissingCopy(),
			what: m.parking_local_encryption_key_missing(),
			suggestImport: true
		};
	}
	return { ...parkingLoadErrorCopy(), suggestImport: false };
}
