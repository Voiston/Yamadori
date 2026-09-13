import pkg from '../../../package.json';

/** Canonical app semver from package.json (Android Gradle is synced from this). */
export const APP_VERSION = String(pkg.version ?? '0.0.0');

/** HTTP User-Agent for Nominatim / open cadastre APIs that require one. */
export const HTTP_USER_AGENT = `Yamadori/${APP_VERSION} (bonsai field app)`;
