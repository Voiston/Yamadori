import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const sourcePath = resolve('icon.png');
const iconsOutDir = resolve('static/icons');
const androidRes = resolve('android/app/src/main/res');

const launcherSizes = {
	mdpi: 48,
	hdpi: 72,
	xhdpi: 96,
	xxhdpi: 144,
	xxxhdpi: 192
};

const foregroundSizes = {
	mdpi: 108,
	hdpi: 162,
	xhdpi: 216,
	xxhdpi: 324,
	xxxhdpi: 432
};

function roundMaskSvg(size) {
	const r = size / 2;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`;
}

for (const size of [192, 512]) {
	const buffer = await sharp(sourcePath).resize(size, size).png().toBuffer();
	writeFileSync(resolve(iconsOutDir, `icon-${size}.png`), buffer);
	console.log(`generate-icons: icon-${size}.png`);
}

for (const [density, size] of Object.entries(launcherSizes)) {
	const dir = resolve(androidRes, `mipmap-${density}`);
	const square = await sharp(sourcePath).resize(size, size).png().toBuffer();
	writeFileSync(resolve(dir, 'ic_launcher.png'), square);

	const round = await sharp(square)
		.composite([{ input: Buffer.from(roundMaskSvg(size)), blend: 'dest-in' }])
		.png()
		.toBuffer();
	writeFileSync(resolve(dir, 'ic_launcher_round.png'), round);
	console.log(`generate-icons: android mipmap-${density}/ic_launcher*.png`);
}

for (const [density, size] of Object.entries(foregroundSizes)) {
	const dir = resolve(androidRes, `mipmap-${density}`);
	const foreground = await sharp(sourcePath).resize(size, size).png().toBuffer();
	writeFileSync(resolve(dir, 'ic_launcher_foreground.png'), foreground);
	console.log(`generate-icons: android mipmap-${density}/ic_launcher_foreground.png`);
}
