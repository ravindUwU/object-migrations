# Object Migrations

> [!NOTE]
>
> **Still a work in progress!!** The examples below will likely change as I [complete](#to-do) this
> project and finalise its APIs.
>
> I've written similar logic several times across several projects after unsuccessful attempts at
> finding libraries/a standardised way to do this <sup><sup>is my Google-fu not good enough?
> 😭</sup></sup>, so I thought I'd make a smol library out of it :3

Linear, in-memory migrations for versioned objects.

## Usage

```typescript
// 1. Make a migrator.

// 1.1.
const m = new Migrator();

// 1.2. Optionally, with predefined version-type mappings.
const m = new Migrator<{
	1: V1;
	2: V2;
}>();

// 2. Register migrations.

// 2.1. Plain objects?
m.register<V1, V2>(1, 2, (v1) => ({ v: 2 }));
m.register<V2, V3>(2, 3, (v2) => ({ v: 3 }));

// 2.2. Classes?
m.register(V1, V2, (v1) => new V2());
m.register(V2, V3, (v2) => new V3());

// 3. Read & migrate data (always; or just if it's outdated).
const storeData: V1 | V2 | V3 = store.read();

// 3.1. Plain objects?
const migrated = m.forward<V3>(storeData, storeData.version, 3);

// 3.2. Classes?
const migrated = m.forward(storeData, V3);

// 4. Use the migrated data 🎉
if (migrated.changed) {
	store.write(migrated.value);
}

const data: V3 = migrated.value;
```

## To do

- Logic:

  - [x] Basics <br> _With `1to2` and `2to3` registered, `migrate(1, 3)` does `1to2`,`2to3`._
  - [x] Caching
  - [x] Bidirectional migrations <br> _With `2to1` and `3to2` registered along with `1to2` and
        `2to3`, `migrate(3, 1)` does `3to2`, `2to1`._
  - [ ] Short circuiting <br> _With `1to2`, `2to3` and `1to3` registered, `migrate(1, 3)` does
        `1to3` instead of `1to2`,`2to3`_

- TypeScript implementation:

  - [x] Optional type inference from versions when migrating plain objects?
  - [x] Friendlier way to migrate objects that are instances of classes (not plain objects)
  - [ ] Async
  - [ ] ESM package
  - [ ] UMD package

- Additional implementations?

  - [ ] .NET
  - [ ] Python

- Project:

  - [ ] Name <br> _I reckon "object migrations" goes straight to the point and seems to be available
        on NPM and NuGet for now._
  - [ ] Logo?
