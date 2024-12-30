import { type Migrated, type Migrator } from './migrator.js';
import { TestClass1, TestClass5, type TestObj } from './migrator.test-util.js';
import { expectTypeOf } from 'expect-type';

{
	// Test: Test classes not assignable to each other.
	//
	// TypeScript does structural typing, so two variables could be of different classes but considered
	// equivalent/assignable to each other, if the classes have the same members:
	//     expectTypeOf(new C1()).not.toEqualTypeOf(new C2());
	//         ...fails if C1 & C2 are structurally equivalent, e.g.:
	//             class C1 {}
	//             class C2 {}
	//         ...succeeds if they aren't:
	//             class C1 { n = 1 as const }
	//             class C2 { n = 2 as const }
	//
	// Ensure that our test classes are distinct, for the other tests to be meaningful.
	expectTypeOf<TestClass1>().not.toEqualTypeOf<TestClass5>();
}

// Classes
{
	const m: Migrator = null!;

	// Test: Return type inferred when migrating forward.
	expectTypeOf(m.forward(new TestClass1(), TestClass5)).toEqualTypeOf<Migrated<TestClass5>>();

	// Test: Return type inferred when migrating backward.
	expectTypeOf(m.backward(new TestClass5(), TestClass1)).toEqualTypeOf<Migrated<TestClass1>>();
}

// Predefined versions
{
	const m: Migrator<{
		1: TestObj<1>;
		5: TestObj<5>;
	}> = null!;

	const o1: TestObj<1> = null!;
	const o5: TestObj<1> = null!;

	// Test: Return type inferred when migrating forward.
	expectTypeOf(m.forward(o1, 1, 5)).toEqualTypeOf<Migrated<TestObj<5>>>();

	// Test: Return type inferred when migrating backward.
	expectTypeOf(m.backward(o5, 5, 1)).toEqualTypeOf<Migrated<TestObj<1>>>();
}
