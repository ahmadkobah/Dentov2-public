/**
 * Email Templates — reusable HTML generators for transactional emails.
 *
 * All templates use inline CSS for maximum email client compatibility.
 */

export interface PasswordResetEmailOptions {
  resetLink: string;
  userName: string;
  expiresInMinutes: number;
}

export function passwordResetEmailHtml(options: PasswordResetEmailOptions): string {
  const { resetLink, userName, expiresInMinutes } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#465fff;padding:32px 40px;text-align:center;">
              <span style="font-size:28px;">🦷</span>
              <h1 style="color:#ffffff;font-size:22px;margin:8px 0 0;font-weight:600;">Dento</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1f2937;font-size:20px;margin:0 0 16px;font-weight:600;">
                Reset Your Password
              </h2>
              <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Hi ${userName},
              </p>
              <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetLink}" target="_blank" style="display:inline-block;background-color:#465fff;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 16px;">
                This link will expire in <strong>${expiresInMinutes} minutes</strong>. If you didn't request this, you can safely ignore this email — your password won't change.
              </p>
              <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;border-top:1px solid #e5e7eb;padding-top:16px;">
                If the button above doesn't work, copy and paste this URL into your browser:<br />
                <a href="${resetLink}" style="color:#465fff;word-break:break-all;font-size:12px;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                &copy; ${new Date().getFullYear()} Dento. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Support Ticket: New Ticket Created ──────────────────────

export interface TicketCreatedEmailOptions {
  ticketNumber: string;
  subject: string;
  priority: string;
  assigneeName: string;
  tenantId: string;
}

