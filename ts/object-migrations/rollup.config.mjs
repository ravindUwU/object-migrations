// https://rollupjs.org/configuration-options/

import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
export default {
	input: './src/index.ts',
	output: [
		{
			format: 'umd',
			name: 'ObjectMigrations',
			file: './dist/bundle/object-migrations.js',
		},
		{
			format: 'umd',
			name: 'ObjectMigrations',
			file: './dist/bundle/object-migrations.min.js',
			plugins: [terser()],
		},
	],
	plugins: [typescript()],
};
