import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface YamadoriBackupPendingImport {
	cachePath: string;
	displayName: string;
}

export interface YamadoriBackupPlugin {
	saveToDownloads(options: {
		data: string;
		fileName: string;
		mimeType?: string;
	}): Promise<{ uri: string; fileName: string }>;
	consumePendingImport(): Promise<Partial<YamadoriBackupPendingImport>>;
	addListener(
		eventName: 'backupImportReady',
		listenerFunc: (event: YamadoriBackupPendingImport) => void
	): Promise<PluginListenerHandle>;
}

export const YamadoriBackup = registerPlugin<YamadoriBackupPlugin>('YamadoriBackup');
