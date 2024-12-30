/**
 * Refers to the class (constructor/`new`-able) of a type. Don't use this to instantiate objects at
 * runtime, because it doesn't preserve constructor parameter types.
 *
 * @example
 * ```typescript
 * class Thing {
 *     constructor(n: number, s: string) {}
 * }
 * function make<C>(c: Class<C>): C {
 *     return new c();
 *     // Valid TypeScript, but this would fail at runtime because the 2 parameters aren't provided.
 * }
 * const t = make(Thing);
 * // t is of type Thing. Typing t correctly in APIs like this, is why Class<T> exists.
 * ```
 */
export type Class<T> = Function &
	(new (
		/*
			eslint-disable-next-line @typescript-eslint/no-explicit-any --
			Using unknown[] here seems to break things when T has constructor parameters.
		*/
		...args: any
	) => T);

/*
	I've also tried:

		type Class<T> = T extends new (...args: infer P) => T
			? new (...args: P) => T
			: never;

		function make<C>(c: Class<C>): C { ... }

		make(Thing);
		// Argument of type 'typeof Thing' is not assignable to parameter of type 'never'
*/
