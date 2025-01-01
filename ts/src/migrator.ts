import { MigrationError, NoMigrationStepsError } from './errors.js';
import { type Class } from './util.js';

export type Version = string | number | symbol | Function;

export type SyncMigration<TFrom, TTo> = (fromObject: TFrom) => TTo;
export type AsyncMigration<TFrom, TTo> = (fromObject: TFrom) => Promise<TTo>;
export type Migration<TFrom, TTo> = SyncMigration<TFrom, TTo> | AsyncMigration<TFrom, TTo>;

/** @internal */
export interface Step {
	readonly to: Version;
	readonly migration: Migration<unknown, unknown>;
}

/**
 * Result of a successful migration.
 */
export interface Migrated<TTo> {
	/**
	 * The migrated object.
	 */
	readonly value: TTo;

	/**
	 * Whether the object changed during the migration. `false` if the object was already at the
	 * version that it was attempted to be migrated to, in which case {@linkcode value} is the
	 * initial (unchanged) object.
	 */
	readonly changed: boolean;
}

/**
 * Allows registering migrations between object versions and then migrating objects forward and
 * backward accordingly.
 *
 * @remarks
 *
 * - First register migrations with {@linkcode register}. Then, migrate objects forward
 *   with {@linkcode forward}/{@linkcode forwardAsync} and backward with
 *   {@linkcode backward}/{@linkcode backwardAsync}.
 *
 *   ```typescript
 *   const m = new Migrator();
 *
 *   m.register(1, 2, ...);
 *   m.register(2, 3, ...);
 *
 *   const v2 = m.forward<V2>(v1Object, 1, 2);
 *   ```
 *
 * - A record of version-type mappings can be optionally specified, so that subsequent
 *   {@linkcode register}, {@linkcode forward}, {@linkcode forwardAsync}, {@linkcode backward}, and
 *   {@linkcode backwardAsync} calls are typed accordingly.
 *
 *   ```typescript
 *   const m = new Migrator<{
 *       1: V1,
 *       2: V2,
 *   }>();
 *
 *   m.register(1, 2, ...);
 *
 *   const v2: V2 = m.forward(v1Object, 1, 2);
 *   ```
 */
export class Migrator<TVersions = unknown> {
	/** @internal */
	readonly forwardStep = new Map<Version, Step>();

	/** @internal */
	readonly backwardStep = new Map<Version, Step>();

	/**
	 * Registers the forward and optional backward migrations between two successive versions.
	 *
	 * @remarks
	 *
	 * - Versions are strings, numbers or symbols.
	 *
	 *   ```typescript
	 *   register<V1, V2>(1, 2, (v1) => makeV2(), (v2) => makeV1());
	 *   ```
	 *
	 * - If the objects are instances of classes, the class (type) itself can be used as the version,
	 *   and the parameter & return types of the migrations will be inferred accordingly.
	 *
	 *   ```typescript
	 *   register(V1, V2, (v1) => new V2(...), (v2) => new V1(...));
	 *   ```
	 *
	 * - Migrations can be synchronous or asynchronous. {@linkcode forward} & {@linkcode backward}
	 *   work only with synchronous migrations. {@linkcode forwardAsync} & {@linkcode backwardAsync}
	 *   work with both.
	 *
	 *   ```typescript
	 *   register(V1, V2, (v1) => getV2(), (v2) => getV1());
	 *   register(V1, V2, async (v1) => await getV2Async(), async (v2) => await getV1Async());
	 *   ```
	 */

	register<TFrom, TTo>(
		fromClass: Class<TFrom>,
		toClass: Class<TTo>,
		forward: Migration<TFrom, TTo>,
		backward?: Migration<TTo, TFrom>,
	): void;

	register<TFrom extends keyof TVersions, TTo extends keyof TVersions>(
		fromVersion: TFrom,
		toVersion: TTo,
		forward: Migration<TVersions[TFrom], TVersions[TTo]>,
		backward?: Migration<TVersions[TTo], TVersions[TFrom]>,
	): void;

	register<TFrom, TTo>(
		fromVersion: Version,
		toVersion: Version,
		forward: Migration<TFrom, TTo>,
		backward?: Migration<TTo, TFrom>,
	): void;

	register<TFrom, TTo>(
		from: Version | Class<TFrom>,
		to: Version | Class<TTo>,
		forward: Migration<TFrom, TTo>,
		backward?: Migration<TTo, TFrom>,
	): void {
		this.forwardStep.set(from, {
			to,
			migration: forward as Migration<unknown, unknown>,
		});

		if (backward !== undefined) {
			this.backwardStep.set(to, {
				to: from,
				migration: backward as Migration<unknown, unknown>,
			});
		}
	}

