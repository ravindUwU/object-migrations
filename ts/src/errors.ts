import { type Version } from './migrator.js';

export abstract class MigratorError extends Error {
	constructor(name: string, message: string) {
		super(message);
		this.name = name;
	}
}

export class MigrationError extends MigratorError {
	constructor(
		public readonly from: Version,
		public readonly to: Version,
		public readonly cause: unknown,
	) {
		super('MigrationError', `Error thrown while migrating an object from version ${from} to ${to}`);
	}
}

export class NoMigrationStepsError extends MigratorError {
	constructor(
		public readonly from: Version,
		public readonly to: Version,
	) {
		super('NoMigrationStepsError', `No migration steps from version ${from} to ${to}`);
	}
}
