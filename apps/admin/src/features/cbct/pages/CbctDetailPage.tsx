/**
 * CBCT Detail Page — View order, status workflow, scan entry, report entry,
 * download, and inline DICOM viewer with MPR (Axial/Coronal/Sagittal).
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useCbctDetail,
  useUpdateCbctOrder,
  useUpdateCbctStatus,
  useUpdateCbctScan,
  useUpdateCbctReport,
  useDeleteCbctOrder,
  type CbctOrder,
} from '../hooks/useCbct.js';
import { FileUploader } from '@/features/uploads/components/FileUploader.js';
import type { UploadResult } from '@/features/uploads/hooks/useUpload.js';
import { useGetDownloadUrl } from '@/features/uploads/hooks/useResolvedUrl.js';
import { formatDate } from '@/lib/date.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  toast,
  Separator,
} from '@dento/ui';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Download,
  Link2,
  Calendar,
  CheckCircle,
  FileText,
  XCircle,
  Loader2,
  ScanLine,
  ClipboardList,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';
import { CbctViewer } from '../components/CbctViewer.js';

// ── Helpers ─────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'outline',
  scheduled: 'secondary',
  completed: 'default',
  reported: 'default',
  cancelled: 'destructive',
};

const PRIORITY_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  normal: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

const PURPOSES: Record<string, string> = {
  implant_planning: 'Implant Planning',
  endo_evaluation: 'Endodontic Evaluation',
  ortho_assessment: 'Orthodontic Assessment',
  tmj_evaluation: 'TMJ Evaluation',
  pathology: 'Pathology',
  trauma: 'Trauma',
  surgical_planning: 'Surgical Planning',
  other: 'Other',
};

// ── Status Timeline ─────────────────────────────────────────

const STATUS_STEPS = ['requested', 'scheduled', 'completed', 'reported'] as const;

function StatusTimeline({ current }: { current: string }) {
  const isCancelled = current === 'cancelled';
  const currentIdx = STATUS_STEPS.indexOf(current as (typeof STATUS_STEPS)[number]);

  return (
    <div className="flex items-center gap-2">
      {STATUS_STEPS.map((step, i) => {
        const isActive = !isCancelled && i <= currentIdx;
        const isCurrent = step === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                isActive
                  ? isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs capitalize ${isActive ? 'font-medium' : 'text-muted-foreground'}`}
            >
              {step}
            </span>
            {i < STATUS_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-6 ${
                  !isCancelled && i < currentIdx ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <Badge variant="destructive" className="ms-2">
          <XCircle className="me-1 h-3 w-3" />
          Cancelled
        </Badge>
      )}
    </div>
  );
}

// ── Edit Order Dialog ───────────────────────────────────────

function EditOrderDialog({
  order,
  open,
  onClose,
}: {
  order: CbctOrder;
  open: boolean;
  onClose: () => void;
}) {
  const updateMutation = useUpdateCbctOrder(order._id);
  const { t } = useTranslation();

  const [indication, setIndication] = useState(order.indication || '');
  const [clinicalNotes, setClinicalNotes] = useState(order.clinicalNotes || '');
  const [clinicalPurpose, setClinicalPurpose] = useState(order.clinicalPurpose || '');
  const [priority, setPriority] = useState<'urgent' | 'routine' | 'stat' | 'asap'>(
    order.priority || 'routine',
  );
  const [scheduledDate, setScheduledDate] = useState(order.scheduledDate?.split('T')[0] || '');
  const [scheduledTime, setScheduledTime] = useState(order.scheduledTime || '');

  const handleSubmit = useCallback(async () => {
    try {
      await updateMutation.mutateAsync({
        indication: indication || undefined,
        clinicalNotes: clinicalNotes || undefined,
        clinicalPurpose: clinicalPurpose || undefined,
        priority,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
      });
      toast.success(t('cbct.toast.updated'));
      onClose();
    } catch {
      toast.error(t('cbct.toast.updateFailed'));
    }
  }, [
    indication,
    clinicalNotes,
    clinicalPurpose,
    priority,
    scheduledDate,
    scheduledTime,
    updateMutation,
    onClose,
  ]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('cbct.detail.edit.title')}</DialogTitle>
          <DialogDescription>{t('cbct.detail.edit.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select
                value={clinicalPurpose || '_none'}
                onValueChange={(v) => setClinicalPurpose(v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {Object.entries(PURPOSES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Indication</Label>
            <Textarea value={indication} onChange={(e) => setIndication(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Clinical Notes</Label>
            <Textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Scheduled Time</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Scan Entry Section ──────────────────────────────────────

function ScanEntrySection({ order }: { order: CbctOrder }) {
  const scanMutation = useUpdateCbctScan(order._id);
  const getDownloadUrl = useGetDownloadUrl();
  const { t } = useTranslation();
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [displayName, setDisplayName] = useState(order.scan?.displayName || '');
  const [notes, setNotes] = useState(order.scan?.notes || '');
  const [scannerModel, setScannerModel] = useState(order.scan?.scannerModel || '');
  const [scannedAt, setScannedAt] = useState('');
  const [open, setOpen] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      await scanMutation.mutateAsync({
        dicomUrl: uploadResult?.key || order.scan?.dicomUrl,
        displayName: displayName || undefined,
        fileName: uploadResult?.fileName || order.scan?.fileName,
        fileSize: uploadResult?.fileSize || order.scan?.fileSize,
        scannerModel: scannerModel || undefined,
        notes: notes || undefined,
        scanDate: scannedAt || undefined,
      });
      toast.success(t('cbct.toast.updated'));
      setOpen(false);
    } catch {
      toast.error(t('cbct.toast.updateFailed'));
    }
  }, [uploadResult, order.scan, displayName, scannerModel, notes, scannedAt, scanMutation]);

  const hasScan = !!order.scan?.dicomUrl;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanLine className="h-4 w-4" />
          {t('cbct.detail.section.scanData')}
        </CardTitle>
        {(order.status === 'completed' || order.status === 'scheduled') && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {hasScan ? t('cbct.detail.scan.updateBtn') : t('cbct.detail.scan.addBtn')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {hasScan ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cbct.detail.scan.file')}</span>
              <span className="font-medium">
                {order.scan?.displayName || order.scan?.fileName || 'DICOM file'}
              </span>
            </div>
            {order.scan?.scannerModel && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('cbct.detail.scan.scanner')}</span>
                <span>{order.scan.scannerModel}</span>
              </div>
            )}
            {order.scan?.scanDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('cbct.detail.scan.scannedAt')}</span>
                <span>{formatDate(order.scan.scanDate)}</span>
              </div>
            )}
            {order.scan?.notes && (
              <>
                <Separator />
                <p className="text-sm">{order.scan.notes}</p>
              </>
            )}
            {order.scan?.dicomUrl && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={async () => {
                  const url = await getDownloadUrl(order.scan!.dicomUrl!);
                  window.open(url, '_blank');
                }}
              >
                <Download className="me-2 h-4 w-4" />
                {t('cbct.detail.scan.downloadDicom')}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('cbct.detail.scan.empty')}</p>
        )}
      </CardContent>

      {/* Scan Upload Dialog */}
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('cbct.detail.scan.uploadTitle')}</DialogTitle>
            <DialogDescription>
              Upload the DICOM file or ZIP archive from the CBCT scanner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Scan Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Full Arch CBCT - Upper Jaw"
              />
            </div>
            <FileUploader
              category="cbct"
              accept={{ 'application/dicom': ['.dcm'], 'application/zip': ['.zip'] }}
              onUploadComplete={setUploadResult}
              onError={(err) => toast.error(err)}
              placeholder="Drag & drop DICOM file here (max 150MB)"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Scanner Model</Label>
                <Input
                  value={scannerModel}
                  onChange={(e) => setScannerModel(e.target.value)}
                  placeholder="e.g. Planmeca ProMax 3D"
                />
              </div>
              <div className="space-y-2">
                <Label>Scanned Date</Label>
                <Input
                  type="datetime-local"
                  value={scannedAt}
                  onChange={(e) => setScannedAt(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={scanMutation.isPending}>
              {scanMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Save Scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Report Entry Section ────────────────────────────────────

function ReportEntrySection({ order }: { order: CbctOrder }) {
  const reportMutation = useUpdateCbctReport(order._id);
  const { t } = useTranslation();
  const [reportUpload, setReportUpload] = useState<UploadResult | null>(null);
  const [findings, setFindings] = useState(order.report?.findings || '');
  const [impression, setImpression] = useState(order.report?.impression || '');
  const [recommendations, setRecommendations] = useState(order.report?.recommendations || '');
  const [reportStatus, setReportStatus] = useState<'draft' | 'final' | 'pending'>(
    order.report?.status || 'draft',
  );
  const [radiologist, setRadiologist] = useState(order.report?.radiologist || '');
  const [open, setOpen] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      await reportMutation.mutateAsync({
        findings: findings || undefined,
        impression: impression || undefined,
        recommendations: recommendations || undefined,
        status: reportStatus,
        radiologist: radiologist || undefined,
        reportUrl: reportUpload?.url || order.report?.reportUrl,
      });
      toast.success(t('cbct.toast.updated'));
      setOpen(false);
    } catch {
      toast.error(t('cbct.toast.updateFailed'));
    }
  }, [
    findings,
    impression,
    recommendations,
    reportStatus,
    radiologist,
    reportUpload,
    order.report,
    reportMutation,
  ]);

  const hasReport = !!order.report?.findings;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" />
          {t('cbct.detail.section.report')}
        </CardTitle>
        {(order.status === 'completed' || order.status === 'reported') && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {hasReport ? t('cbct.detail.report.editBtn') : t('cbct.detail.report.addBtn')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {hasReport ? (
          <div className="space-y-3">
            {order.report?.radiologist && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('cbct.detail.report.radiologist')}</span>
                <span>{order.report.radiologist}</span>
              </div>
            )}
            <Badge variant={order.report?.status === 'final' ? 'default' : 'secondary'}>
              {order.report?.status || 'draft'}
            </Badge>
            <Separator />
            {order.report?.findings && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t('cbct.detail.report.findings')}
                </p>
                <p className="text-sm whitespace-pre-wrap">{order.report.findings}</p>
              </div>
            )}
            {order.report?.impression && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t('cbct.detail.report.impression')}
                </p>
                <p className="text-sm whitespace-pre-wrap">{order.report.impression}</p>
              </div>
            )}
            {order.report?.recommendations && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t('cbct.detail.report.recommendations')}
                </p>
                <p className="text-sm whitespace-pre-wrap">{order.report.recommendations}</p>
              </div>
            )}
            {order.report?.reportUrl && (
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href={order.report.reportUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="me-2 h-4 w-4" />
                  {t('cbct.detail.report.viewPdf')}
                </a>
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('cbct.detail.report.empty')}</p>
        )}
      </CardContent>

      {/* Report Entry Dialog */}
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('cbct.detail.report.dialogTitle')}</DialogTitle>
            <DialogDescription>
              Enter the radiologist's findings and recommendations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('cbct.detail.report.radiologist')}</Label>
                <Input
                  value={radiologist}
                  onChange={(e) => setRadiologist(e.target.value)}
                  placeholder="Dr. name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('cbct.detail.report.status')}</Label>
                <Select
                  value={reportStatus}
                  onValueChange={(v) => setReportStatus(v as typeof reportStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('cbct.detail.report.statusDraft')}</SelectItem>
                    <SelectItem value="final">{t('cbct.detail.report.statusFinal')}</SelectItem>
                    <SelectItem value="pending">{t('cbct.detail.report.statusPending')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('cbct.detail.report.findings')}</Label>
              <Textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Describe the radiological findings..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('cbct.detail.report.impression')}</Label>
              <Textarea
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                placeholder="Summary impression..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('cbct.detail.report.recommendations')}</Label>
              <Textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Recommend next steps..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Report PDF (optional)</Label>
              <FileUploader
                category="document"
                accept={{ 'application/pdf': ['.pdf'] }}
                onUploadComplete={setReportUpload}
                onError={(err) => toast.error(err)}
                placeholder="Drop report PDF here"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={reportMutation.isPending}>
              {reportMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Detail Row ──────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function CbctDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, isError } = useCbctDetail(id ?? '');
  const statusMutation = useUpdateCbctStatus();
  const deleteMutation = useDeleteCbctOrder();
  const { t } = useTranslation();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  const fmtDate = (d?: string) => (d ? formatDate(d) : '—');

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!order) return;
      try {
        await statusMutation.mutateAsync({ id: order._id, status: newStatus });
        toast.success(t('cbct.toast.statusUpdated'));
      } catch {
        toast.error(t('cbct.toast.updateFailed'));
      }
    },
    [order, statusMutation],
  );

  const handleDelete = useCallback(async () => {
    if (!order) return;
    try {
      await deleteMutation.mutateAsync(order._id);
      toast.success(t('cbct.toast.deleted'));
      navigate('/cbct');
    } catch {
      toast.error(t('cbct.toast.deleteFailed'));
    }
  }, [order, deleteMutation, navigate]);

  const handleCancel = useCallback(async () => {
    if (!order) return;
    try {
      await statusMutation.mutateAsync({ id: order._id, status: 'cancelled' });
      toast.success(t('cbct.toast.cancelled'));
      setCancelOpen(false);
    } catch {
      toast.error(t('cbct.toast.updateFailed'));
    }
  }, [order, statusMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="p-6">
        <PageHeader title={t('cbct.detail.notFound')}>
          <Button variant="outline" onClick={() => navigate('/cbct')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('cbct.detail.backBtn')}
          </Button>
        </PageHeader>
      </div>
    );
  }

  const canEdit = order.status === 'requested' || order.status === 'scheduled';
  const canDelete = order.status === 'requested';
  const canCancel = order.status === 'requested' || order.status === 'scheduled';
  const linked = !!order.treatmentPlanId || !!order.procedureNoteId;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`CBCT Order #${order.orderNumber}`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/cbct')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('cbct.detail.backBtn')}
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('cbct.detail.editBtn')}
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="me-2 h-4 w-4" />
              {t('cbct.detail.deleteBtn')}
            </Button>
          )}
          {order.scan?.dicomUrl && (
            <Button
              variant={showViewer ? 'secondary' : 'outline'}
              onClick={() => setShowViewer(!showViewer)}
            >
              {showViewer ? <EyeOff className="me-2 h-4 w-4" /> : <Eye className="me-2 h-4 w-4" />}
              {showViewer ? t('cbct.viewer.hide') : t('cbct.viewer.show')}
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Status Timeline */}
      <Card>
        <CardContent className="pt-6">
          <StatusTimeline current={order.status} />

          {/* Status Action Buttons */}
          <div className="mt-4 flex items-center gap-2">
            {order.status === 'requested' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('scheduled')}
                disabled={statusMutation.isPending}
              >
                <Calendar className="me-2 h-4 w-4" />
                {t('cbct.detail.markScheduled')}
              </Button>
            )}
            {order.status === 'scheduled' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('completed')}
                disabled={statusMutation.isPending}
              >
                <CheckCircle className="me-2 h-4 w-4" />
                {t('cbct.detail.markCompleted')}
              </Button>
            )}
            {order.status === 'completed' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('reported')}
                disabled={statusMutation.isPending}
              >
                <FileText className="me-2 h-4 w-4" />
                {t('cbct.detail.markReported')}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelOpen(true)}
                className="text-destructive"
              >
                <XCircle className="me-2 h-4 w-4" />
                {t('cbct.detail.cancelOrder')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CBCT DICOM Viewer */}
      {showViewer && order.scan?.dicomUrl && <CbctViewer fileKey={order.scan.dicomUrl} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Scan + Report */}
        <div className="space-y-6 lg:col-span-2">
          <ScanEntrySection order={order} />
          <ReportEntrySection order={order} />
        </div>

        {/* Right column: Details sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('cbct.detail.section.orderDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <DetailRow label={t('cbct.detail.status')}>
                <Badge variant={STATUS_COLORS[order.status] ?? 'outline'} className="capitalize">
                  {order.status}
                </Badge>
              </DetailRow>
              <DetailRow label={t('cbct.detail.priority')}>
                <Badge
                  variant={PRIORITY_COLORS[order.priority] ?? 'outline'}
                  className="capitalize"
                >
                  {order.priority}
                </Badge>
              </DetailRow>
              <DetailRow label={t('cbct.detail.purpose')}>
                {PURPOSES[order.clinicalPurpose ?? ''] || order.clinicalPurpose || '—'}
              </DetailRow>
              {order.scheduledDate && (
                <DetailRow label={t('cbct.detail.scheduled')}>
                  {fmtDate(order.scheduledDate)}
                </DetailRow>
              )}
              <DetailRow label={t('cbct.detail.created')}>{fmtDate(order.createdAt)}</DetailRow>
            </CardContent>
          </Card>

          {/* Indication & Notes */}
          {(order.indication || order.clinicalNotes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('cbct.detail.section.clinicalInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.indication && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {t('cbct.detail.indication')}
                    </p>
                    <p className="text-sm">{order.indication}</p>
                  </div>
                )}
                {order.indication && order.clinicalNotes && <Separator />}
                {order.clinicalNotes && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {t('cbct.detail.clinicalNotes')}
                    </p>
                    <p className="text-sm">{order.clinicalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cross-Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('cbct.detail.section.crossLinks')}</CardTitle>
            </CardHeader>
            <CardContent>
              {linked ? (
                <div className="space-y-2">
                  {order.treatmentPlanId && (
                    <Badge variant="default" className="w-full justify-start">
                      <Link2 className="me-1.5 h-3 w-3" />
                      Treatment Plan
                    </Badge>
                  )}
                  {order.procedureNoteId && (
                    <Badge variant="default" className="w-full justify-start">
                      <Link2 className="me-1.5 h-3 w-3" />
                      Procedure Note
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not linked to any treatment plan or procedure note.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      {editOpen && (
        <EditOrderDialog order={order} open={editOpen} onClose={() => setEditOpen(false)} />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => !o && setDeleteOpen(false)}
        title={t('cbct.confirm.deleteTitle')}
        description={`Order #${order.orderNumber} will be permanently deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(o) => !o && setCancelOpen(false)}
        title={t('cbct.confirm.cancelTitle')}
        description={`Order #${order.orderNumber} will be marked as cancelled.`}
        confirmLabel="Cancel Order"
        variant="destructive"
        onConfirm={handleCancel}
      />
    </div>
  );
}
