import { Migrator } from './migrator.js';

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

export function makeTestObjMigrator(): Migrator {
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
