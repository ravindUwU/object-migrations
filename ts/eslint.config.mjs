import jsEslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';

/** @typedef {import('eslint').Linter.Config} Config */

/** @type {Config[]} */
export default [
	// JavaScript
	// https://eslint.org/docs/latest/use/configure/configuration-files
	...scope(
		['**/*.{mjs,ts}'],
		[
			jsEslint.configs.recommended,
			{
				rules: {
					eqeqeq: 'error',
				},
				languageOptions: {
					ecmaVersion: 2022,
				},
			},
		],
	),

	// TypeScript
	// https://typescript-eslint.io/users/configs
	// https://typescript-eslint.io/getting-started/typed-linting
	...scope(
		['**/*.ts'],
		[
			tsEslint.configs.strictTypeChecked,
			tsEslint.configs.stylisticTypeChecked,

			/** @type {import('typescript-eslint').ConfigWithExtends} */ ({
				languageOptions: {
					parserOptions: {
						projectService: true,
						tsconfigRootDir: import.meta.dirname,
					},
				},
				rules: {
					'@typescript-eslint/explicit-function-return-type': 'error',
					'@typescript-eslint/no-non-null-assertion': 'off',
					'@typescript-eslint/no-floating-promises': [
						'error',
						{
							allowForKnownSafeCalls: [
								{ from: 'package', package: 'node:test', name: 'test' },
								{ from: 'package', package: 'node:test', name: 'suite' },
							],
						},
					],
					'@typescript-eslint/consistent-type-imports': [
						'error',
						{
							fixStyle: 'inline-type-imports',
						},
					],
					'@typescript-eslint/restrict-template-expressions': [
						'error',
						{
							allowNumber: true,
							allowBoolean: true,
						},
					],
				},
			}),
		],
	),

	// Comments
	// https://eslint-community.github.io/eslint-plugin-eslint-comments/
	...scope(undefined, [
		comments.recommended,
		{
			rules: {
				'@eslint-community/eslint-comments/require-description': 'error',
			},
		},
	]),

	// Prettier
	// https://github.com/prettier/eslint-plugin-prettier
	...scope(undefined, [
		prettierRecommended,
		{
			rules: {
				'prettier/prettier': 'warn',
			},
		},
	]),
];

/**
 * Converts {@link configs} to an array of config objects scoped to {@link files}.
 *
 * @param {string[] | undefined} files
 * Array of minimatch globs relative to the ESLint configuration file, that determine the files to
 * which the configs apply; or `undefined` if the configs apply to all files.
 *
 * @param {(Config | Config[])[]} configs
 * @returns {Config[]}
 *
 * @example
 *
 * ```javascript
 * import config1 from 'config1';
 * import configs2 from 'config2';
 *
 * export default [
 *     ...scope(
 *         ['dir1/**'],
 *         [
 *             config1, // object
 *             configs2, // array
 *             { ... },
 *         ],
 *     ),
 * ];
 * ```
 */
function scope(files, configs) {
	return configs
		.flatMap((c) => (Array.isArray(c) ? c : [c]))
		.map((c) => (files ? { ...c, files } : c));
}
