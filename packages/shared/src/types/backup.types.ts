/**
 * Backup Types — §34 Per-Tenant Backup/Restore
 *
 * BullMQ-based backup system:
 * - Manual trigger or scheduled via cron
 * - mongodump → S3/R2 (gzipped archive)
 * - SHA-256 checksum for integrity
 * - Automatic TTL cleanup via retentionDays + expiresAt
 * - Backup types: scheduled, manual, pre-migration, pre-delete
 */

// ── Backup Type ─────────────────────────────────────────────

export type BackupType = 'scheduled' | 'manual' | 'pre-migration' | 'pre-delete';
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed';

// ── Backup Record ───────────────────────────────────────────

export interface IBackupRecord {
  _id: string;
  tenantSlug: string;
  type: BackupType;
  status: BackupStatus;

  // Storage
  filePath: string | null; // S3/R2 key
  fileSize: number | null; // Bytes
  storageBucket: string; // Default: 'dento-backups'
  checksum: string | null; // SHA-256 for integrity

  // Timing
  startedAt: string | null;
  completedAt: string | null;

  // Error
  error: string | null; // Error message when status=failed

  // Retention
  retentionDays: number; // Default: 30
  expiresAt: string | null; // TTL: auto-deleted after retentionDays

  // Audit
  initiatedBy: string | null; // User ID who triggered the backup

  createdAt: string;
  updatedAt: string;
}

// ── API Types ───────────────────────────────────────────────

export interface CreateBackupInput {
  tenantSlug: string;
  type: BackupType;
}

export interface BackupListQuery {
  tenantSlug?: string;
  status?: BackupStatus;
  type?: BackupType;
  page?: number;
  limit?: number;
}

export interface BackupStats {
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  totalStorageBytes: number;
  latestBackup: IBackupRecord | null;
}

// ── Backup Frequency / Per-Tenant Config ────────────────────

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

export type BackupGroup =
  | 'clinical'
  | 'appointments'
  | 'imaging'
  | 'financial'
  | 'inventory'
  | 'lab'
  | 'medications'
  | 'hr'
  | 'communications'
  | 'automation'
  | 'settings';

export interface ITenantBackupConfig {
  _id: string;
  tenantSlug: string;
  backupEnabled: boolean;
  frequency: BackupFrequency;
  hour: number; // 0–23 UTC
  dayOfWeek: number | null; // 0=Sun..6=Sat (for weekly)
  dayOfMonth: number | null; // 1–28 (for monthly)
  retentionDays: number;
  excludeGroups: BackupGroup[];
  autoBackupOnMigration: boolean;
  autoBackupOnDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantBackupConfigInput {
  tenantSlug: string;
  backupEnabled?: boolean;
  frequency?: BackupFrequency;
  hour?: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  retentionDays?: number;
  excludeGroups?: BackupGroup[];
  autoBackupOnMigration?: boolean;
  autoBackupOnDelete?: boolean;
}

export interface UpdateTenantBackupConfigInput {
  backupEnabled?: boolean;
  frequency?: BackupFrequency;
  hour?: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  retentionDays?: number;
  excludeGroups?: BackupGroup[];
  autoBackupOnMigration?: boolean;
  autoBackupOnDelete?: boolean;
}

// ── Backup Group → Collection Mapping ───────────────────────

export const BACKUP_GROUP_COLLECTIONS: Record<BackupGroup, readonly string[]> = {
  clinical: [
    'patients',
    'dental_charts',
    'treatment_plans',
    'procedure_notes',
    'consent_templates',
    'consent_forms',
  ],
  appointments: [
    'appointments',
    'appointment_types',
    'doctor_schedules',
    'schedule_exceptions',
    'walk_in_queues',
    'shift_templates',
    'staff_schedules',
  ],
  imaging: [
    'xrays',
    'xray_types',
    'cbct_orders',
    'cbct_scan_regions',
    'scans',
    'imaging_requirements',
  ],
  financial: [
    'invoices',
    'payments',
    'installment_plans',
    'insurance_companies',
    'insurance_claims',
    'doctor_commissions',
    'commission_payouts',
    'reconciliations',
  ],
  inventory: [
    'inventory_categories',
    'inventory_items',
    'inventory_stocks',
    'inventory_movements',
    'stock_transfers',
    'stock_counts',
  ],
  lab: ['lab_orders', 'lab_order_types', 'dental_labs'],
  medications: ['medications', 'prescriptions'],
  hr: ['leave_types', 'leave_balances', 'leave_requests', 'attendances', 'doctors'],
  communications: [
    'chat_channels',
    'chat_messages',
    'notification_templates',
    'notifications',
    'notification_logs',
    'notification_preferences',
    'device_tokens',
    'alert_rules',
    'whatsapp_sessions',
  ],
  automation: [
    'workflow_rules',
    'workflow_executions',
    'recurring_rules',
    'skipped_occurrences',
    'saved_reports',
    'report_schedules',
    'report_history',
    'webhook_endpoints',
    'webhook_deliveries',
  ],
  settings: ['settings', 'services', 'custom_fields', 'role_permissions', 'branches'],
} as const;

export const BACKUP_GROUPS: BackupGroup[] = [
  'clinical',
  'appointments',
  'imaging',
  'financial',
  'inventory',
  'lab',
  'medications',
  'hr',
  'communications',
  'automation',
  'settings',
];

// ── Constants ───────────────────────────────────────────────

export const DEFAULT_RETENTION_DAYS = 30;
export const DEFAULT_STORAGE_BUCKET = 'dento-backups';
export const BACKUP_TYPES: BackupType[] = ['scheduled', 'manual', 'pre-migration', 'pre-delete'];
export const BACKUP_STATUSES: BackupStatus[] = ['pending', 'running', 'completed', 'failed'];