export function ticketCreatedEmailHtml(options: TicketCreatedEmailOptions): string {
  const { ticketNumber, subject, priority, assigneeName, tenantId } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>New Support Ticket</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#465fff;padding:24px 40px;text-align:center;">
          <span style="font-size:28px;">🦷</span>
          <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:600;">Dento Support</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="color:#1f2937;font-size:18px;margin:0 0 16px;">New Ticket Assigned to You</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Ticket:</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:#1f2937;">${ticketNumber}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Subject:</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:#1f2937;">${subject}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Priority:</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:${priority === 'urgent' ? '#dc2626' : priority === 'high' ? '#ea580c' : '#1f2937'};">${priority.toUpperCase()}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Tenant:</td><td style="padding:6px 0;font-size:14px;color:#1f2937;">${tenantId}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Assigned To:</td><td style="padding:6px 0;font-size:14px;color:#1f2937;">${assigneeName}</td></tr>
          </table>
          <p style="color:#4b5563;font-size:14px;line-height:1.6;">Please review and respond within the SLA window.</p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:16px 40px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Dento. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Support Ticket: New Reply ───────────────────────────────

export interface TicketReplyEmailOptions {
  ticketNumber: string;
  subject: string;
  senderName: string;
  messagePreview: string;
  isInternal: boolean;
}

export function ticketReplyEmailHtml(options: TicketReplyEmailOptions): string {
  const { ticketNumber, subject, senderName, messagePreview, isInternal } = options;
  const preview = messagePreview.length > 200 ? messagePreview.slice(0, 200) + '…' : messagePreview;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>New Reply on ${ticketNumber}</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#465fff;padding:24px 40px;text-align:center;">
          <span style="font-size:28px;">🦷</span>
          <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:600;">Dento Support</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="color:#1f2937;font-size:18px;margin:0 0 12px;">New Reply on ${ticketNumber}</h2>
          <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">Re: ${subject}</p>
          ${isInternal ? '<p style="display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;padding:2px 8px;border-radius:4px;margin:0 0 12px;">Internal Note</p>' : ''}
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:0 0 16px;">
            <p style="color:#4b5563;font-size:14px;margin:0 0 4px;font-weight:600;">${senderName}</p>
            <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${preview}</p>
          </div>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:16px 40px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Dento. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Email Verification ──────────────────────────────────────

export interface EmailVerificationOptions {
  verifyLink: string;
  userName: string;
  expiresInHours: number;
}

export function emailVerificationHtml(options: EmailVerificationOptions): string {
  const { verifyLink, userName, expiresInHours } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Verify Your Email</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#465fff;padding:32px 40px;text-align:center;">
          <span style="font-size:28px;">🦷</span>
          <h1 style="color:#ffffff;font-size:22px;margin:8px 0 0;font-weight:600;">Dento</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1f2937;font-size:20px;margin:0 0 16px;font-weight:600;">Verify Your Email</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${userName},</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Your account on the Dento Developer Portal has been created. Please verify your email address by clicking the button below.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 32px;">
              <a href="${verifyLink}" target="_blank" style="display:inline-block;background-color:#465fff;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                Verify Email
              </a>
            </td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 16px;">
            This link will expire in <strong>${expiresInHours} hours</strong>. If you didn't expect this, please contact your administrator.
          </p>
          <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;border-top:1px solid #e5e7eb;padding-top:16px;">
            If the button above doesn't work, copy and paste this URL into your browser:<br />
            <a href="${verifyLink}" style="color:#465fff;word-break:break-all;font-size:12px;">${verifyLink}</a>
          </p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:20px 40px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Dento. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Staff Invitation Email ──────────────────────────────────

export interface StaffInviteEmailOptions {
  inviteLink: string;
  userName: string;
  roleName: string;
  expiresInDays: number;
}

export function staffInviteEmailHtml(options: StaffInviteEmailOptions): string {
  const { inviteLink, userName, roleName, expiresInDays } = options;

  const ROLE_LABELS: Record<string, string> = {
    tenant_admin: 'Admin',
    dentist: 'Dentist',
    receptionist: 'Receptionist',
    assistant: 'Assistant',
    accountant: 'Accountant',
    lab_tech: 'Lab Technician',
    hygienist: 'Hygienist',
  };
  const roleDisplay = ROLE_LABELS[roleName] ?? roleName;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>You're Invited to Dento</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#465fff;padding:32px 40px;text-align:center;">
          <span style="font-size:28px;">🦷</span>
          <h1 style="color:#ffffff;font-size:22px;margin:8px 0 0;font-weight:600;">Dento</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1f2937;font-size:20px;margin:0 0 16px;font-weight:600;">You're Invited!</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${userName},</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 8px;">
            You've been invited to join the clinic as <strong>${roleDisplay}</strong>.
          </p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Click the button below to set your password and activate your account.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 32px;">
              <a href="${inviteLink}" target="_blank" style="display:inline-block;background-color:#465fff;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                Accept Invitation
              </a>
            </td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 16px;">
            This link will expire in <strong>${expiresInDays} days</strong>. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;border-top:1px solid #e5e7eb;padding-top:16px;">
            If the button above doesn't work, copy and paste this URL into your browser:<br />
            <a href="${inviteLink}" style="color:#465fff;word-break:break-all;font-size:12px;">${inviteLink}</a>
          </p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:20px 40px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Dento. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Invoice Email ───────────────────────────────────────────

export interface InvoiceEmailOptions {
  invoiceNumber: string;
  patientName: string;
  totalAmount: string;
  currency: string;
  dueDate?: string;
  clinicName: string;
  items: Array<{ description: string; quantity: number; total: string }>;
}

export function invoiceEmailHtml(options: InvoiceEmailOptions): string {
  const { invoiceNumber, patientName, totalAmount, currency, dueDate, clinicName, items } = options;

  const itemRows = items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;color:#4b5563;font-size:14px;border-bottom:1px solid #e5e7eb;">${item.description}</td><td style="padding:8px 0;text-align:center;color:#4b5563;font-size:14px;border-bottom:1px solid #e5e7eb;">${item.quantity}</td><td style="padding:8px 0;text-align:right;color:#1f2937;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb;">${item.total}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Invoice ${invoiceNumber}</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#465fff;padding:32px 40px;text-align:center;">
          <span style="font-size:28px;">🦷</span>
          <h1 style="color:#ffffff;font-size:22px;margin:8px 0 0;font-weight:600;">${clinicName}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1f2937;font-size:20px;margin:0 0 16px;font-weight:600;">Invoice ${invoiceNumber}</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 8px;">Dear ${patientName},</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">Please find your invoice details below.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <thead><tr style="border-bottom:2px solid #e5e7eb;">
              <th style="padding:8px 0;text-align:left;color:#6b7280;font-size:13px;font-weight:600;">Description</th>
              <th style="padding:8px 0;text-align:center;color:#6b7280;font-size:13px;font-weight:600;">Qty</th>
              <th style="padding:8px 0;text-align:right;color:#6b7280;font-size:13px;font-weight:600;">Total</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
            <tr>
              <td style="padding:4px 16px;color:#6b7280;font-size:14px;">Total Amount</td>
              <td style="padding:4px 16px;text-align:right;color:#1f2937;font-size:18px;font-weight:700;">${currency} ${totalAmount}</td>
            </tr>
            ${dueDate ? `<tr><td style="padding:4px 16px;color:#6b7280;font-size:14px;">Due Date</td><td style="padding:4px 16px;text-align:right;color:#1f2937;font-size:14px;font-weight:600;">${dueDate}</td></tr>` : ''}
          </table>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:16px 0 0;">If you have any questions about this invoice, please contact the clinic.</p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:20px 40px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} ${clinicName}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── SaaS Invoice Overdue ────────────────────────────────────

export interface SaasOverdueEmailOptions {
  tenantName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
}

export function saasOverdueEmailHtml(options: SaasOverdueEmailOptions): string {
  const { tenantName, invoiceNumber, amount, dueDate } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Invoice Overdue</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#dc2626;padding:24px 40px;text-align:center;">
          <span style="font-size:28px;">🦷</span>
          <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:600;">Dento — Payment Overdue</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="color:#1f2937;font-size:18px;margin:0 0 16px;">Invoice ${invoiceNumber} is overdue</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px;">Dear ${tenantName},</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Your invoice <strong>${invoiceNumber}</strong> for <strong>${amount}</strong> was due on <strong>${dueDate}</strong> and remains unpaid. Please settle this amount at your earliest convenience to avoid service interruptions.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:24px;">
            <tr><td style="padding:4px 16px;color:#991b1b;font-size:14px;">Amount Due</td><td style="padding:4px 16px;text-align:right;color:#991b1b;font-size:18px;font-weight:700;">${amount}</td></tr>
            <tr><td style="padding:4px 16px;color:#991b1b;font-size:14px;">Due Date</td><td style="padding:4px 16px;text-align:right;color:#991b1b;font-size:14px;font-weight:600;">${dueDate}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">If you have already made this payment, please disregard this notice.</p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:16px 40px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Dento. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── SaaS Dunning Reminder ───────────────────────────────────

export interface DunningEmailOptions {
  tenantName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  escalationLevel: 'reminder' | 'warning' | 'final_notice' | 'suspension';
  daysOverdue: number;
}

export function dunningEmailHtml(options: DunningEmailOptions): string {
  const { tenantName, invoiceNumber, amount, dueDate, escalationLevel, daysOverdue } = options;

  const levelConfig: Record<string, { color: string; heading: string; message: string }> = {
    reminder: {
      color: '#f59e0b',
      heading: 'Payment Reminder',
      message: `Your invoice ${invoiceNumber} for ${amount} was due on ${dueDate} (${daysOverdue} days ago). Please make your payment to keep your account in good standing.`,
    },
    warning: {
      color: '#ea580c',
      heading: 'Payment Warning',
      message: `Your invoice ${invoiceNumber} for ${amount} is now ${daysOverdue} days overdue. Please pay immediately to avoid service restrictions.`,
    },
    final_notice: {
      color: '#dc2626',
      heading: 'Final Payment Notice',
      message: `This is your final notice. Invoice ${invoiceNumber} for ${amount} is ${daysOverdue} days overdue. Your account will be suspended if payment is not received within 48 hours.`,
    },
    suspension: {
      color: '#7f1d1d',
      heading: 'Account Suspended',
      message: `Your account has been suspended due to non-payment of invoice ${invoiceNumber} for ${amount} (${daysOverdue} days overdue). Please contact billing to restore your account.`,
    },
  };

  const config = levelConfig[escalationLevel] ?? levelConfig.reminder;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${config.heading}</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:${config.color};padding:24px 40px;text-align:center;">
          <span style="font-size:28px;">🦷</span>
          <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:600;">Dento — ${config.heading}</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px;">Dear ${tenantName},</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">${config.message}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
            <tr><td style="padding:4px 16px;color:#6b7280;font-size:14px;">Invoice</td><td style="padding:4px 16px;text-align:right;font-weight:600;font-size:14px;color:#1f2937;">${invoiceNumber}</td></tr>
            <tr><td style="padding:4px 16px;color:#6b7280;font-size:14px;">Amount</td><td style="padding:4px 16px;text-align:right;font-weight:700;font-size:18px;color:#1f2937;">${amount}</td></tr>
            <tr><td style="padding:4px 16px;color:#6b7280;font-size:14px;">Due Date</td><td style="padding:4px 16px;text-align:right;font-size:14px;color:#1f2937;">${dueDate}</td></tr>
            <tr><td style="padding:4px 16px;color:#6b7280;font-size:14px;">Days Overdue</td><td style="padding:4px 16px;text-align:right;font-weight:600;font-size:14px;color:#dc2626;">${daysOverdue}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">If you have already made this payment, please disregard this notice.</p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:16px 40px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Dento. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
