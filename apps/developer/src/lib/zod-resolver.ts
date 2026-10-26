import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Typed `zodResolver` wrapper.
 *
 * `@hookform/resolvers@5` + zod 4 fail static overload resolution for the bare
 * `.strict()` ZodObjects we share from `@dento/shared`: the schema's internal
 * `_zod` shape doesn't line up with the resolver's expected parameter type,
 * even though the resolver validates correctly at runtime. This wrapper keeps
 * that one unavoidable cast in a single, documented place so call sites stay
 * fully typed via their `useForm<T>` generic instead of scattering `as any`
 * across every form (cf. the apps/admin convention).
 */
export function zodFormResolver<T extends FieldValues>(schema: ZodType): Resolver<T> {
  return zodResolver(schema as never) as unknown as Resolver<T>;
}
