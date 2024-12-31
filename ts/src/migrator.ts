import { MigrationError, NoMigrationStepsError } from './errors.js';
import { type Class } from './util.js';

export type Version = string | number | symbol | Function;

export type SyncMigration<TFrom, TTo> = (fromObject: TFrom) => TTo;
export type AsyncMigration<TFrom, TTo> = (fromObject: TFrom) => Promise<TTo>;
export type Migration<TFrom, TTo> = SyncMigration<TFrom, TTo> | AsyncMigration<TFrom, TTo>;

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
	 * version that it was attempted to be migrated to.
	 */
	readonly changed: boolean;
}

export class Migrator<TVersions = unknown> {
	readonly forwardStep = new Map<Version, Step>();
	readonly backwardStep = new Map<Version, Step>();

	/**
	 * Registers the forward and (optionally) backward migrations between two successive versions.
	 */
	register<TFrom, TTo>(
		from: Class<TFrom>,
		to: Class<TTo>,
		forward: Migration<TFrom, TTo>,
		backward?: Migration<TTo, TFrom>,
	): void;

	register<TFrom extends keyof TVersions, TTo extends keyof TVersions>(
		from: TFrom,
		to: TTo,
		forward: Migration<TVersions[TFrom], TVersions[TTo]>,
		backward?: Migration<TVersions[TTo], TVersions[TFrom]>,
	): void;

	register<TFrom, TTo>(
		from: Version,
		to: Version,
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
	 * Migrates an object that is an instance of a class (i.e., not a plain object) forward, to an
	 * instance of another class.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param toClass The class to which the object is migrated.
	 */
	forward<TTo>(obj: object, toClass: Class<TTo>): Migrated<TTo>;

	/**
	 * Migrates an object forward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param fromVersion The version of the object.
	 * @param toVersion The version to which the object is migrated.
	 */
	forward<TTo extends keyof TVersions>(
		obj: object,
		fromVersion: Version,
		toVersion: TTo,
	): Migrated<TVersions[TTo]>;

	/**
	 * Migrates an object forward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param fromVersion The version of the object.
	 * @param toVersion The version to which the object is migrated.
	 */
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
	 * Migrates an object that is an instance of a class (i.e., not a plain object) forward, to an
	 * instance of another class.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param toClass The class to which the object is migrated.
	 */
	forwardAsync<TTo>(obj: object, toClass: Class<TTo>): Promise<Migrated<TTo>>;

	/**
	 * Migrates an object forward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param fromVersion The version of the object.
	 * @param toVersion The version to which the object is migrated.
	 */
	forwardAsync<TTo extends keyof TVersions>(
		obj: object,
		fromVersion: Version,
		toVersion: TTo,
	): Promise<Migrated<TVersions[TTo]>>;

	/**
	 * Migrates an object forward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param fromVersion The version of the object.
	 * @param toVersion The version to which the object is migrated.
	 */
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
	 * Migrates an object that is an instance of a class (i.e., not a plain object) backward, to an
	 * instance of another class.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param toClass The class to which the object is migrated.
	 */
	backward<TTo>(obj: object, toClass: Class<TTo>): Migrated<TTo>;

	/**
	 * Migrates an object backward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param fromVersion The version of the object.
	 * @param toVersion The version to which the object is migrated.
	 */
	backward<TTo extends keyof TVersions>(
		obj: object,
		fromVersion: Version,
		toVersion: TTo,
	): Migrated<TVersions[TTo]>;

	/**
	 * Migrates an object backward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param fromVersion The version of the object.
	 * @param toVersion The version to which the object is migrated.
	 */
	backward<TTo>(obj: object, fromVersion: Version, toVersion: Version): Migrated<TTo>;

	backward<TTo>(obj: object, fromVersionOrToClass: Version, toVersion?: Version): Migrated<TTo> {
		const versions = this.resolveOverloadVersions(obj, fromVersionOrToClass, toVersion);
		return this.migrate<TTo>(obj, versions.from, versions.to, this.backwardStep);
	}

	/**
	 * Migrates an object that is an instance of a class (i.e., not a plain object) backward, to an
	 * instance of another class.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param toClass The class to which the object is migrated.
	 */
	backwardAsync<TTo>(obj: object, toClass: Class<TTo>): Promise<Migrated<TTo>>;

	/**
	 * Migrates an object backward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param fromVersion The version of the object.
	 * @param toVersion The version to which the object is migrated.
	 */
	backwardAsync<TTo extends keyof TVersions>(
		obj: object,
		fromVersion: Version,
		toVersion: TTo,
	): Promise<Migrated<TVersions[TTo]>>;

	/**
	 * Migrates an object backward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 *
	 * @param obj The object to migrate.
	 * @param fromVersion The version of the object.
	 * @param toVersion The version to which the object is migrated.
	 */
	backwardAsync<TTo>(obj: object, fromVersion: Version, toVersion: Version): Promise<Migrated<TTo>>;

	async backwardAsync<TTo>(
		obj: object,
		fromVersionOrToClass: Version,
		toVersion?: Version,
	): Promise<Migrated<TTo>> {
		const versions = this.resolveOverloadVersions(obj, fromVersionOrToClass, toVersion);
		return await this.migrateAsync<TTo>(obj, versions.from, versions.to, this.backwardStep);
	}

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
		const migratedObj = this.runSteps(obj, from, to, steps);

		return {
			value: migratedObj as TTo,
			changed: true,
		};
	}

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
		const migratedObj = await this.runStepsAsync(obj, from, to, steps);

		return {
			value: migratedObj as TTo,
			changed: true,
		};
	}

	runSteps(obj: unknown, from: Version, to: Version, steps: Step[]): unknown {
		for (const step of steps) {
			try {
				const migrate = step.migration as SyncMigration<unknown, unknown>;
				obj = migrate(obj);
			} catch (e: unknown) {
				throw new MigrationError(from, to, e);
			}
		}
		return obj;
	}

	async runStepsAsync(obj: unknown, from: Version, to: Version, steps: Step[]): Promise<unknown> {
		for (const step of steps) {
			try {
				const migrateAsync = step.migration as AsyncMigration<unknown, unknown>;
				obj = await Promise.resolve(migrateAsync(obj));
			} catch (e: unknown) {
				throw new MigrationError(from, to, e);
			}
		}
		return obj;
	}

	/**
	 * Computes steps to migrate an object from between two versions. Iterate the steps and apply
	 * their migrations in order to migrate the object.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}.
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

	readonly cache = new Map</* from */ Version, Map</* to */ Version, Step[]>>();

	/**
	 * Gets the steps previously cached via {@link cacheSteps}, to migrate an object between two
	 * versions, or `undefined` if no steps have been cached yet.
	 */
	tryGetCachedSteps(from: Version, to: Version): Step[] | undefined {
		return this.cache.get(from)?.get(to);
	}

	/**
	 * Caches steps to migrate an object between two versions.
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
