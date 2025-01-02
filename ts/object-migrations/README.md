<img src="../../assets/logo.svg" pack-src="./assets/logo.svg" height="90" align="right">

# Object Migrations

## Usage

1. Make a migrator.

   ```typescript
   const m = new Migrator();
   ```

   Version-type mappings can be optionally specified in advance (more about versions in the next
   step).

   ```typescript
   const m = new Migrator<{
   	1: V1;
   	2: V2;
   }>();
   ```

2. Register migrations between versions. Migrations can be synchronous or asynchronous.

   Versions can be any number, string, or symbol. If class objects (not plain objects) are being
   migrated, the class (type) itself can be registered as its own version.

   ```typescript
   // Plain objects?
   m.register<V1, V2>(1, 2, (v1) => ({ v: 2 }));
   m.register<V2, V3>(2, 3, (v2) => ({ v: 3 }));

   // Classes?
   m.register(V1, V2, (v1) => new V2());
   m.register(V2, V3, (v2) => new V3());

   // Async?
   m.register<V1, V2>(1, 2, async (v1) => await getV2Async(v1));
   m.register(V1, V2, async (v1) => await getV2Async(v1));
   ```

3. Read & migrate data forward/backward, always/if outdated.

   ```typescript
   const storeData: V1 | V2 | V3 = store.read();

   // Plain objects?
   const migrated = m.forward<V3>(storeData, storeData.version, 3);

   // Classes?
   const migrated = m.forward(storeData, V3);

   // Async/sync and async?
   const migrated = await m.forwardAsync<V3>(storeData, storeData.version, 3);
   const migrated = await m.forwardAsync(storeData, V3);
   ```

4. Use the migrated data.

   ```typescript
   if (migrated.changed) {
   	store.write(migrated.value);
   }

   const data: V3 = migrated.value;
   ```
