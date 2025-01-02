const { suite, test } = require('node:test');

suite('CJS', () => {
	test('Imports migrator', (t) => {
		const { Migrator } = require('object-migrations');
		t.assert.strictEqual(Migrator.name, 'Migrator');
	});
});
