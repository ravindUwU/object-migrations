import { MigrationError, NoMigrationStepsError } from './errors.js';

export type Version = string | number;

export type Migration<TFrom, TTo> = (fromObject: TFrom) => TTo;

export interface Step {
	readonly from: Version;
	readonly to: Version;
	readonly migration: Migration<unknown, unknown>;
}

export interface Migrated<TTo> {
	readonly value: TTo;
	readonly changed: boolean;
}

export class Migrator {
	readonly prevStep = new Map<Version, Step>();

	register<TFrom, TTo>(from: Version, to: Version, migration: Migration<TFrom, TTo>): void {
		this.prevStep.set(to, {
			from,
			to,
			migration: migration as Migration<unknown, unknown>,
		});
	}

	migrate<TTo>(obj: unknown, from: Version, to: Version): Migrated<TTo> {
		if (from === to) {
			return {
				value: obj as TTo,
				changed: false,
			};
		}

		let steps = this.tryGetCachedSteps(from, to);
		if (steps === undefined) {
			steps = [];

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

			this.cacheSteps(from, to, steps);
		}

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

	readonly cache = new Map</* from */ Version, Map</* to */ Version, Step[]>>();

	tryGetCachedSteps(from: Version, to: Version): Step[] | undefined {
		return this.cache.get(from)?.get(to);
	}

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
