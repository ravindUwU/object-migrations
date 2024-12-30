import { test, suite, type TestContext } from 'node:test';
import { Migrator } from './migrator.js';
import { MigrationError, NoMigrationStepsError } from './errors.js';
import { TestError, type Mocked } from './test-util.js';
import {
	makeTestObj,
	makeTestMigrator,
	type TestObj,
	TestClass3,
	TestClass1,
	TestClass5,
	TestClass2,
	TestClass4,
} from './migrator.test-util.js';

suite('Migrator', () => {
	suite('Returns the same object when from & to are the same', () => {
		const m = makeTestMigrator();

		suite('Classes', () => {
			const o = new TestClass3();

			test('Forward', (t: TestContext) => {
				const res = m.forward(o, TestClass3);

				t.assert.strictEqual(res.changed, false);
				t.assert.strictEqual(res.value, o);
			});

			test('Backward', (t: TestContext) => {
				const res = m.backward(o, TestClass3);

				t.assert.strictEqual(res.changed, false);
				t.assert.strictEqual(res.value, o);
			});
		});

		suite('Plain objects', () => {
			const o = makeTestObj(3);

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
	});

	suite('Runs steps in order', () => {
		const m = makeTestMigrator();

		suite('Classes', () => {
			test('Forward 1 to 5', (t: TestContext) => {
				const o = new TestClass1();
				const res = m.forward(o, TestClass5);

				t.assert.strictEqual(res.changed, true);
				t.assert.ok(res.value instanceof TestClass5);
				t.assert.deepStrictEqual(res.value.sequence, [1, 2, 3, 4, 5]);
			});

			test('Forward 2 to 4', (t: TestContext) => {
				const o = new TestClass2();
				const res = m.forward(o, TestClass4);

				t.assert.strictEqual(res.changed, true);
				t.assert.ok(res.value instanceof TestClass4);
				t.assert.deepStrictEqual(res.value.sequence, [2, 3, 4]);
			});

			test('Backward 5 to 1', (t: TestContext) => {
				const o = new TestClass5();
				const res = m.backward(o, TestClass1);

				t.assert.strictEqual(res.changed, true);
				t.assert.ok(res.value instanceof TestClass1);
				t.assert.deepStrictEqual(res.value.sequence, [5, 4, 3, 2, 1]);
			});

			test('Backward 4 to 2', (t: TestContext) => {
				const o = new TestClass4();
				const res = m.backward(o, TestClass2);

				t.assert.strictEqual(res.changed, true);
				t.assert.ok(res.value instanceof TestClass2);
				t.assert.deepStrictEqual(res.value.sequence, [4, 3, 2]);
			});
		});

		suite('Plain objects', () => {
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
	});

	suite('Throws when there are no steps between from & to', () => {
		const m = makeTestMigrator();

		suite('Classes', () => {
			// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Intentional.
			class TestClass0 {}

			test('Forward', (t: TestContext) => {
				t.assert.throws(() => {
					m.forward(new TestClass1(), TestClass0);
				}, NoMigrationStepsError);
			});

			test('Backward', (t: TestContext) => {
				t.assert.throws(() => {
					m.backward(new TestClass1(), TestClass0);
				}, NoMigrationStepsError);
			});
		});

		suite('Plain objects', () => {
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
	});

	suite('Wraps errors thrown during migrations', () => {
		const m = new Migrator();

		m.register(
			TestClass1,
			TestClass2,
			() => {
				throw new TestError('class/forward');
			},
			() => {
				throw new TestError('class/backward');
			},
		);

		m.register<TestObj<1>, TestObj<2>>(
			1,
			2,
			() => {
				throw new TestError('plain/forward');
			},
			() => {
				throw new TestError('plain/backward');
			},
		);

		suite('Classes', () => {
			test('Forward', (t: TestContext) => {
				t.assert.throws(
					() => {
						m.forward(new TestClass1(), TestClass2);
					},
					(e) =>
						e instanceof MigrationError &&
						e.cause instanceof TestError &&
						e.cause.payload === 'class/forward',
				);
			});

			test('Backward', (t: TestContext) => {
				t.assert.throws(
					() => {
						m.backward(new TestClass2(), TestClass1);
					},
					(e) =>
						e instanceof MigrationError &&
						e.cause instanceof TestError &&
						e.cause.payload === 'class/backward',
				);
			});
		});

		suite('Plain objects', () => {
			test('Forward', (t: TestContext) => {
				t.assert.throws(
					() => {
						m.forward(makeTestObj(1), 1, 2);
					},
					(e) =>
						e instanceof MigrationError &&
						e.cause instanceof TestError &&
						e.cause.payload === 'plain/forward',
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
						e.cause.payload === 'plain/backward',
				);
			});
		});
	});

	suite('Uses cached steps in subsequent migrations', () => {
		function makeMockedMigrator(t: TestContext): Mocked<Migrator, 'computeSteps'> {
			const m = makeTestMigrator();
			t.mock.method(m, 'computeSteps');
			return m as Mocked<Migrator, 'computeSteps'>;
		}

		suite('Classes', () => {
			test('Forward', (t: TestContext) => {
				const m = makeMockedMigrator(t);

				t.assert.ok(m.tryGetCachedSteps(TestClass1, TestClass5) === undefined);

				m.forward(new TestClass1(), TestClass5);
				t.assert.ok(m.tryGetCachedSteps(TestClass1, TestClass5) !== undefined);
				t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
				m.computeSteps.mock.resetCalls();

				m.forward(new TestClass1(), TestClass5);
				t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
			});

			test('Backward', (t: TestContext) => {
				const m = makeMockedMigrator(t);

				t.assert.ok(m.tryGetCachedSteps(TestClass5, TestClass1) === undefined);

				m.backward(new TestClass5(), TestClass1);
				t.assert.ok(m.tryGetCachedSteps(TestClass5, TestClass1) !== undefined);
				t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
				m.computeSteps.mock.resetCalls();

				m.backward(new TestClass5(), TestClass1);
				t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
			});
		});

		suite('Plain objects', () => {
			test('Forward', (t: TestContext) => {
				const m = makeMockedMigrator(t);

				t.assert.ok(m.tryGetCachedSteps(1, 5) === undefined);

				m.forward(makeTestObj(1), 1, 5);
				t.assert.ok(m.tryGetCachedSteps(1, 5) !== undefined);
				t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
				m.computeSteps.mock.resetCalls();

				m.forward(makeTestObj(1), 1, 5);
				t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
			});

			test('Backward', (t: TestContext) => {
				const m = makeMockedMigrator(t);

				t.assert.ok(m.tryGetCachedSteps(5, 1) === undefined);

				m.backward(makeTestObj(5), 5, 1);
				t.assert.ok(m.tryGetCachedSteps(5, 1) !== undefined);
				t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
				m.computeSteps.mock.resetCalls();

				m.backward(makeTestObj(5), 5, 1);
				t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
			});
		});
	});
});
