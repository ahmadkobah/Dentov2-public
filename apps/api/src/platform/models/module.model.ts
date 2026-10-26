import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Module Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §24 — Module Versioning System
 *
 * Stores module definitions with SemVer versioning, lifecycle status,
 * changelogs, dependencies, conflicts, and migration scripts.
 *
 * Lifecycle: DEVELOPMENT → BETA → ACTIVE → DEPRECATED → RETIRED
 */

// ── Types ───────────────────────────────────────────────────

export interface IChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
}

export interface IMigrationEntry {
  version: string;
  type: 'addField' | 'removeField' | 'addIndex' | 'addCollection' | 'migrateData';
  collection: string;
  field?: string;
  description?: string;
}

export interface IModule extends Document {
  slug: string;
  name: { en: string; ar?: string };
  description: { en: string; ar?: string };
  version: string; // SemVer
  status: 'development' | 'beta' | 'active' | 'deprecated' | 'retired';
  type: 'core' | 'paid';
  changelog: IChangelogEntry[];
  dependsOn: string[];
  conflictsWith: string[];
  migrations: IMigrationEntry[];
  icon: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-Schemas ─────────────────────────────────────────────

const bilingualSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const changelogSchema = new Schema<IChangelogEntry>(
  {
    version: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    changes: [{ type: String }],
  },
  { _id: false },
);

const migrationSchema = new Schema<IMigrationEntry>(
  {
    version: { type: String, required: true },
    type: {
      type: String,
      enum: ['addField', 'removeField', 'addIndex', 'addCollection', 'migrateData'],
      required: true,
    },
    collection: { type: String, required: true },
    field: { type: String },
    description: { type: String },
  },
  { _id: false, suppressReservedKeysWarning: true },
);

// ── Module Schema ───────────────────────────────────────────

const moduleSchema = new Schema<IModule>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9_]+$/,
    },
    name: {
      type: bilingualSchema,
      required: true,
    },
    description: {
      type: bilingualSchema,
      required: true,
      default: () => ({ en: '', ar: '' }),
    },
    version: {
      type: String,
      required: true,
      default: '0.1.0',
      match: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,
    },
    status: {
      type: String,
      enum: ['development', 'beta', 'active', 'deprecated', 'retired'],
      default: 'development',
      index: true,
    },
    type: {
      type: String,
      enum: ['core', 'paid'],
      required: true,
      default: 'paid',
    },
    changelog: {
      type: [changelogSchema],
      default: [],
    },
    dependsOn: {
      type: [String],
      default: [],
    },
    conflictsWith: {
      type: [String],
      default: [],
    },
    migrations: {
      type: [migrationSchema],
      default: [],
    },
    icon: {
      type: String,
      default: 'Package',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'modules',
  },
);

// ── Indexes ─────────────────────────────────────────────────
moduleSchema.index({ slug: 1, status: 1 });
moduleSchema.index({ type: 1, isActive: 1 });

// ── Model ───────────────────────────────────────────────────
export const Module = mongoose.model<IModule>('Module', moduleSchema);
