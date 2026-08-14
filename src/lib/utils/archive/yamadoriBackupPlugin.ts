import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface YamadoriBackupPendingImport {
	cachePath: string;
	displayName: string;
	fileSizeBytes: number;
	sha256Prefix: string;
}

export interface YamadoriBackupPlugin {
	getAppBuildInfo(): Promise<{ debug: boolean; applicationId: string }>;
	saveToDownloads(options: {
		data: string;
		fileName: string;
		mimeType?: string;
	}): Promise<{ uri: string; fileName: string }>;
	saveToDownloadsFromPath(options: {
		cacheUri: string;
		fileName: string;
		mimeType?: string;
	}): Promise<{ uri: string; fileName: string }>;
	consumePendingImport(): Promise<Partial<YamadoriBackupPendingImport>>;
	readPendingImportFile(options: { cachePath: string }): Promise<{ base64: string }>;
	deletePendingImportFile(options: { cachePath: string }): Promise<void>;
	addListener(
		eventName: 'backupImportReady',
		listenerFunc: (event: YamadoriBackupPendingImport) => void
	): Promise<PluginListenerHandle>;
}

export const YamadoriBackup = registerPlugin<YamadoriBackupPlugin>('YamadoriBackup');
