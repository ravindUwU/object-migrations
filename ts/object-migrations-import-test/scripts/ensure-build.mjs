/**
 * Builds object-migrations, if it isn't built yet.
 */

import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import console from 'node:console';

const baseDir = path.resolve(import.meta.dirname, '..', '..', 'object-migrations');
const esmExists = fs.existsSync(path.resolve(baseDir, 'dist', 'esm'));
const cjsExists = fs.existsSync(path.resolve(baseDir, 'dist', 'cjs'));

if (!esmExists || !cjsExists) {
	console.log({ esmExists, cjsExists }, 'Building');

	childProcess.execSync('pnpm run build', {
		cwd: baseDir,
		stdio: 'inherit',
	});
}
