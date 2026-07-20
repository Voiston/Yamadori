import * as m from '$lib/paraglide/messages.js';
import { isLocalEncryptionKeyMissingError } from '$lib/utils/secure-idb';

export type StorageLoadErrorInfo = {
	message: string;
	helpMessage?: string;
	suggestImport: boolean;
};

export function resolveTreesLoadError(error: unknown): StorageLoadErrorInfo {
	if (isLocalEncryptionKeyMissingError(error)) {
		return {
			message: m.store_local_encryption_key_missing(),
			helpMessage: m.store_local_encryption_key_missing_help(),
			suggestImport: true
		};
	}
	return {
		message: m.store_trees_corrupt(),
		suggestImport: true
	};
}

export function resolveParkingLoadError(error: unknown): StorageLoadErrorInfo {
	if (isLocalEncryptionKeyMissingError(error)) {
		return {
			message: m.parking_local_encryption_key_missing(),
			helpMessage: m.store_local_encryption_key_missing_help(),
			suggestImport: true
		};
	}
	return {
		message: m.parking_load_error(),
		suggestImport: false
	};
}
