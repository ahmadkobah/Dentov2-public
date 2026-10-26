import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Typed `zodResolver` wrapper.
 *
 * `@hookform/resolvers@5` + zod 4 fail static overload resolution for the bare
 * `.strict()` ZodObjects we share from `@dento/shared`: the schema's internal
 * `_zod` shape doesn't line up with the resolver's expected parameter type,
 * even though the resolver validates correctly at runtime. (Casting only the
 * resolver result — the previous `zodResolver(schema) as any` — no longer
 * works under zod 4 because the argument-level overload failure is itself a
 * hard error.) This wrapper keeps that one unavoidable cast in a single,
 * documented place so call sites stay fully typed via their `useForm<T>`
 * generic instead of scattering casts across every form.
 */
export function zodFormResolver<T extends FieldValues>(schema: ZodType): Resolver<T> {
  return zodResolver(schema as never) as unknown as Resolver<T>;
}
