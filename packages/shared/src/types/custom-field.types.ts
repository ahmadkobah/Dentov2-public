/**
 * Custom Field Types — Phase 7 (Custom Fields)
 *
 * Per V2_DATABASE §10 Module #11, DENTO_V2_MASTER_PLAN §10
 * Used by: CustomFieldsPage (Dev + Admin), useCustomFields, custom-fields.route.ts
 */

import type { CustomFieldType, CustomFieldEntity } from '../schemas/custom-field.schema.js';

export type { CustomFieldType, CustomFieldEntity };

// ── Select Option ───────────────────────────────────────────

export interface CustomFieldSelectOption {
  label: { en: string; ar?: string };
  value: string;
  color?: string;
}

// ── Validation Rules ────────────────────────────────────────

export interface CustomFieldValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

// ── Custom Field Document ───────────────────────────────────

export interface CustomField {
  _id: string;
  entity: CustomFieldEntity;
  fieldKey: string;
  label: { en: string; ar?: string };
  description?: { en?: string; ar?: string };
  type: CustomFieldType;
  isRequired: boolean;
  defaultValue: unknown;
  placeholder?: { en?: string; ar?: string };
  options?: CustomFieldSelectOption[];
  validation?: CustomFieldValidationRules;
  isActive: boolean;
  sortOrder: number;
  showInList: boolean;
  showInForm: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── List Filters ────────────────────────────────────────────

export interface CustomFieldFilters {
  entity?: CustomFieldEntity;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ── API Response Shapes ─────────────────────────────────────

export interface CustomFieldListResponse {
  success: boolean;
  data: CustomField[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomFieldDetailResponse {
  success: boolean;
  data: {
    customField: CustomField;
  };
}

// ── Entity Display Config ───────────────────────────────────

export interface CustomFieldEntityConfig {
  value: CustomFieldEntity;
  label: string;
  icon: string;
}

// ── Field Type Display Config ───────────────────────────────

export interface CustomFieldTypeConfig {
  value: CustomFieldType;
  label: string;
  icon: string;
  description: string;
  hasOptions: boolean;
  hasValidation: boolean;
}
