/**
 * Diagnose a Yamadori backup for trees whose visits have no photoPaths
 * (typical post-wipe incomplete save).
 *
 * Usage:
 *   node scripts/check-backup-photos.mjs path/to/backup.yamadori.zip
 *
 * Password-protected archives are not supported here — export a plaintext
 * copy or inspect donnees.json manually after unzip.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

const zipPath = process.argv[2];
if (!zipPath) {
	console.error('Usage: node scripts/check-backup-photos.mjs <backup.yamadori.zip>');
	process.exit(2);
}

const bytes = new Uint8Array(readFileSync(resolve(zipPath)));
/** @type {Record<string, Uint8Array>} */
let entries;
try {
	entries = unzipSync(bytes);
} catch (error) {
	console.error('Invalid ZIP:', error instanceof Error ? error.message : error);
	process.exit(1);
}

const names = Object.keys(entries);
const donneesKey = names.find((n) => n.replaceAll('\\', '/').toLowerCase().endsWith('donnees.json'));
if (!donneesKey) {
	if (names.some((n) => n.toLowerCase().includes('donnees.enc'))) {
		console.error('Archive looks password-protected (donnees.enc). Unzip/export plaintext to inspect.');
		process.exit(1);
	}
	console.error('donnees.json not found in archive. Entries:', names.slice(0, 20).join(', '));
	process.exit(1);
}

const payload = JSON.parse(strFromU8(entries[donneesKey]));
const trees = Array.isArray(payload.trees) ? payload.trees : [];

let withPhotos = 0;
let withoutPhotos = 0;
/** @type {Array<{ id: string, species: string, locationLabel: string | null, visitCount: number }>} */
const broken = [];

for (const tree of trees) {
	const visits = Array.isArray(tree.visits) ? tree.visits : [];
	const hasPhoto = visits.some((visit) => {
		const paths = Array.isArray(visit.photoPaths) ? visit.photoPaths : [];
		if (paths.some((p) => typeof p === 'string' && p.trim())) return true;
		if (typeof visit.photoPath === 'string' && visit.photoPath.trim()) return true;
		return false;
	});
	const treePhotos = Array.isArray(tree.photos) ? tree.photos : [];
	const hasTreeLevel = treePhotos.some((p) => typeof p === 'string' && p.trim());

	if (hasPhoto || hasTreeLevel) {
		withPhotos += 1;
	} else {
		withoutPhotos += 1;
		broken.push({
			id: String(tree.id ?? '?'),
			species: String(tree.species ?? '?'),
			locationLabel: tree.locationLabel ?? null,
			visitCount: visits.length
		});
	}
}

console.log(`Archive: ${resolve(zipPath)}`);
console.log(`Trees: ${trees.length} — with photos: ${withPhotos} — without photos: ${withoutPhotos}`);
if (broken.length > 0) {
	console.log('\nTrees with empty photoPaths (likely post-wipe / incomplete save):');
	for (const row of broken.slice(0, 50)) {
		const label = row.locationLabel ? ` label="${row.locationLabel}"` : ' label=null';
		console.log(`  - ${row.id} | ${row.species} | visits=${row.visitCount}${label}`);
	}
	if (broken.length > 50) {
		console.log(`  … and ${broken.length - 50} more`);
	}
	const labeledBroken = broken.filter((b) => b.locationLabel).length;
	console.log(
		`\nOf broken trees, ${labeledBroken}/${broken.length} still have a locationLabel in the save.`
	);
	console.log(
		'If photoPaths are empty here, Remplacer tout cannot restore pixels — need an older backup.'
	);
	process.exit(1);
}

console.log('All trees have at least one photo path — save looks media-complete.');
process.exit(0);
