import { suite, test } from 'node:test';
import { uwu } from './index.js';

suite('uwu', () => {
	test('is UwU', (t) => {
		t.assert.equal(uwu(), 'UwU');
	});

	test('is not OwO', (t) => {
		t.assert.notEqual(uwu(), 'OwO');
	});
});
