import { suite, test } from 'node:test';

suite('ESM', () => {
	test('Imports migrator', async (t) => {
		const { Migrator } = await import('object-migrations');
		t.assert.strictEqual(Migrator.name, 'Migrator');
	});
});
