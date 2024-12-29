import { MigrationError, NoMigrationStepsError } from './errors.js';

export type Version = string | number;

export type Migration<TFrom, TTo> = (fromObject: TFrom) => TTo;

export interface Step {
	readonly from: Version;
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
	readonly prevStep = new Map<Version, Step>();

	/**
	 * Registers a migration between two successive versions.
	 */
	register<TFrom, TTo>(from: Version, to: Version, migration: Migration<TFrom, TTo>): void {
		this.prevStep.set(to, {
			from,
			to,
			migration: migration as Migration<unknown, unknown>,
		});
	}

	/**
	 * Migrates an object between two versions.
	 *
	 * @param obj The object to migrate.
	 * @param from The version of the object.
	 * @param to The version to which the object is migrated.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}, {@link MigrationError}.
	 */
	migrate<TTo>(obj: unknown, from: Version, to: Version): Migrated<TTo> {
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
			steps = this.computeSteps(from, to);
			this.cacheSteps(from, to, steps);
		}

		// Migrate.
		// Reverse-iterate steps, apply each function.
		let migratedObj = obj;
		for (let i = steps.length - 1; i >= 0; i--) {
			try {
				migratedObj = steps[i]!.migration(migratedObj);
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
	 * Computes steps to migrate an object from between two versions. Reverse-iterate the steps to
	 * apply their migrations in order.
	 *
	 * @remarks
	 * Throws: {@link NoMigrationStepsError}.
	 */
	computeSteps(from: Version, to: Version): Step[] {
		const steps: Step[] = [];

		// Repeatedly append the step from the version that precedes the current version, starting
		// at version `to`, until (and including) the step whose preceding version is `from`.
		//
		// Assuming versions 1 through 4 and an object being migrated from 1 to 4, the assembled
		// steps would be [3to4, 2to3, 1to2].

		let step: Step | undefined = this.prevStep.get(to);
		if (step === undefined) {
			throw new NoMigrationStepsError(from, to);
		}

		while (step !== undefined) {
			steps.push(step);
			if (step.from === from) {
				break;
			}
			step = this.prevStep.get(step.from);
		}

		if (steps.length === 0 || steps[steps.length - 1]!.from !== from) {
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
