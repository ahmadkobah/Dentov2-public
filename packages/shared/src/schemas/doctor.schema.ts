/**
 * Doctor Schema — Zod validation
 *
 * Per DENTO_V2_MASTER_PLAN.md §13 — Doctor Management
 * Per V2_DATABASE.md §3.2 — doctors collection
 */

import { z } from 'zod';

// ── Update (doctor-specific fields only — synced fields come from User) ─────

export const updateDoctorSchema = z.object({
  title: z.string().max(20).optional(),
  specialization: z.string().min(1).max(100).optional(),
  licenseNumber: z.string().max(50).optional(),
  bio: z.string().max(2000).optional(),
  branches: z.array(z.string().min(1)).optional(),
  primaryBranchId: z.string().min(1).optional(),
  defaultSlotDuration: z.number().int().min(5).max(120).optional(),
  bufferBetweenSlots: z.number().int().min(0).max(60).optional(),
  isAcceptingNewPatients: z.boolean().optional(),
  isOnlineBookingEnabled: z.boolean().optional(),
  maxDailyPatients: z.number().int().min(1).max(100).optional(),
  color: z.string().max(20).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

// ── Query ───────────────────────────────────────────────────

export const doctorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  specialization: z.string().optional(),
  branchId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z
    .enum(['firstName', 'specialization', 'displayOrder', 'createdAt'])
    .default('displayOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type DoctorQuery = z.infer<typeof doctorQuerySchema>;
