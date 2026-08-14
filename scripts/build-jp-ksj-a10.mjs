/**
 * Build static Japan natural-park GeoJSON for the 100% frontend scan.
 *
 * Source: MOE national-park restriction polygons converted to TopoJSON
 * (政府標準利用規約) via https://github.com/kamataryo/nationalpark-map
 * — same legal family as KSJ open data; no MLIT API key.
 *
 * Optional: place KSJ A10 GeoJSON FeatureCollections in
 * `.tmp/ksj-src/*.geojson` to merge additional prefectural coverage.
 *
 * Usage: node scripts/build-jp-ksj-a10.mjs
 */
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { feature } from 'topojson-client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'static', 'jp-ksj-a10');
const CACHE_DIR = join(ROOT, '.tmp', 'ksj-a10-topo');
const EXTRA_SRC = join(ROOT, '.tmp', 'ksj-src');

const ABSTRACT_URL =
	'https://raw.githubusercontent.com/kamataryo/nationalpark-map/master/topojson/abstract.json';
const TOPO_BASE =
	'https://raw.githubusercontent.com/kamataryo/nationalpark-map/master/topojson';

/** Round coordinates to ~1.1 m to shrink assets. */
function roundCoord(n) {
	return Math.round(Number(n) * 1e5) / 1e5;
}

function simplifyCoords(coords) {
	if (coords == null) return coords;
	if (typeof coords[0] === 'number') {
		return [roundCoord(coords[0]), roundCoord(coords[1])];
	}
	if (!Array.isArray(coords)) return coords;
	return coords.map(simplifyCoords).filter((c) => c != null);
}

function gradeToLayerNo(grade) {
	const g = String(grade || '');
	if (g.includes('特別保護')) return 13;
	if (g.includes('特別地域') || g.includes('第1種') || g.includes('第2種') || g.includes('第3種')) {
		return 12;
	}
	if (g.includes('普通')) return 11;
	if (g.includes('海中')) return 12;
	return 11;
}

function featureFromTopoProps(props, geometry, objectId) {
	if (!geometry?.coordinates) return null;
	const name = String(props?.name || '').trim();
	const grade = String(props?.grade || '').trim();
	const layerNo = gradeToLayerNo(grade);
	return {
		type: 'Feature',
		properties: {
			OBJECTID: objectId,
			OBJ_NAME_ja: name ? `${name}国立公園` : '国立公園',
			LAYER_NO: layerNo,
			PREFEC_CD: '',
			GRADE: grade,
			SOURCE: 'moe_nps'
		},
		geometry: {
			type: geometry.type,
			coordinates: simplifyCoords(geometry.coordinates)
		}
	};
}

async function downloadTo(url, dest, { force = false } = {}) {
	if (!force) {
		try {
			await readFile(dest);
			return;
		} catch {
			/* missing — fetch */
		}
	}
	const res = await fetch(url);
	if (!res.ok) throw new Error(`download_failed_${res.status}:${url}`);
	await mkdir(dirname(dest), { recursive: true });
	await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function loadExtraKsjGeoJson() {
	try {
		const names = await readdir(EXTRA_SRC);
		const features = [];
		for (const name of names) {
			if (!name.endsWith('.geojson') && !name.endsWith('.json')) continue;
			const raw = JSON.parse(await readFile(join(EXTRA_SRC, name), 'utf8'));
			if (raw.type === 'FeatureCollection') features.push(...(raw.features || []));
			else if (raw.type === 'Feature') features.push(raw);
		}
		return features;
	} catch {
		return [];
	}
}

async function main() {
	const force = process.env.FORCE_JP_KSJ === '1';
	await mkdir(OUT_DIR, { recursive: true });
	await mkdir(CACHE_DIR, { recursive: true });

	const outPathEarly = join(OUT_DIR, 'natural-parks.geojson.gz');
	if (!force) {
		try {
			await readFile(outPathEarly);
			process.stdout.write(`skip ${outPathEarly} (exists; set FORCE_JP_KSJ=1 to rebuild)\n`);
			return;
		} catch {
			/* build */
		}
	}

	const abstractPath = join(CACHE_DIR, 'abstract.json');
	await downloadTo(ABSTRACT_URL, abstractPath, { force });
	const abstract = JSON.parse(await readFile(abstractPath, 'utf8'));

	const features = [];
	let id = 1;

	for (const key of Object.keys(abstract)) {
		if (key === 'undefined' || !key.startsWith('NPS_')) continue;
		const topoPath = join(CACHE_DIR, `${key}.topojson`);
		await downloadTo(`${TOPO_BASE}/${key}.topojson`, topoPath, { force });
		const topology = JSON.parse(await readFile(topoPath, 'utf8'));
		const objectName = Object.keys(topology.objects || {})[0];
		if (!objectName) continue;
		const fc = feature(topology, topology.objects[objectName]);
		for (const f of fc.features || []) {
			if (!f.geometry) continue;
			const built = featureFromTopoProps(f.properties, f.geometry, String(id++));
			if (built) features.push(built);
		}
		process.stdout.write(`ok ${key} (${fc.features?.length ?? 0})\n`);
	}

	const extra = await loadExtraKsjGeoJson();
	for (const f of extra) {
		if (!f?.geometry) continue;
		features.push({
			type: 'Feature',
			properties: {
				OBJECTID: String(id++),
				OBJ_NAME_ja:
					f.properties?.OBJ_NAME_ja ||
					f.properties?.OBJ_NAME ||
					f.properties?.name ||
					'自然公園地域',
				LAYER_NO: Number(f.properties?.LAYER_NO) || 11,
				PREFEC_CD: String(f.properties?.PREFEC_CD || ''),
				SOURCE: 'ksj_a10'
			},
			geometry: {
				type: f.geometry.type,
				coordinates: simplifyCoords(f.geometry.coordinates)
			}
		});
	}
	if (extra.length) process.stdout.write(`merged ${extra.length} KSJ extra features\n`);

	const collection = {
		type: 'FeatureCollection',
		attribution:
			'© 環境省 — 国立公園区域（政府標準利用規約）; optional KSJ A10 overlays © 国土交通省',
		features
	};

	const outPath = join(OUT_DIR, 'natural-parks.geojson.gz');
	const json = JSON.stringify(collection);
	const { gzipSync } = await import('node:zlib');
	const gz = gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
	await writeFile(outPath, gz);
	// Keep a tiny pointer file for humans / tooling.
	await writeFile(
		join(OUT_DIR, 'natural-parks.meta.json'),
		JSON.stringify(
			{
				features: features.length,
				bytesGzip: gz.length,
				bytesJson: Buffer.byteLength(json),
				builtAt: new Date().toISOString()
			},
			null,
			'\t'
		) + '\n'
	);
	process.stdout.write(
		`wrote ${outPath} (${features.length} features, ${(gz.length / 1e6).toFixed(2)} MB gzip / ${(Buffer.byteLength(json) / 1e6).toFixed(2)} MB json)\n`
	);
	await writeFile(
		join(OUT_DIR, 'README.md'),
		`# Japan natural park polygons (static)

Built by \`npm run build:jp-ksj\` → \`natural-parks.geojson.gz\`.

- Primary: MOE national-park restriction zones (no API key; 政府標準利用規約).
- Optional: drop KSJ A10 GeoJSON into \`.tmp/ksj-src/\` and re-run the script to merge prefectural coverage.

The app loads the gzip asset at runtime (no MLIT Reinfolib key; safe for 100% frontend).
`
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