	/**
	 * Migrates an object forward between two versions.
	 *
	 * @remarks
	 *
	 * - Use the 3-parameter overload to specify the object and the versions it is being migrated in
	 *   between.
	 *
	 *   ```typescript
	 *   const v2 = forward<V2>(v1Object, 1, 2);
	 *   ```
	 *
	 * - If version-type mappings are specified, the return type will be inferred accordingly.
	 *
	 *   ```typescript
	 *   const v2 = forward(v1Object, 1, 2);
	 *   ```
	 *
	 * - If the objects are instances of classes and their classes were {@link register registered}
	 *   as their versions, use the 2-parameter overload.
	 *
	 *   ```typescript
	 *   const v2 = forward(v1Object, V2);
	 *   ```
	 *
	 * - Immediately returns a result with the same object, if it is already at the version it is
	 *   being migrated to.
	 *
	 * - To run asynchronously, use {@link forwardAsync} instead.
	 *
	 * - Throws {@linkcode NoMigrationStepsError}, {@linkcode MigrationError}.
	 */

	forward<TTo>(obj: object, toClass: Class<TTo>): Migrated<TTo>;

	forward<TTo extends keyof TVersions>(
		obj: object,
		fromVersion: Version,
		toVersion: TTo,
	): Migrated<TVersions[TTo]>;

	forward<TTo>(obj: object, fromVersion: Version, toVersion: Version): Migrated<TTo>;

	forward<TTo>(
		obj: object,
		fromVersionOrToClass: Version | Class<TTo>,
		toVersion?: Version,
	): Migrated<TTo> {
		if (toVersion !== undefined) {
			const fromVersion = fromVersionOrToClass;
			return this.migrate<TTo>(obj, fromVersion, toVersion, this.forwardStep);
		} else {
			const fromClass = obj.constructor;
			const toClass = fromVersionOrToClass;
			return this.migrate<TTo>(obj, fromClass, toClass, this.forwardStep);
		}
	}

	/**
	 * Asynchronously migrates an object forward between two versions. Like {@linkcode forward}, but
	 * supports both synchronous and asynchronous migrations.
	 */

	forwardAsync<TTo>(obj: object, toClass: Class<TTo>): Promise<Migrated<TTo>>;

	forwardAsync<TTo extends keyof TVersions>(
		obj: object,
		fromVersion: Version,
		toVersion: TTo,
	): Promise<Migrated<TVersions[TTo]>>;

	forwardAsync<TTo>(obj: object, fromVersion: Version, toVersion: Version): Promise<Migrated<TTo>>;

	async forwardAsync<TTo>(
		obj: object,
		fromVersionOrToClass: Version | Class<TTo>,
		toVersion?: Version,
	): Promise<Migrated<TTo>> {
		if (toVersion !== undefined) {
			const fromVersion = fromVersionOrToClass;
			return await this.migrateAsync<TTo>(obj, fromVersion, toVersion, this.forwardStep);
		} else {
			const fromClass = obj.constructor;
			const toClass = fromVersionOrToClass;
			return await this.migrateAsync<TTo>(obj, fromClass, toClass, this.forwardStep);
		}
	}

	/**
	 * Migrates an object backward between two versions.
	 *
	 * @remarks
	 *
	 * - Use the 3-parameter overload to specify the object and the versions it is being migrated in
	 *   between.
	 *
	 *   ```typescript
	 *   const v2 = backward<V2>(v1Object, 1, 2);
	 *   ```
	 *
	 * - If version-type mappings are specified, the return type will be inferred accordingly.
	 *
	 *   ```typescript
	 *   const v2 = backward(v1Object, 1, 2);
	 *   ```
	 *
	 * - If the objects are instances of classes and their classes were {@link register registered}
	 *   as their versions, use the 2-parameter overload.
	 *
	 *   ```typescript
	 *   const v2 = backward(v1Object, V2);
	 *   ```
	 *
	 * - Immediately returns a result with the same object, if it is already at the version it is
	 *   being migrated to.
	 *
	 * - To run asynchronously, use {@link backwardAsync} instead.
	 *
	 * - Throws {@linkcode NoMigrationStepsError}, {@linkcode MigrationError}.
	 */

	backward<TTo>(obj: object, toClass: Class<TTo>): Migrated<TTo>;

	backward<TTo extends keyof TVersions>(
		obj: object,
		fromVersion: Version,
		toVersion: TTo,
	): Migrated<TVersions[TTo]>;

	backward<TTo>(obj: object, fromVersion: Version, toVersion: Version): Migrated<TTo>;

	backward<TTo>(obj: object, fromVersionOrToClass: Version, toVersion?: Version): Migrated<TTo> {
		const versions = this.resolveOverloadVersions(obj, fromVersionOrToClass, toVersion);
		return this.migrate<TTo>(obj, versions.from, versions.to, this.backwardStep);
	}

	/**
	 * Asynchronously migrates an object backward between two versions. Like {@linkcode backward},
	 * but supports both synchronous and asynchronous migrations.
	 */

	backwardAsync<TTo>(obj: object, toClass: Class<TTo>): Promise<Migrated<TTo>>;

