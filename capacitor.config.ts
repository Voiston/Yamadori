import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'fr.yamadori.scouting',
	appName: 'Yamadori Scouting',
	webDir: 'build',
	server: {
		androidScheme: 'https'
	},
	android: {
		useLegacyBridge: true
	},
	plugins: {
		Geolocation: {
			permissions: ['location']
		},
		SystemBars: {
			insetsHandling: 'css',
			style: 'DARK'
		},
		Keyboard: {
			resize: 'body'
		},
		SplashScreen: {
			launchAutoHide: true,
			launchShowDuration: 0,
			launchFadeOutDuration: 0,
			backgroundColor: '#e2e8e2'
		}
	}
};

export default config;
