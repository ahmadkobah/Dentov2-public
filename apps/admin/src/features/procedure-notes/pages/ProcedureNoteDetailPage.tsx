/**
 * Procedure Note Detail Page — read-only view of a procedure note.
 * Shows procedure info, teeth involved, entries, materials, etc.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProcedureNoteDetail } from '../hooks/useProcedureNotes.js';
import { useAppointmentDetail } from '@/features/appointments/hooks/useAppointments.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { formatCurrency, useTenantCurrency } from '@/lib/currency.js';
import { PageHeader, Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@dento/ui';
import { ArrowLeft, Pencil, CalendarPlus } from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

// ── Entry Color Palette ─────────────────────────────────────

const ENTRY_COLORS = [
  { fill: '#3b82f6', bg: 'bg-blue-500', text: 'text-white' },
  { fill: '#10b981', bg: 'bg-emerald-500', text: 'text-white' },
  { fill: '#f59e0b', bg: 'bg-amber-500', text: 'text-white' },
  { fill: '#ef4444', bg: 'bg-red-500', text: 'text-white' },
  { fill: '#8b5cf6', bg: 'bg-violet-500', text: 'text-white' },
  { fill: '#ec4899', bg: 'bg-pink-500', text: 'text-white' },
  { fill: '#06b6d4', bg: 'bg-cyan-500', text: 'text-white' },
  { fill: '#f97316', bg: 'bg-orange-500', text: 'text-white' },
];

// ── Component ───────────────────────────────────────────────

export default function ProcedureNoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currency = useTenantCurrency();
  const { t } = useTranslation();

  const { data: note, isLoading, isError, error } = useProcedureNoteDetail(id);

  // Pull the linked appointment (if any) so we can prefill branch/chair on follow-up.
  const linkedApptId =
    typeof (note as { appointmentId?: unknown })?.appointmentId === 'string'
      ? ((note as { appointmentId?: string }).appointmentId as string)
      : '';
  const { data: linkedApt } = useAppointmentDetail(linkedApptId);

  // Parse teethDetails.entries if available
  const entries = useMemo(() => {
    if (!note?.teethDetails) return [];
    const td = note.teethDetails as {
      entries?: Array<{
        teeth: string[];
        serviceId?: string;
        serviceName?: string;
        materials?: string[];
        anesthesiaUsed?: boolean;
        procedurePerformed?: string;
        unitPrice?: number;
      }>;
    };
    return td.entries ?? [];
  }, [note]);

  // ── Loading / Error ────────────────────────────────────

  if (isLoading) return <TableSkeleton />;
  if (isError || !note)
    return <ErrorState message={(error as Error)?.message ?? 'Failed to load procedure note'} />;

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={note.procedureName || t('procedureNotes.detail.procedureNote')}
        description={`${t('procedureNotes.detail.created')} ${formatDate(note.createdAt)}`}
        backAction={
          <Button variant="ghost" size="sm" onClick={() => navigate('/procedure-notes')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('procedureNotes.back')}
          </Button>
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/procedure-notes/${note._id}/edit`)}
        >
          <Pencil className="me-2 h-4 w-4" />
          {t('procedureNotes.detail.edit')}
        </Button>
        {/* Phase 5.4 — Book Follow-up: navigate to appointments with prefill */}
        {note.followUpRequired && (
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams();
              params.set('patientId', note.patientId);
              if (note.doctorId) params.set('doctorId', note.doctorId);
              if (note.followUpDate) params.set('date', note.followUpDate.slice(0, 10));
              // Prefill branch + chair from the originating appointment when available
              const apt = linkedApt as { branchId?: string; chairNumber?: number } | undefined;
              if (apt?.branchId) params.set('branchId', apt.branchId);
              if (apt?.chairNumber) params.set('chairNumber', String(apt.chairNumber));
              params.set('source', 'admin');
              params.set('notes', `Follow-up for procedure: ${note.procedureName}`);
              navigate(`/appointments?${params.toString()}`);
            }}
          >
            <CalendarPlus className="me-2 h-4 w-4" />
            Book Follow-up
          </Button>
        )}
      </PageHeader>

      {/* ── Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* General Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('procedureNotes.detail.generalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('procedureNotes.detail.procedure')}</span>
              <span className="font-medium">{note.procedureName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('procedureNotes.detail.created')}</span>
              <span>{formatDate(note.createdAt)}</span>
            </div>
            {note.updatedAt !== note.createdAt && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('procedureNotes.detail.updated')}</span>
                <span>{formatDate(note.updatedAt)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('procedureNotes.detail.followUp')}</span>
              <Badge variant={note.followUpRequired ? 'default' : 'secondary'}>
                {note.followUpRequired
                  ? t('procedureNotes.badge.yes')
                  : t('procedureNotes.badge.no')}
              </Badge>
            </div>
            {note.followUpRequired && note.followUpDate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t('procedureNotes.detail.followUpDate')}
                </span>
                <span>{formatDate(note.followUpDate)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teeth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('procedureNotes.detail.teethInvolved')}</CardTitle>
          </CardHeader>
          <CardContent>
            {note.teethInvolved ? (
              <div className="flex flex-wrap gap-1">
                {note.teethInvolved.split(',').map((t) => (
                  <Badge key={t.trim()} variant="outline">
                    #{t.trim()}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('procedureNotes.detail.noTeeth')}</p>
            )}
          </CardContent>
        </Card>

        {/* Materials & Anesthesia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t('procedureNotes.detail.materialsAnesthesia')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">
                {t('procedureNotes.detail.materials')}:{' '}
              </span>
              <span>{note.materialsUsed || '\u2014'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t('procedureNotes.detail.anesthesia')}:{' '}
              </span>
              <span>{note.anesthesiaUsed || '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Procedure Entries ── */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t('procedureNotes.detail.procedureEntries', { count: entries.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.map((entry, idx) => {
              const color = ENTRY_COLORS[idx % ENTRY_COLORS.length];
              return (
                <div
                  key={idx}
                  className="border rounded-lg p-3 space-y-2"
                  style={{ borderLeftWidth: '4px', borderLeftColor: color.fill }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${color.bg} ${color.text}`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-medium text-sm">
                      {entry.serviceName || t('procedureNotes.entry.unnamedProcedure')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {t('procedureNotes.detail.teethInvolved')}:{' '}
                      </span>
                      {entry.teeth.map((tooth) => `#${tooth}`).join(', ')}
                    </div>
                    {entry.materials && entry.materials.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">
                          {t('procedureNotes.detail.materials')}:{' '}
                        </span>
                        {entry.materials.join(', ')}
                      </div>
                    )}
                    {entry.anesthesiaUsed && (
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {t('procedureNotes.entry.anesthesiaUsed')}
                        </Badge>
                      </div>
                    )}
                    {entry.unitPrice != null && entry.unitPrice > 0 && (
                      <div>
                        <span className="text-muted-foreground">
                          {t('procedureNotes.entry.cost')}:{' '}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(entry.unitPrice * entry.teeth.length, currency)}
                        </span>
                        <span className="text-xs text-muted-foreground ms-1">
                          ({formatCurrency(entry.unitPrice, currency)} × {entry.teeth.length})
                        </span>
                      </div>
                    )}
                  </div>
                  {entry.procedurePerformed && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {t('procedureNotes.entry.details')}:{' '}
                      </span>
                      {entry.procedurePerformed}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Procedure Details ── */}
      {note.procedurePerformed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('procedureNotes.detail.procedureDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{note.procedurePerformed}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Complications & Post-Op ── */}
      {(note.complications || note.postOpInstructions) && (
        <Card>
          <CardContent className="pt-4 space-y-3 text-sm">
            {note.complications && (
              <div>
                <span className="font-medium">{t('procedureNotes.detail.complications')}: </span>
                {note.complications}
              </div>
            )}
            {note.postOpInstructions && (
              <div>
                <span className="font-medium">
                  {t('procedureNotes.detail.postOpInstructions')}:{' '}
                </span>
                {note.postOpInstructions}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Notes ── */}
      {note.notes && (
        <Card>
          <CardContent className="pt-4 text-sm">
            <span className="font-medium">{t('procedureNotes.detail.notes')}: </span>
            {note.notes}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