	backwardAsync<TTo extends keyof TVersions>(
		obj: object,
		fromVersion: Version,
		toVersion: TTo,
	): Promise<Migrated<TVersions[TTo]>>;

	backwardAsync<TTo>(obj: object, fromVersion: Version, toVersion: Version): Promise<Migrated<TTo>>;

	async backwardAsync<TTo>(
		obj: object,
		fromVersionOrToClass: Version,
		toVersion?: Version,
	): Promise<Migrated<TTo>> {
		const versions = this.resolveOverloadVersions(obj, fromVersionOrToClass, toVersion);
		return await this.migrateAsync<TTo>(obj, versions.from, versions.to, this.backwardStep);
	}

	/** @internal */
	resolveOverloadVersions(
		obj: object,
		fromVersionOrToClass: Version,
		toVersion?: Version,
	): { from: Version; to: Version } {
		if (toVersion !== undefined) {
			// 3 args: (plainObject, v1, v2)
			return { from: fromVersionOrToClass, to: toVersion };
		} else {
			// 2 args: (new V1(), V2)
			return { from: obj.constructor, to: fromVersionOrToClass };
		}
	}

	/** @internal */
	migrate<TTo>(
		obj: unknown,
		from: Version,
		to: Version,
		nextStep: Map<Version, Step>,
	): Migrated<TTo> {
		// Same versions? Return immediately.
		if (from === to) {
			return {
				value: obj as TTo,
				changed: false,
			};
		}

		// Get steps.
		let steps = this.tryGetCachedSteps(from, to);
		if (steps === undefined) {
			steps = this.computeSteps(from, to, nextStep);
			this.cacheSteps(from, to, steps);
		}

		// Migrate.
		let migratedObj = obj;
		for (const step of steps) {
			try {
				const migrate = step.migration as SyncMigration<unknown, unknown>;
				migratedObj = migrate(migratedObj);
			} catch (e: unknown) {
				throw new MigrationError(from, to, e);
			}
		}

		return {
			value: migratedObj as TTo,
			changed: true,
		};
	}

	/** @internal */
	async migrateAsync<TTo>(
		obj: unknown,
		from: Version,
		to: Version,
		nextStep: Map<Version, Step>,
	): Promise<Migrated<TTo>> {
		// Same versions? Return immediately.
		if (from === to) {
			return {
				value: obj as TTo,
				changed: false,
			};
		}

		// Get steps.
		let steps = this.tryGetCachedSteps(from, to);
		if (steps === undefined) {
			steps = this.computeSteps(from, to, nextStep);
			this.cacheSteps(from, to, steps);
		}

		// Migrate.
		let migratedObj = obj;
		for (const step of steps) {
			try {
				const migrateAsync = step.migration as AsyncMigration<unknown, unknown>;
				migratedObj = await Promise.resolve(migrateAsync(migratedObj));
			} catch (e: unknown) {
				throw new MigrationError(from, to, e);
			}
		}

		return {
			value: migratedObj as TTo,
			changed: true,
		};
	}

	/**
	 * Computes steps to migrate an object from between two versions.
	 *
	 * @remarks
	 * - Iterate the steps in order and apply their migrations to migrate the object.
	 * - Throws {@linkcode NoMigrationStepsError}.
	 *
	 * @internal
	 */
	computeSteps(from: Version, to: Version, nextStep: Map<Version, Step>): Step[] {
		const steps: Step[] = [];

		// Repeatedly append the next step, starting at version `from`, until (and including) the
		// step that results in version `to`.
		//
		// Assuming versions 1 through 4 are registered, and an object is being migrated from 1 to 4,
		// the computed steps would be [1to2, 2to3, 3to4].

		let step: Step | undefined = nextStep.get(from);
		if (step === undefined) {
			throw new NoMigrationStepsError(from, to);
		}

		while (step !== undefined) {
			steps.push(step);
			if (step.to === to) {
				break;
			}
			step = nextStep.get(step.to);
		}

		if (steps.length === 0 || steps[steps.length - 1]!.to !== to) {
			throw new NoMigrationStepsError(from, to);
		}

		return steps;
	}

	/** @internal */
	readonly cache = new Map</* from */ Version, Map</* to */ Version, Step[]>>();

	/**
	 * Gets the previously cached steps to migrate an object between two versions, or `undefined`
	 * if no steps have been cached yet.
	 *
	 * @internal
	 */
	tryGetCachedSteps(from: Version, to: Version): Step[] | undefined {
		return this.cache.get(from)?.get(to);
	}

	/**
	 * Caches steps to migrate an object between two versions.
	 *
	 * @internal
	 */
	cacheSteps(from: Version, to: Version, steps: Step[]): void {
		if (steps.length === 0) {
			throw new RangeError('There must be at least 1 step to be cached.');
		}

		let toMap = this.cache.get(from);
		if (toMap === undefined) {
			toMap = new Map();
			this.cache.set(from, toMap);
		}

		toMap.set(to, steps);
	}
}
