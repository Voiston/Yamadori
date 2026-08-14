/**
 * @deprecated Use: node scripts/mt-en-to-locale.mjs nl
 * Kept as a thin wrapper for older docs/scripts.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['scripts/mt-en-to-locale.mjs', 'nl', ...process.argv.slice(2)], {
	stdio: 'inherit'
});
process.exit(result.status ?? 1);
