import { Migrator } from './migrator.js';
import { type Class } from './util.js';

// Classes

export abstract class TestClass {
	sequence: number[];

	constructor(readonly version: number) {
		this.sequence = [version];
	}
}

// prettier-ignore
export class TestClass1 extends TestClass { constructor() { super(1); } }

// prettier-ignore
export class TestClass2 extends TestClass { constructor() { super(2); } }

// prettier-ignore
export class TestClass3 extends TestClass { constructor() { super(3); } }

// prettier-ignore
export class TestClass4 extends TestClass { constructor() { super(4); } }

// prettier-ignore
export class TestClass5 extends TestClass { constructor() { super(5); } }

// Plain objects

export interface TestObj<V extends number> {
	readonly version: V;
	readonly sequence: number[];
}

export function makeTestObj<V extends number>(v: V): TestObj<V> {
	return {
		version: v,
		sequence: [v],
	};
}

// Migrator

export function makeTestMigrator(): Migrator {
	const m = new Migrator();

	// Classes

	function registerTestClass<TFrom extends TestClass, TTo extends TestClass>(
		fromClass: Class<TFrom>,
		toClass: Class<TTo>,
	): void {
		m.register<TFrom, TTo>(
			fromClass,
			toClass,
			(o) => {
				const c = new toClass();
				c.sequence = [...o.sequence, c.version];
				return c;
			},
			(o) => {
				const c = new fromClass();
				c.sequence = [...o.sequence, c.version];
				return c;
			},
		);
	}

	registerTestClass(TestClass1, TestClass2);
	registerTestClass(TestClass2, TestClass3);
	registerTestClass(TestClass3, TestClass4);
	registerTestClass(TestClass4, TestClass5);

	// Plain objects

	function registerTestObj(fromVersion: number, toVersion: number): void {
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

	registerTestObj(1, 2);
	registerTestObj(2, 3);
	registerTestObj(3, 4);
	registerTestObj(4, 5);

	return m;
}
