import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const buildType = process.argv[2];

/**
 * Resolve path segments relative to the project directory (NOT the script directory).
 * @param  {...string} segments
 */
function $path(...segments) {
	return path.resolve(import.meta.dirname, '..', ...segments);
}

switch (buildType) {
	case 'cjs': {
		// dist/cjs/package.json
		fs.writeFileSync(
			$path('dist', 'cjs', 'package.json'),
			JSON.stringify({ type: 'commonjs' }, undefined, '\t'),
		);
		break;
	}
}
