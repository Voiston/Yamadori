/**
 * Generates Android launch splash assets matching AppBootSplash:
 * forest-100 bg + centered logo (h-20) + "Yamadori" (text-2xl semibold).
 *
 * Usage: node scripts/generate-android-splash.mjs
 */
import { resolve } from 'node:path';
import sharp from 'sharp';

const FOREST_100 = { r: 226, g: 232, b: 226 };
const FOREST_900 = '#1a2e1a';
const BRAND = 'Yamadori';

/** Reference portrait frame (~xxxhdpi 360dp × 640dp). */
const WIDTH = 1080;
const HEIGHT = 1920;
/** 80dp logo at 3× */
const LOGO_PX = 240;
/** mt-3 (12dp) at 3× */
const GAP_PX = 36;
/** text-2xl (24dp) at 3× */
const FONT_PX = 72;

const iconPath = resolve('static/icons/icon.png');
const drawableDir = resolve('android/app/src/main/res/drawable');

const logoTop = Math.round((HEIGHT - (LOGO_PX + GAP_PX + FONT_PX)) / 2);
const logoLeft = Math.round((WIDTH - LOGO_PX) / 2);
const textTop = logoTop + LOGO_PX + GAP_PX;

const logo = await sharp(iconPath)
	.resize(LOGO_PX, LOGO_PX, {
		fit: 'contain',
		background: { ...FOREST_100, alpha: 0 }
	})
	.png()
	.toBuffer();

const textSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <text
    x="50%"
    y="${textTop + FONT_PX * 0.82}"
    text-anchor="middle"
    font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    font-size="${FONT_PX}"
    font-weight="600"
    letter-spacing="-1.5"
    fill="${FOREST_900}"
  >${BRAND}</text>
</svg>`);

await sharp({
	create: {
		width: WIDTH,
		height: HEIGHT,
		channels: 3,
		background: FOREST_100
	}
})
	.composite([
		{ input: logo, left: logoLeft, top: logoTop },
		{ input: await sharp(textSvg).png().toBuffer(), left: 0, top: 0 }
	])
	.png()
	.toFile(resolve(drawableDir, 'splash.png'));

await sharp(iconPath)
	.resize(288, 288, {
		fit: 'contain',
		background: { ...FOREST_100, alpha: 1 }
	})
	.png()
	.toFile(resolve(drawableDir, 'splash_logo.png'));

console.log('generate-android-splash: splash.png + splash_logo.png');
