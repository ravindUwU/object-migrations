/**
 * Packs object-migrations using `pnpm pack`, building it first if necessary, into the `pack`
 * directory.
 *
 * - Include the arg `build` to force a build.
 * - The tarball is be generated to `pack/*.tgz`.
 * - `pack/filename` includes the basename of the tarball.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import childProcess from 'node:child_process';

const args = process.argv.slice(2);

/**
 * Resolve path segments relative to the project directory (NOT the script directory).
 * @param  {...string} segments
 */
function $path(...segments) {
	return path.resolve(import.meta.dirname, '..', ...segments);
}

// Build
if (args.includes('build') || !fs.existsSync($path('dist'))) {
	console.log('Building');
	childProcess.execSync('pnpm run build', {
		cwd: $path('.'),
		stdio: 'inherit',
	});
}

console.log('Assembling pack directory');

// pack/
if (fs.existsSync($path('pack'))) {
	fs.rmSync($path('pack'), { recursive: true, force: true });
}
fs.mkdirSync($path('pack', 'cwd'), { recursive: true });

// pack/cwd/dist/**
fs.cpSync($path('dist'), $path('pack', 'cwd', 'dist'), { recursive: true });

// pack/cwd/package.json
const packageJson = JSON.parse(fs.readFileSync($path('package.json'), { encoding: 'utf8' }));
delete packageJson.scripts;
delete packageJson.devDependencies;
fs.writeFileSync(
	$path('pack', 'cwd', 'package.json'),
	JSON.stringify(packageJson, undefined, '\t'),
);

// pack/cwd/README.md
fs.copyFileSync($path('README.md'), $path('pack', 'cwd', 'README.md'));

// pack/cwd/LICENSE
fs.copyFileSync($path('..', '..', 'LICENSE'), $path('pack', 'cwd', 'LICENSE'));

console.log('Packing');

// pack/*.tgz
const packOutputJson = childProcess.execSync('pnpm pack --json --pack-destination ..', {
	cwd: $path('pack', 'cwd'),
	encoding: 'utf8',
});
const packOutput = JSON.parse(packOutputJson);
console.log(packOutputJson);

// pack/filename
fs.writeFileSync($path('pack', 'filename'), path.basename(packOutput.filename));

console.log('Done');
