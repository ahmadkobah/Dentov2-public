import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Support Ticket Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §9 — Dev Portal Ticketing System
 *
 * Stores support tickets with messages, attachments, SLA tracking,
 * category/priority/status workflow, and linked support sessions.
 */

// ── Types ───────────────────────────────────────────────────

export interface ITicketAttachment {
  filename: string;
  url: string;
  size: number;
}

export interface ITicketMessage {
  sender: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  message: string;
  attachments: ITicketAttachment[];
  isInternal: boolean;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  ticketNumber: string;
  tenantId: string;
  createdBy: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  assignedTo: {
    userId: string;
    name: string;
  } | null;

  category: 'bug' | 'feature' | 'billing' | 'access' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'waiting_internal' | 'resolved' | 'closed';

  subject: string;
  description: string;
  attachments: ITicketAttachment[];

  messages: ITicketMessage[];

  linkedSessions: string[];
  linkedModule: string | null;

  sla: {
    responseDeadline: Date | null;
    resolutionDeadline: Date | null;
  };
  firstResponseAt: Date | null;
  resolvedAt: Date | null;

  tags: string[];
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-Schemas ─────────────────────────────────────────────

const attachmentSchema = new Schema<ITicketAttachment>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const senderSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema<ITicketMessage>(
  {
    sender: { type: senderSchema, required: true },
    message: { type: String, required: true },
    attachments: { type: [attachmentSchema], default: [] },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const assigneeSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

// ── Support Ticket Schema ───────────────────────────────────

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: senderSchema,
      required: true,
    },
    assignedTo: {
      type: assigneeSchema,
      default: null,
    },

    // ── Categorization ──────────────────────────────────
    category: {
      type: String,
      enum: ['bug', 'feature', 'billing', 'access', 'other'],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: true,
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_customer', 'waiting_internal', 'resolved', 'closed'],
      required: true,
      default: 'open',
      index: true,
    },

    // ── Content ─────────────────────────────────────────
    subject: {
      type: String,
      required: true,
      maxlength: 500,
    },
    description: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    // ── Messages (conversation thread) ──────────────────
    messages: {
      type: [messageSchema],
      default: [],
    },

    // ── Links ───────────────────────────────────────────
    linkedSessions: {
      type: [String],
      default: [],
    },
    linkedModule: {
      type: String,
      default: null,
    },

    // ── SLA ─────────────────────────────────────────────
    sla: {
      responseDeadline: { type: Date, default: null },
      resolutionDeadline: { type: Date, default: null },
    },
    firstResponseAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },

    // ── Tags ────────────────────────────────────────────
    tags: {
      type: [String],
      default: [],
    },

    // ── Standard Fields ─────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'support_tickets',
  },
);

// ── Indexes ─────────────────────────────────────────────────
supportTicketSchema.index({ tenantId: 1, status: 1 });
supportTicketSchema.index({ 'assignedTo.userId': 1, status: 1 });
supportTicketSchema.index({ priority: 1, status: 1 });
supportTicketSchema.index({ createdAt: -1 });

// ── Model ───────────────────────────────────────────────────
export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);
