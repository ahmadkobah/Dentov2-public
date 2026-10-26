import { Schema, type Document, type Connection, type Model } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export type Permission = 'read' | 'create' | 'update' | 'delete';

export interface IRolePermissionEntry {
  module: string;
  permissions: Permission[];
}

export interface IRolePermissions extends Document {
  role: string;
  modules: IRolePermissionEntry[];
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const rolePermissionEntrySchema = new Schema<IRolePermissionEntry>(
  {
    module: { type: String, required: true },
    permissions: [{ type: String, enum: ['read', 'create', 'update', 'delete'] }],
  },
  { _id: false },
);

const rolePermissionsSchema = new Schema<IRolePermissions>(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      enum: ['dentist', 'receptionist', 'assistant', 'accountant', 'lab_tech', 'hygienist'],
    },
    modules: [rolePermissionEntrySchema],
    updatedBy: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'role_permissions',
  },
);

// ── Model Factory ───────────────────────────────────────────

export function getRolePermissionsModel(connection: Connection): Model<IRolePermissions> {
  return (connection.models.RolePermissions ||
    connection.model('RolePermissions', rolePermissionsSchema)) as Model<IRolePermissions>;
}
