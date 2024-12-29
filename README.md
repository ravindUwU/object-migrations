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

```typescript
// Register migrations.
const m = new Migrator();
m.register<V1, V2>(1, 2, (v1) => new V2());
m.register<V2, V3>(2, 3, (v2) => new V3());

// Read data. V1? V2? V3?
const storeData = store.read();

// Migrate data (always; or just if storeData.version !== 3 🤷).
const migrated = m.migrate<V3>(storeData, storeData.version ?? 1, 3);
if (migrated.changed) {
	store.write(migrated.value);
}

// Use V3 🎉.
const data: V3 = migrated.value;
```

## To do

- Logic:

  - [x] Basics <br> _With `1to2` and `2to3` registered, `migrate(1, 3)` does `1to2`,`2to3`._
  - [x] Caching
  - [ ] Bidirectional migrations <br> _With `2to1` and `3to2` registered along with `1to2` and
        `2to3`, `migrate(3, 1)` does `3to2`, `2to1`._
  - [ ] Short circuiting <br> _With `1to2`, `2to3` and `1to3` registered, `migrate(1, 3)` uses
        `1to3` instead of `1to2`,`2to3`_

- TypeScript implementation:

  - [ ] Optional type inference from versions when migrating plain objects?
  - [ ] Friendlier way to migrate objects that are instances of classes (not plain objects)
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
