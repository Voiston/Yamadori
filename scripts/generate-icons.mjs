import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const svgPath = resolve('static/icons/icon.svg');
const outDir = resolve('static/icons');
const svg = readFileSync(svgPath);

for (const size of [192, 512]) {
	const buffer = await sharp(svg).resize(size, size).png().toBuffer();
	writeFileSync(resolve(outDir, `icon-${size}.png`), buffer);
	console.log(`generate-icons: icon-${size}.png`);
}
