import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = String(packageJson.version ?? '0.0.1');
const [major = 0, minor = 0, patch = 0] = version.split('.').map((part) => Number(part) || 0);
const versionCode = major * 10_000 + minor * 100 + patch;

const buildGradlePath = resolve(root, 'android/app/build.gradle');
let buildGradle = readFileSync(buildGradlePath, 'utf8');

buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
buildGradle = buildGradle.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

writeFileSync(buildGradlePath, buildGradle);
console.log(`Android version synced: ${version} (${versionCode})`);
