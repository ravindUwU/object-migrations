import { test, suite, type TestContext, type Mock } from 'node:test';
import { Migrator } from './migrator.js';
import { MigrationError, NoMigrationStepsError } from './errors.js';

suite('Migrator', () => {
	test('Returns the same object when from & to are the same', (t: TestContext) => {
		const m = makeTestObjMigrator();
		const o = makeTestObj(1);
		const res = m.migrate<TestObj<2>>(o, 1, 1);

		t.assert.strictEqual(res.changed, false);
		t.assert.strictEqual(res.value, o);
	});

	test('Runs steps in order', async (t: TestContext) => {
		const m = makeTestObjMigrator();

		await t.test('1 to 5', (t: TestContext) => {
			const o = makeTestObj(1);
			const res = m.migrate<TestObj<5>>(o, 1, 5);

			t.assert.strictEqual(res.changed, true);
			t.assert.strictEqual(res.value.version, 5);
			t.assert.deepStrictEqual(res.value.sequence, [1, 2, 3, 4, 5]);
		});

		await t.test('2 to 4', (t: TestContext) => {
			const o = makeTestObj(2);
			const res = m.migrate<TestObj<4>>(o, 2, 4);

			t.assert.strictEqual(res.changed, true);
			t.assert.strictEqual(res.value.version, 4);
			t.assert.deepStrictEqual(res.value.sequence, [2, 3, 4]);
		});
	});

	test('Throws when there are no steps between from & to', (t: TestContext) => {
		const m = makeTestObjMigrator();

		t.assert.throws(() => {
			m.migrate(makeTestObj(1), 1, -1);
		}, NoMigrationStepsError);
	});

	test('Wraps errors thrown during migrations', (t: TestContext) => {
		const m = new Migrator();
		const s = Symbol();

		m.register<TestObj<1>, TestObj<2>>(1, 2, () => {
			throw new TestError(s);
		});

		t.assert.throws(
			() => {
				m.migrate(makeTestObj(1), 1, 2);
			},
			(e) => e instanceof MigrationError && e.cause instanceof TestError && e.cause.payload === s,
		);
	});

	test('Uses cached steps in subsequent migrations', (t: TestContext) => {
		const m = makeTestObjMigrator() as MockedObject<Migrator, 'computeSteps'>;
		t.mock.method(m, 'computeSteps');

		t.assert.ok(m.tryGetCachedSteps(1, 5) === undefined);

		m.migrate(makeTestObj(1), 1, 5);
		t.assert.ok(m.tryGetCachedSteps(1, 5) !== undefined);
		t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
		m.computeSteps.mock.resetCalls();

		m.migrate(makeTestObj(1), 1, 5);
		t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
	});
});

// Test framework helpers

/* eslint-disable @typescript-eslint/no-unsafe-function-type -- Match any function */

type FunctionNames<T> = {
	[K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

type MockedObject<T, F extends FunctionNames<T>> = Omit<T, F> & {
	[f in F]: T[f] extends Function ? Mock<T[f]> : never;
};

/* eslint-enable @typescript-eslint/no-unsafe-function-type -- Match any function */

// Test helpers

class TestError extends Error {
	constructor(public readonly payload: unknown) {
		super('TestError');
		this.name = 'TestError';
	}
}

interface TestObj<V extends number> {
	readonly version: V;
	readonly sequence: number[];
}

function makeTestObj<V extends number>(v: V): TestObj<V> {
	return {
		version: v,
		sequence: [v],
	};
}

function makeTestObjMigrator(): Migrator {
	const m = new Migrator();

	function register(fromVersion: number, toVersion: number): void {
		m.register<TestObj<number>, TestObj<number>>(fromVersion, toVersion, (fromObject) => {
			return {
				version: toVersion,
				sequence: [...fromObject.sequence, toVersion],
			};
		});
	}

	register(1, 2);
	register(2, 3);
	register(3, 4);
	register(4, 5);

	return m;
}
