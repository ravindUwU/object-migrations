import { test, suite, type TestContext, type Mock } from 'node:test';
import { Migrator } from './migrator.js';
import { MigrationError, NoMigrationStepsError } from './errors.js';

suite('Migrator', () => {
	suite('Returns the same object when from & to are the same', () => {
		const m = makeTestObjMigrator();
		const o = makeTestObj(1);

		test('Forward', (t: TestContext) => {
			const res = m.forward<TestObj<3>>(o, 3, 3);

			t.assert.strictEqual(res.changed, false);
			t.assert.strictEqual(res.value, o);
		});

		test('Backward', (t: TestContext) => {
			const res = m.backward<TestObj<3>>(o, 3, 3);

			t.assert.strictEqual(res.changed, false);
			t.assert.strictEqual(res.value, o);
		});
	});

	suite('Runs steps in order', () => {
		const m = makeTestObjMigrator();

		test('Forward 1 to 5', (t: TestContext) => {
			const o = makeTestObj(1);
			const res = m.forward<TestObj<5>>(o, 1, 5);

			t.assert.strictEqual(res.changed, true);
			t.assert.strictEqual(res.value.version, 5);
			t.assert.deepStrictEqual(res.value.sequence, [1, 2, 3, 4, 5]);
		});

		test('Forward 2 to 4', (t: TestContext) => {
			const o = makeTestObj(2);
			const res = m.forward<TestObj<4>>(o, 2, 4);

			t.assert.strictEqual(res.changed, true);
			t.assert.strictEqual(res.value.version, 4);
			t.assert.deepStrictEqual(res.value.sequence, [2, 3, 4]);
		});

		test('Backward 5 to 1', (t: TestContext) => {
			const o = makeTestObj(5);
			const res = m.backward<TestObj<1>>(o, 5, 1);

			t.assert.strictEqual(res.changed, true);
			t.assert.strictEqual(res.value.version, 1);
			t.assert.deepStrictEqual(res.value.sequence, [5, 4, 3, 2, 1]);
		});

		test('Backward 4 to 2', (t: TestContext) => {
			const o = makeTestObj(4);
			const res = m.backward<TestObj<2>>(o, 4, 2);

			t.assert.strictEqual(res.changed, true);
			t.assert.strictEqual(res.value.version, 2);
			t.assert.deepStrictEqual(res.value.sequence, [4, 3, 2]);
		});
	});

	suite('Throws when there are no steps between from & to', () => {
		const m = makeTestObjMigrator();

		test('Forward', (t: TestContext) => {
			t.assert.throws(() => {
				m.forward(makeTestObj(1), 1, -1);
			}, NoMigrationStepsError);
		});

		test('Backward', (t: TestContext) => {
			t.assert.throws(() => {
				m.backward(makeTestObj(1), 1, -1);
			}, NoMigrationStepsError);
		});
	});

	suite('Wraps errors thrown during migrations', () => {
		const m = new Migrator();

		m.register<TestObj<1>, TestObj<2>>(
			1,
			2,
			() => {
				throw new TestError('forward');
			},
			() => {
				throw new TestError('backward');
			},
		);

		test('Forward', (t: TestContext) => {
			t.assert.throws(
				() => {
					m.forward(makeTestObj(1), 1, 2);
				},
				(e) =>
					e instanceof MigrationError &&
					e.cause instanceof TestError &&
					e.cause.payload === 'forward',
			);
		});

		test('Backward', (t: TestContext) => {
			t.assert.throws(
				() => {
					m.backward(makeTestObj(2), 2, 1);
				},
				(e) =>
					e instanceof MigrationError &&
					e.cause instanceof TestError &&
					e.cause.payload === 'backward',
			);
		});
	});

	suite('Uses cached steps in subsequent migrations', () => {
		test('Forward', (t: TestContext) => {
			const m = makeTestObjMigrator() as MockedObject<Migrator, 'computeSteps'>;
			t.mock.method(m, 'computeSteps');

			m.forward(makeTestObj(1), 1, 5);
			t.assert.ok(m.tryGetCachedSteps(1, 5) !== undefined);
			t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
			m.computeSteps.mock.resetCalls();

			m.forward(makeTestObj(1), 1, 5);
			t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
		});

		test('Backward', (t: TestContext) => {
			const m = makeTestObjMigrator() as MockedObject<Migrator, 'computeSteps'>;
			t.mock.method(m, 'computeSteps');

			m.backward(makeTestObj(5), 5, 1);
			t.assert.ok(m.tryGetCachedSteps(5, 1) !== undefined);
			t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
			m.computeSteps.mock.resetCalls();

			m.backward(makeTestObj(5), 5, 1);
			t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
		});
	});
});

// Test framework helpers

type FunctionNames<T> = {
	[K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

type MockedObject<T, F extends FunctionNames<T>> = Omit<T, F> & {
	[f in F]: T[f] extends Function ? Mock<T[f]> : never;
};

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
		m.register<TestObj<number>, TestObj<number>>(
			fromVersion,
			toVersion,
			(o) => {
				return {
					version: toVersion,
					sequence: [...o.sequence, toVersion],
				};
			},
			(o) => {
				return {
					version: fromVersion,
					sequence: [...o.sequence, fromVersion],
				};
			},
		);
	}

	register(1, 2);
	register(2, 3);
	register(3, 4);
	register(4, 5);

	return m;
}
