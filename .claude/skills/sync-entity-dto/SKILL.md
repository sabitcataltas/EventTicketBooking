---
name: sync-entity-dto
description: Keep DTOs in sync with entities. Use whenever a TypeORM entity/model (any `*/Entity.ts` in Api/src) is created or changed — a column added, removed, renamed, retyped, or its length/nullability/default changed — so the module's `Dto.ts` zod schemas, the Service input types, and the tests are updated in the same change.
---

# Sync entity changes to DTOs

In this repo every module folder under `Api/src/<Module>/` has:

- `Entity.ts` — TypeORM entity (source of truth for persisted fields)
- `Dto.ts` — zod schemas (`create<X>Schema`, `update<X>Schema`, query schemas) and the `z.output` DTO types
- `Service.ts` — input types derived from the entity (e.g. `Omit<Event, "id" | "createdAt" | "updatedAt" | "version">`)
- `Controller.ts` — validates bodies with `ZodValidationPipe(schema)` and documents them via `toOpenApi(schema)` / `ApiQueryFrom(schema)`

An entity change is not done until the DTO matches it.

## Steps

1. Diff the entity (`git diff -- Api/src/<Module>/Entity.ts`) and list every field that was added, removed, renamed, or changed.
2. Decide which fields are client-writable. Server-managed columns stay out of create/update schemas: `@PrimaryGeneratedColumn`, `@CreateDateColumn`, `@UpdateDateColumn`, `@VersionColumn`. Exception: `version` is required in the update schema (optimistic locking — the client sends the version it last read).
3. Update `Dto.ts` so each writable field mirrors the column:

   | Entity column                                | zod                                                          |
   | -------------------------------------------- | ------------------------------------------------------------ |
   | `varchar` `length: N`                        | `z.string().min(1).max(N)` (drop `.min(1)` if blank allowed) |
   | `nullable: true`                             | `.nullable().default(null)`                                  |
   | `int`                                        | `z.int()` plus sensible `.min()`                             |
   | `bigint` epoch millis (`millis` transformer) | `z.int().min(0)` with a `description` saying epoch ms        |
   | `boolean`                                    | `z.boolean()`                                                |
   | enum                                         | `z.enum([...])` using the same values                        |
   - Keep `z.strictObject`, and keep `.meta({ example, description })` on every field so Swagger stays accurate.
   - Renames/removals: update or delete the schema field; don't leave stale fields.
   - Update schemas extend the create schema; only touch them if the new field needs different rules on update.
   - Query schemas (list filters/sorting) only change if the field should be filterable or the cursor field changed.

4. Check `Service.ts` input types still match (`Omit<...>` lists must name any new server-managed column).
5. TDD, per CLAUDE.md: first add/adjust failing tests in `Controller.test.ts` (validation accepts the new field, rejects invalid values, rejects unknown keys) and `Service.test.ts` if persistence behavior changed; then change the code; then run `npm test -w api`.
6. Run `npx eslint --fix <file>` and `npx prettier --write <file>` on every touched file, then `npm run type:check`. TypeScript errors in Controller/Service usually point at DTO/entity mismatches — fix them, don't cast them away.

## Rules

- No comments in code.
- Minimal changes: only fields affected by the entity change.
- The reverse also applies: if a DTO gains a field that must be persisted, add the column to the entity.
