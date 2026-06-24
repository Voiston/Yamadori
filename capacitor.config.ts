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
		StatusBar: {
			style: 'DARK',
			backgroundColor: '#1a2e1a'
		},
		Keyboard: {
			resize: 'body'
		},
		SplashScreen: {
			launchAutoHide: true
		}
	}
};

export default config;
