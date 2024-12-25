// https://prettier.io/docs/en/options
// https://prettier.io/docs/en/configuration

/** @type {import('prettier').Config} */
export default {
	endOfLine: 'auto',
	printWidth: 100,
	useTabs: true,
	singleQuote: true,
	proseWrap: 'always',
	overrides: [
		{
			files: ['.vscode/*.json', 'tsconfig.json'],
			options: {
				parser: 'json5',
				trailingComma: 'all',
				quoteProps: 'preserve',
				singleQuote: false,
			},
		},
		{
			files: ['**/*.yaml'],
			options: {
				useTabs: false,
				tabWidth: 2,
			},
		},
	],
};
