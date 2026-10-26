/**
 * Custom Field Schemas — Zod Validation
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 Module #11 — Custom Fields
 * Dynamic fields per entity (Patient, Appointment, Invoice, etc.)
 */

import { z } from 'zod';

// ── Field Type Enum ─────────────────────────────────────────

export const customFieldTypeEnum = z.enum([
  'text',
  'number',
  'date',
  'boolean',
  'select',
  'multiselect',
  'textarea',
  'email',
  'phone',
  'url',
]);

// ── Entity Enum ─────────────────────────────────────────────

export const customFieldEntityEnum = z.enum([
  'patient',
  'appointment',
  'invoice',
  'treatment_plan',
  'prescription',
  'lab_order',
]);

// ── Select Option Schema ────────────────────────────────────

const selectOptionSchema = z.object({
  label: z.object({
    en: z.string().min(1).max(100),
    ar: z.string().max(100).optional(),
  }),
  value: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
});

// ── Validation Rules Schema ─────────────────────────────────

const validationRulesSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().max(500).optional(),
  patternMessage: z.string().max(200).optional(),
});

// ── Create Custom Field Schema ──────────────────────────────

export const createCustomFieldSchema = z
  .object({
    entity: customFieldEntityEnum,
    fieldKey: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z][a-zA-Z0-9_]*$/, 'Field key must be camelCase starting with lowercase'),
    label: z.object({
      en: z.string().min(1).max(100),
      ar: z.string().max(100).optional(),
    }),
    description: z
      .object({
        en: z.string().max(500).optional(),
        ar: z.string().max(500).optional(),
      })
      .optional(),
    type: customFieldTypeEnum,
    isRequired: z.boolean().default(false),
    defaultValue: z.unknown().optional().nullable(),
    placeholder: z
      .object({
        en: z.string().max(200).optional(),
        ar: z.string().max(200).optional(),
      })
      .optional(),
    options: z.array(selectOptionSchema).optional(), // For select/multiselect
    validation: validationRulesSchema.optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
    showInList: z.boolean().default(false),
    showInForm: z.boolean().default(true),
  })
  .strict();

// ── Update Custom Field Schema ──────────────────────────────

export const updateCustomFieldSchema = z
  .object({
    label: z
      .object({
        en: z.string().min(1).max(100),
        ar: z.string().max(100).optional(),
      })
      .optional(),
    description: z
      .object({
        en: z.string().max(500).optional(),
        ar: z.string().max(500).optional(),
      })
      .optional(),
    isRequired: z.boolean().optional(),
    defaultValue: z.unknown().optional().nullable(),
    placeholder: z
      .object({
        en: z.string().max(200).optional(),
        ar: z.string().max(200).optional(),
      })
      .optional(),
    options: z.array(selectOptionSchema).optional(),
    validation: validationRulesSchema.optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    showInList: z.boolean().optional(),
    showInForm: z.boolean().optional(),
  })
  .strict();

// ── Query Schema ────────────────────────────────────────────

export const customFieldQuerySchema = z
  .object({
    entity: customFieldEntityEnum.optional(),
    isActive: z.coerce.boolean().optional(),
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

// ── Inferred Types ──────────────────────────────────────────

export type CustomFieldType = z.infer<typeof customFieldTypeEnum>;
export type CustomFieldEntity = z.infer<typeof customFieldEntityEnum>;
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;
export type CustomFieldQueryInput = z.infer<typeof customFieldQuerySchema>;
