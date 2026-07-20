import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type AndroidNavigationMode = 'gesture' | 'buttons';

export interface SafeAreaInsetsPayload {
	top: number;
	bottom: number;
	mode?: AndroidNavigationMode;
}

export interface SafeAreaInsetsPlugin {
	getInsets(): Promise<SafeAreaInsetsPayload>;
	addListener(
		eventName: 'insetsChange',
		listenerFunc: (event: SafeAreaInsetsPayload) => void
	): Promise<PluginListenerHandle>;
}

export const SafeAreaInsets = registerPlugin<SafeAreaInsetsPlugin>('SafeAreaInsets');
