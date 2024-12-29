import { MigrationError, NoMigrationStepsError } from './errors.js';

export type Version = string | number;

export type Migration<TFrom, TTo> = (fromObject: TFrom) => TTo;

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

export class Migrator {
	readonly forwardStep = new Map<Version, Step>();
	readonly backwardStep = new Map<Version, Step>();

	/**
	 * Registers the forward and (optionally) backward migrations between two successive versions.
	 */
	register<TFrom, TTo>(
		from: Version,
		to: Version,
		forward: Migration<TFrom, TTo>,
		backward?: Migration<TFrom, TTo>,
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
	 * Migrates an object forward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @param obj The object to migrate.
	 * @param from The version of the object.
	 * @param to The version to which the object is migrated.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 */
	forward<TTo>(obj: unknown, from: Version, to: Version): Migrated<TTo> {
		return this.migrateInternal<TTo>(obj, from, to, this.forwardStep);
	}

	/**
	 * Migrates an object backward between two versions. Immediately returns a result with the same
	 * object, if the two versions are the same.
	 *
	 * @param obj The object to migrate.
	 * @param from The version of the object.
	 * @param to The version to which the object is migrated.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 */
	backward<TTo>(obj: unknown, from: Version, to: Version): Migrated<TTo> {
		return this.migrateInternal<TTo>(obj, from, to, this.backwardStep);
	}

	migrateInternal<TTo>(
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
				migratedObj = step.migration(migratedObj);
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
