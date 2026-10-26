import type { Connection, Types } from 'mongoose';
import { getPatientModel } from '../models/patient.model.js';

/**
 * Shared list-search helpers.
 *
 * Two cross-cutting concerns are centralised here so every list endpoint behaves
 * consistently:
 *
 * 1. Regex-injection / ReDoS safety — raw user input passed straight into a
 *    MongoDB `$regex` lets a stray `(` or `\` throw an invalid-regex error (HTTP
 *    500) and lets crafted input force catastrophic backtracking. `regexContains`
 *    escapes the input so it is matched literally.
 *
 * 2. Patient-name search — on clinical/financial collections the patient is a
 *    referenced ObjectId (`patientId`), so a regex over the host collection can
 *    never match a patient's name. `resolvePatientIdsByName` pre-resolves the
 *    matching patient `_id`s; callers OR `{ patientId: { $in: ids } }` into their
 *    filter (only when `ids.length`, otherwise the clause would match nothing and
 *    must be omitted).
 */

/** Escape user input so it is matched as a literal inside a MongoDB `$regex`. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive "contains" condition built from (escaped) user input. */
export function regexContains(search: string): { $regex: string; $options: string } {
  return { $regex: escapeRegex(search), $options: 'i' };
}

/**
 * Resolve patient `_id`s whose bilingual name (firstName/lastName, en + ar)
 * matches `search`. Returns `[]` when nothing matches — callers must then omit
 * the `patientId` clause rather than OR-ing an empty `$in` (which matches none).
 */
export async function resolvePatientIdsByName(
  tenantDb: Connection,
  search: string,
): Promise<Types.ObjectId[]> {
  const Patient = getPatientModel(tenantDb);
  const matched = (await Patient.find({
    $or: [
      { 'firstName.en': regexContains(search) },
      { 'firstName.ar': regexContains(search) },
      { 'lastName.en': regexContains(search) },
      { 'lastName.ar': regexContains(search) },
    ],
  })
    .select('_id')
    .lean()) as Array<{ _id: Types.ObjectId }>;
  return matched.map((p) => p._id);
}

/**
 * Convenience clause builder: returns `[{ patientId: { $in: ids } }]` when any
 * patient matched `search`, else `[]`. Spread directly into a `filter.$or` array.
 */
export async function patientNameOrClause(
  tenantDb: Connection,
  search: string,
): Promise<Array<{ patientId: { $in: Types.ObjectId[] } }>> {
  const ids = await resolvePatientIdsByName(tenantDb, search);
  return ids.length ? [{ patientId: { $in: ids } }] : [];
}
