import { type Version } from './migrator.js';

/**
 * Base class for all errors thrown by the migrator.
 */
export abstract class MigratorError extends Error {
	constructor(name: string, message: string) {
		super(message);
		this.name = name;
	}
}

/**
 * Wraps an error thrown within the migration function, while migrating an object between successive
 * versions.
 */
export class MigrationError extends MigratorError {
	constructor(
		/**
		 * Version from which migration was attempted (version of the object being migrated).
		 */
		public readonly from: Version,

		/**
		 * Version to which migration was attempted.
		 */
		public readonly to: Version,

		/**
		 * The underlying (wrapped) error.
		 */
		public readonly cause: unknown,
	) {
		super(
			'MigrationError',
			`Error "${String(cause)}" thrown while migrating an object from version ` +
				`${describeVersion(from)} to ${describeVersion(to)}`,
		);
	}
}

/**
 * Indicates that the sequence of steps to migrate an object between two versions couldn't be
 * determined.
 *
 * Occurs when migrations between the versions (or a chain of migrations between successive versions
 * starting & ending at the them) haven't been registered beforehand.
 */
export class NoMigrationStepsError extends MigratorError {
	constructor(
		/**
		 * Version from which migration was attempted.
		 */
		public readonly from: Version,

		/**
		 * Version to which migration was attempted.
		 */
		public readonly to: Version,
	) {
		super(
			'NoMigrationStepsError',
			`No migration steps from version ${describeVersion(from)} to ${describeVersion(to)}`,
		);
	}
}

export function describeVersion(v: Version): string {
	return typeof v === 'function' && v.name !== '' ? v.name : String(v);
}
