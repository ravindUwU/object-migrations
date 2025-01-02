import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import console from 'node:console';

const base = path.resolve(import.meta.dirname, '..', '..', 'object-migrations');

const esmExists = fs.existsSync(path.resolve(base, 'dist', 'esm'));
const cjsExists = fs.existsSync(path.resolve(base, 'dist', 'cjs'));

if (!esmExists || !cjsExists) {
	console.log({ esmExists, cjsExists }, 'Rebuilding...');

	childProcess.execSync('pnpm run build', {
		cwd: base,
		encoding: 'utf8',
		stdio: 'inherit',
	});
}
