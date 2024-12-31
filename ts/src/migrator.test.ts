import { test, suite, type TestContext } from 'node:test';
import { type AsyncMigration, type Migrated, Migrator, type SyncMigration } from './migrator.js';
import { MigrationError, NoMigrationStepsError } from './errors.js';
import { noopAsync, TestError, type Mocked } from './test-util.js';
import { type Class } from './util.js';
import {
	makeTestObj,
	makeSyncOnlyTestMigrator,
	makeAsyncOnlyTestMigrator,
	type SyncOnlyMigrator,
	type AsyncOnlyMigrator,
	type TestObj,
	type TestClass,
	TestClass1,
	TestClass2,
	TestClass3,
	TestClass4,
	TestClass5,
} from './migrator.test-util.js';

suite('Migrator', () => {
	suite('Returns the same object when from & to are the same', () => {
		suite('Classes', () => {
			const o = new TestClass3();

			function assert(t: TestContext, res: Migrated<TestClass3>): void {
				t.assert.strictEqual(res.changed, false);
				t.assert.strictEqual(res.value, o);
			}

			suite('Forward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					const res = m.forward(o, TestClass3);
					assert(t, res);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					const res = await m.forwardAsync(o, TestClass3);
					assert(t, res);
				});
			});

			suite('Backward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					const res = m.backward(o, TestClass3);
					assert(t, res);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					const res = await m.backwardAsync(o, TestClass3);
					assert(t, res);
				});
			});
		});

		suite('Plain objects', () => {
			const o = makeTestObj(3);

			function assert(t: TestContext, res: Migrated<TestObj<3>>): void {
				t.assert.strictEqual(res.changed, false);
				t.assert.strictEqual(res.value, o);
			}

			suite('Forward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					const res = m.forward<TestObj<3>>(o, 3, 3);
					assert(t, res);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					const res = await m.forwardAsync<TestObj<3>>(o, 3, 3);
					assert(t, res);
				});
			});

			suite('Backward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					const res = m.backward<TestObj<3>>(o, 3, 3);
					assert(t, res);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					const res = await m.backwardAsync<TestObj<3>>(o, 3, 3);
					assert(t, res);
				});
			});
		});
	});

	suite('Runs steps in order', () => {
		suite('Classes', () => {
			suite('Forward', () => {
				function assert(t: TestContext, res: Migrated<TestClass5>): void {
					t.assert.strictEqual(res.changed, true);
					t.assert.ok(res.value instanceof TestClass5);
					t.assert.deepStrictEqual(res.value.sequence, [1, 2, 3, 4, 5]);
				}

				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					const o = new TestClass1();
					const res = m.forward(o, TestClass5);
					assert(t, res);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					const o = new TestClass1();
					const res = await m.forwardAsync(o, TestClass5);
					assert(t, res);
				});
			});

			suite('Backward', () => {
				function assert(t: TestContext, res: Migrated<TestClass1>): void {
					t.assert.strictEqual(res.changed, true);
					t.assert.ok(res.value instanceof TestClass1);
					t.assert.deepStrictEqual(res.value.sequence, [5, 4, 3, 2, 1]);
				}

				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					const o = new TestClass5();
					const res = m.backward(o, TestClass1);
					assert(t, res);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					const o = new TestClass5();
					const res = await m.backwardAsync(o, TestClass1);
					assert(t, res);
				});
			});
		});

		suite('Plain objects', () => {
			suite('Forward', () => {
				function assert(t: TestContext, res: Migrated<TestObj<5>>): void {
					t.assert.strictEqual(res.changed, true);
					t.assert.strictEqual(res.value.version, 5);
					t.assert.deepStrictEqual(res.value.sequence, [1, 2, 3, 4, 5]);
				}

				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					const o = makeTestObj(1);
					const res = m.forward<TestObj<5>>(o, 1, 5);
					assert(t, res);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					const o = makeTestObj(1);
					const res = await m.forwardAsync<TestObj<5>>(o, 1, 5);
					assert(t, res);
				});
			});

			suite('Backward', () => {
				function assert(t: TestContext, res: Migrated<TestObj<1>>): void {
					t.assert.strictEqual(res.changed, true);
					t.assert.strictEqual(res.value.version, 1);
					t.assert.deepStrictEqual(res.value.sequence, [5, 4, 3, 2, 1]);
				}

				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					const o = makeTestObj(5);
					const res = m.backward<TestObj<1>>(o, 5, 1);
					assert(t, res);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					const o = makeTestObj(5);
					const res = await m.backwardAsync<TestObj<1>>(o, 5, 1);
					assert(t, res);
				});
			});
		});
	});

	suite('Throws when there are no steps between from & to', () => {
		suite('Classes', () => {
			// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Intentional.
			class TestClass0 {}

			suite('Forward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					t.assert.throws(() => {
						m.forward(new TestClass1(), TestClass0);
					}, NoMigrationStepsError);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					await t.assert.rejects(async () => {
						await m.forwardAsync(new TestClass1(), TestClass0);
					}, NoMigrationStepsError);
				});
			});

			suite('Backward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					t.assert.throws(() => {
						m.backward(new TestClass1(), TestClass0);
					}, NoMigrationStepsError);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					await t.assert.rejects(async () => {
						await m.backwardAsync(new TestClass1(), TestClass0);
					}, NoMigrationStepsError);
				});
			});
		});

		suite('Plain objects', () => {
			suite('Forward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					t.assert.throws(() => {
						m.forward(makeTestObj(1), 1, -1);
					}, NoMigrationStepsError);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					await t.assert.rejects(async () => {
						await m.forwardAsync(makeTestObj(1), 1, -1);
					}, NoMigrationStepsError);
				});
			});

			suite('Backward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeSyncOnlyTestMigrator();
					t.assert.throws(() => {
						m.backward(makeTestObj(1), 1, -1);
					}, NoMigrationStepsError);
				});

				test('Async', async (t: TestContext) => {
					const m = makeAsyncOnlyTestMigrator();
					await t.assert.rejects(async () => {
						await m.backwardAsync(makeTestObj(1), 1, -1);
					}, NoMigrationStepsError);
				});
			});
		});
	});

	suite('Wraps errors thrown during migrations', () => {
		const sm: SyncOnlyMigrator = new Migrator();
		const am: AsyncOnlyMigrator = new Migrator();

		sm.register(
			TestClass1,
			TestClass2,
			() => {
				throw new TestError('class/forward/sync');
			},
			() => {
				throw new TestError('class/backward/sync');
			},
		);

		am.register(
			TestClass1,
			TestClass2,
			async () => {
				await noopAsync();
				throw new TestError('class/forward/async');
			},
			async () => {
				await noopAsync();
				throw new TestError('class/backward/async');
			},
		);

		sm.register<TestObj<1>, TestObj<2>>(
			1,
			2,
			() => {
				throw new TestError('plain/forward/sync');
			},
			() => {
				throw new TestError('plain/backward/sync');
			},
		);

		am.register<TestObj<1>, TestObj<2>>(
			1,
			2,
			async () => {
				await noopAsync();
				throw new TestError('plain/forward/async');
			},
			async () => {
				await noopAsync();
				throw new TestError('plain/backward/async');
			},
		);

		function isTestErrorWithPayload(e: unknown, payload: string): boolean {
			return (
				e instanceof MigrationError && e.cause instanceof TestError && e.cause.payload === payload
			);
		}

		suite('Classes', () => {
			suite('Forward', () => {
				test('Sync', (t: TestContext) => {
					t.assert.throws(
						() => {
							sm.forward(new TestClass1(), TestClass2);
						},
						(e) => isTestErrorWithPayload(e, 'class/forward/sync'),
					);
				});

				test('Async', async (t: TestContext) => {
					await t.assert.rejects(
						async () => {
							await am.forwardAsync(new TestClass1(), TestClass2);
						},
						(e) => isTestErrorWithPayload(e, 'class/forward/async'),
					);
				});
			});

			suite('Backward', () => {
				test('Sync', (t: TestContext) => {
					t.assert.throws(
						() => {
							sm.backward(new TestClass2(), TestClass1);
						},
						(e) => isTestErrorWithPayload(e, 'class/backward/sync'),
					);
				});

				test('Async', async (t: TestContext) => {
					await t.assert.rejects(
						async () => {
							await am.backwardAsync(new TestClass2(), TestClass1);
						},
						(e) => isTestErrorWithPayload(e, 'class/backward/async'),
					);
				});
			});
		});

		suite('Plain objects', () => {
			suite('Forward', () => {
				test('Sync', (t: TestContext) => {
					t.assert.throws(
						() => {
							sm.forward(makeTestObj(1), 1, 2);
						},
						(e) => isTestErrorWithPayload(e, 'plain/forward/sync'),
					);
				});

				test('Async', async (t: TestContext) => {
					await t.assert.rejects(
						async () => {
							await am.forwardAsync(makeTestObj(1), 1, 2);
						},
						(e) => isTestErrorWithPayload(e, 'plain/forward/async'),
					);
				});
			});

			suite('Backward', () => {
				test('Sync', (t: TestContext) => {
					t.assert.throws(
						() => {
							sm.backward(makeTestObj(2), 2, 1);
						},
						(e) => isTestErrorWithPayload(e, 'plain/backward/sync'),
					);
				});

				test('Async', async (t: TestContext) => {
					await t.assert.rejects(
						async () => {
							await am.backwardAsync(makeTestObj(2), 2, 1);
						},
						(e) => isTestErrorWithPayload(e, 'plain/backward/async'),
					);
				});
			});
		});
	});

	suite('Uses cached steps in subsequent migrations', () => {
		function makeMockedMigrator(
			t: TestContext,
			m: SyncOnlyMigrator,
		): Mocked<SyncOnlyMigrator, 'computeSteps'>;
		function makeMockedMigrator(
			t: TestContext,
			m: AsyncOnlyMigrator,
		): Mocked<AsyncOnlyMigrator, 'computeSteps'>;
		function makeMockedMigrator(
			t: TestContext,
			m: Migrator | SyncOnlyMigrator | AsyncOnlyMigrator,
		): Mocked<Migrator, 'computeSteps'> {
			t.mock.method(m, 'computeSteps');
			return m as Mocked<Migrator, 'computeSteps'>;
		}

		suite('Classes', () => {
			suite('Forward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeMockedMigrator(t, makeSyncOnlyTestMigrator());
					t.assert.ok(m.tryGetCachedSteps(TestClass1, TestClass5) === undefined);

					m.forward(new TestClass1(), TestClass5);
					t.assert.ok(m.tryGetCachedSteps(TestClass1, TestClass5) !== undefined);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
					m.computeSteps.mock.resetCalls();

					m.forward(new TestClass1(), TestClass5);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
				});

				test('Async', async (t: TestContext) => {
					const m = makeMockedMigrator(t, makeAsyncOnlyTestMigrator());
					t.assert.ok(m.tryGetCachedSteps(TestClass1, TestClass5) === undefined);

					await m.forwardAsync(new TestClass1(), TestClass5);
					t.assert.ok(m.tryGetCachedSteps(TestClass1, TestClass5) !== undefined);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
					m.computeSteps.mock.resetCalls();

					await m.forwardAsync(new TestClass1(), TestClass5);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
				});
			});

			suite('Backward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeMockedMigrator(t, makeSyncOnlyTestMigrator());
					t.assert.ok(m.tryGetCachedSteps(TestClass5, TestClass1) === undefined);

					m.backward(new TestClass5(), TestClass1);
					t.assert.ok(m.tryGetCachedSteps(TestClass5, TestClass1) !== undefined);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
					m.computeSteps.mock.resetCalls();

					m.backward(new TestClass5(), TestClass1);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
				});

				test('Async', async (t: TestContext) => {
					const m = makeMockedMigrator(t, makeAsyncOnlyTestMigrator());
					t.assert.ok(m.tryGetCachedSteps(TestClass5, TestClass1) === undefined);

					await m.backwardAsync(new TestClass5(), TestClass1);
					t.assert.ok(m.tryGetCachedSteps(TestClass5, TestClass1) !== undefined);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
					m.computeSteps.mock.resetCalls();

					await m.backwardAsync(new TestClass5(), TestClass1);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
				});
			});
		});

		suite('Plain objects', () => {
			suite('Forward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeMockedMigrator(t, makeSyncOnlyTestMigrator());
					t.assert.ok(m.tryGetCachedSteps(1, 5) === undefined);

					m.forward(makeTestObj(1), 1, 5);
					t.assert.ok(m.tryGetCachedSteps(1, 5) !== undefined);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
					m.computeSteps.mock.resetCalls();

					m.forward(makeTestObj(1), 1, 5);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
				});

				test('Async', async (t: TestContext) => {
					const m = makeMockedMigrator(t, makeAsyncOnlyTestMigrator());
					t.assert.ok(m.tryGetCachedSteps(1, 5) === undefined);

					await m.forwardAsync(makeTestObj(1), 1, 5);
					t.assert.ok(m.tryGetCachedSteps(1, 5) !== undefined);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
					m.computeSteps.mock.resetCalls();

					await m.forwardAsync(makeTestObj(1), 1, 5);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
				});
			});

			suite('Backward', () => {
				test('Sync', (t: TestContext) => {
					const m = makeMockedMigrator(t, makeSyncOnlyTestMigrator());
					t.assert.ok(m.tryGetCachedSteps(5, 1) === undefined);

					m.backward(makeTestObj(5), 5, 1);
					t.assert.ok(m.tryGetCachedSteps(5, 1) !== undefined);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
					m.computeSteps.mock.resetCalls();

					m.backward(makeTestObj(5), 5, 1);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
				});

				test('Async', async (t: TestContext) => {
					const m = makeMockedMigrator(t, makeAsyncOnlyTestMigrator());
					t.assert.ok(m.tryGetCachedSteps(5, 1) === undefined);

					await m.backwardAsync(makeTestObj(5), 5, 1);
					t.assert.ok(m.tryGetCachedSteps(5, 1) !== undefined);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 1);
					m.computeSteps.mock.resetCalls();

					await m.backwardAsync(makeTestObj(5), 5, 1);
					t.assert.strictEqual(m.computeSteps.mock.callCount(), 0);
				});
			});
		});
	});

	suite('Asynchronously migrates between versions with mixed sync & async migrations', () => {
		const m = new Migrator();

		function makeSyncMigration(
			fromClass: Class<TestClass<number>>,
			toClass: Class<TestClass<number>>,
		): SyncMigration<TestClass<number>, TestClass<number>> {
			return (o) => {
				const c = new toClass();
				c.sequence = [...o.sequence, c.version];
				return c;
			};
		}

		function makeAsyncMigration(
			fromClass: Class<TestClass<number>>,
			toClass: Class<TestClass<number>>,
		): AsyncMigration<TestClass<number>, TestClass<number>> {
			return async (o) => {
				await noopAsync();
				const c = new toClass();
				c.sequence = [...o.sequence, c.version];
				return c;
			};
		}

		m.register(
			TestClass1,
			TestClass2,
			makeSyncMigration(TestClass1, TestClass2),
			makeAsyncMigration(TestClass2, TestClass1),
		);

		m.register(
			TestClass2,
			TestClass3,
			makeAsyncMigration(TestClass2, TestClass3),
			makeSyncMigration(TestClass3, TestClass2),
		);

		m.register(
			TestClass3,
			TestClass4,
			makeSyncMigration(TestClass3, TestClass4),
			makeAsyncMigration(TestClass4, TestClass3),
		);

		m.register(
			TestClass4,
			TestClass5,
			makeAsyncMigration(TestClass4, TestClass5),
			makeSyncMigration(TestClass5, TestClass4),
		);

		test('Forward', async (t: TestContext) => {
			const res = await m.forwardAsync(new TestClass1(), TestClass5);

			t.assert.strictEqual(res.changed, true);
			t.assert.ok(res.value instanceof TestClass5);
			t.assert.deepStrictEqual(res.value.sequence, [1, 2, 3, 4, 5]);
		});

		test('Backward', async (t: TestContext) => {
			const res = await m.backwardAsync(new TestClass5(), TestClass1);

			t.assert.strictEqual(res.changed, true);
			t.assert.ok(res.value instanceof TestClass1);
			t.assert.deepStrictEqual(res.value.sequence, [5, 4, 3, 2, 1]);
		});
	});
});
