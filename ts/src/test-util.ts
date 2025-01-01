import { type Mock } from 'node:test';
import { type FunctionNames } from './util.js';

/**
 * Used to forward-declare mocked methods, making their `mock.*` properties accessible without type
 * errors.
 *
 * @example
 * ```typescript
 * const thing = new Thing() as Mocked<Thing, 'method1' | 'method2'>;
 * t.mock.method(thing, 'method1');
 * t.mock.method(thing, 'method2');
 *
 * thing.method1.mock.callCount();
 * thing.method2.mock.callCount();
 * // No type errors here. Without the "as Mocked<...>", TypeScript reports "Property 'mock' does
 * // not exist on type '() => void'".
 * ```
 */
export type Mocked<T, F extends FunctionNames<T>> = Omit<T, F> & {
	[f in F]: T[f] extends Function ? Mock<T[f]> : never;
};

/**
 * Generic error with an arbitrary payload, for testing.
 */
export class TestError extends Error {
	constructor(public readonly payload?: unknown) {
		super('TestError');
		this.name = 'TestError';
	}
}

/**
 * Returns a promise that resolves immediately, doing nothing.
 */
export function noopAsync(): Promise<void> {
	return new Promise((resolve) => {
		resolve();
	});
}
