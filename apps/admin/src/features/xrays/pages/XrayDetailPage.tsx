/**
 * X-Ray Detail Page — View X-ray image, metadata, cross-links.
 * In-app image display with zoom, edit dialog, delete.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/stores/locale.store.js';
import { useXrayDetail, useUpdateXray, useDeleteXray, type Xray } from '../hooks/useXrays.js';
import { formatDate } from '@/lib/date.js';
import { useResolvedUrl, useGetDownloadUrl } from '@/features/uploads/hooks/useResolvedUrl.js';
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
  ExternalLink,
  Link2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Loader2,
  PenTool,
  Hand,
  X,
  Save,
  MessageSquare,
} from 'lucide-react';

const XRAY_TYPES = [
  { value: 'periapical', label: 'xrays.types.periapical' },
  { value: 'bitewing', label: 'xrays.types.bitewing' },
  { value: 'panoramic', label: 'xrays.types.panoramic' },
  { value: 'occlusal', label: 'xrays.types.occlusal' },
  { value: 'cephalometric', label: 'xrays.types.cephalometric' },
  { value: 'other', label: 'xrays.types.other' },
] as const;

const PURPOSES = [
  { value: 'diagnostic', label: 'xrays.purposes.diagnostic' },
  { value: 'pre_treatment', label: 'xrays.purposes.preTreatment' },
  { value: 'post_treatment', label: 'xrays.purposes.postTreatment' },
  { value: 'follow_up', label: 'xrays.purposes.followUp' },
  { value: 'emergency', label: 'xrays.purposes.emergency' },
  { value: 'routine_screening', label: 'xrays.purposes.routineScreening' },
] as const;

const REGIONS = [
  { value: 'upper_left', label: 'xrays.regions.upperLeft' },
  { value: 'upper_right', label: 'xrays.regions.upperRight' },
  { value: 'lower_left', label: 'xrays.regions.lowerLeft' },
  { value: 'lower_right', label: 'xrays.regions.lowerRight' },
  { value: 'full_mouth', label: 'xrays.regions.fullMouth' },
  { value: 'anterior', label: 'xrays.regions.anterior' },
  { value: 'posterior', label: 'xrays.regions.posterior' },
] as const;

// ── Annotation Types ────────────────────────────────────────

interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  note: string;
  color?: string;
}

// ── Image Viewer with Annotation ────────────────────────────

function XrayViewer({
  imageUrl,
  title,
  xrayId,
  annotations: savedAnnotations,
}: {
  imageUrl: string;
  title: string;
  xrayId: string;
  annotations: Annotation[];
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Annotation state
  const [mode, setMode] = useState<'pan' | 'annotate'>('pan');
  const [annotations, setAnnotations] = useState<Annotation[]>(savedAnnotations);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const [pendingAnnotation, setPendingAnnotation] = useState<Annotation | null>(null);
  const [pendingNote, setPendingNote] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const updateMutation = useUpdateXray(xrayId);

  // Sync when saved annotations change from server
  useEffect(() => {
    setAnnotations(savedAnnotations);
  }, [savedAnnotations]);

  /** Convert screen coordinates to image-relative percentages */
  const screenToImagePercent = useCallback((clientX: number, clientY: number) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  // ─── Zoom / Pan ───
  const handleZoomIn = () => setScale((s) => Math.min(s * 1.3, 5));
  const handleZoomOut = () => setScale((s) => Math.max(s / 1.3, 0.2));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      return Math.min(Math.max(s * delta, 0.2), 5);
    });
  }, []);

  // Attach wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ─── Mouse handlers ───
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      if (mode === 'annotate') {
        // Start drawing a rectangle
        const pt = screenToImagePercent(e.clientX, e.clientY);
        setDrawing(true);
        setDrawStart(pt);
        setDrawCurrent(pt);
        return;
      }

      // Pan mode
      setDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    },
    [mode, position, screenToImagePercent],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (mode === 'annotate' && drawing) {
        const pt = screenToImagePercent(e.clientX, e.clientY);
        setDrawCurrent(pt);
        return;
      }

      if (dragging) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }
    },
    [mode, drawing, dragging, screenToImagePercent],
  );

  const handleMouseUp = useCallback(() => {
    if (mode === 'annotate' && drawing) {
      setDrawing(false);
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);

      // Minimum size threshold (1% of image)
      if (w > 1 && h > 1) {
        const newAnnotation: Annotation = {
          id: crypto.randomUUID(),
          x,
          y,
          width: w,
          height: h,
          note: '',
          color: '#ef4444',
        };
        setPendingAnnotation(newAnnotation);
        setPendingNote('');
      }
      return;
    }
    setDragging(false);
  }, [mode, drawing, drawStart, drawCurrent]);

  // ─── Annotation CRUD ───
  const confirmAnnotation = useCallback(() => {
    if (!pendingAnnotation) return;
    const withNote = { ...pendingAnnotation, note: pendingNote };
    setAnnotations((prev) => [...prev, withNote]);
    setPendingAnnotation(null);
    setPendingNote('');
    setHasUnsaved(true);
  }, [pendingAnnotation, pendingNote]);

  const cancelAnnotation = useCallback(() => {
    setPendingAnnotation(null);
    setPendingNote('');
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setSelectedAnnotation(null);
    setHasUnsaved(true);
  }, []);

  const saveAnnotations = useCallback(async () => {
    try {
      await updateMutation.mutateAsync({ annotations });
      setHasUnsaved(false);
      toast.success(t('xrays.viewerToast.annotationsSaved'));
    } catch {
      toast.error(t('xrays.viewerToast.annotationsFailed'));
    }
  }, [annotations, updateMutation]);

  const handleFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen?.();
  }, []);

  // Global mouseup
  useEffect(() => {
    const handleGlobalUp = () => {
      setDragging(false);
      setDrawing(false);
    };
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, []);

  // Drawing preview rect
  const previewRect = drawing
    ? {
        left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
        top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
        width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
        height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
      }
    : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{t('xrays.detail.imageTab')}</CardTitle>
        <div className="flex items-center gap-1">
          {/* Mode Toggle */}
          <Button
            variant={mode === 'pan' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setMode('pan')}
            title={t('xrays.viewer.panMode')}
          >
            <Hand className="h-4 w-4" />
          </Button>
          <Button
            variant={mode === 'annotate' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setMode('annotate')}
            title={t('xrays.viewer.annotateMode')}
          >
            <PenTool className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            title={t('xrays.viewer.zoomOut')}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-12 text-center text-xs text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            title={t('xrays.viewer.zoomIn')}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} title={t('xrays.viewer.reset')}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            title={t('xrays.viewer.fullscreen')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          {/* Save Annotations — always visible when there are annotations */}
          {annotations.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <Button
                size="sm"
                variant={hasUnsaved ? 'default' : 'outline'}
                onClick={saveAnnotations}
                disabled={!hasUnsaved || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="me-2 h-4 w-4" />
                )}
                {hasUnsaved ? t('xrays.viewer.save') : t('xrays.viewer.saved')}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={containerRef}
          className={`relative flex h-125 items-center justify-center overflow-hidden rounded-b-lg bg-black ${
            mode === 'annotate' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Image + annotations wrapper — moves/scales together */}
          <div
            className="relative"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: dragging || drawing ? 'none' : 'transform 0.15s ease',
              transformOrigin: 'center center',
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt={title}
              className="pointer-events-none max-h-125 max-w-full select-none"
              draggable={false}
            />

            {/* Existing annotations overlay */}
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className="group absolute cursor-pointer"
                style={{
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  width: `${ann.width}%`,
                  height: `${ann.height}%`,
                  border: `2px solid ${ann.color || '#ef4444'}`,
                  borderRadius: 2,
                  backgroundColor: `${ann.color || '#ef4444'}15`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAnnotation(selectedAnnotation === ann.id ? null : ann.id);
                }}
              >
                {/* Note label */}
                {ann.note && (
                  <div
                    className="absolute -top-6 inset-s-0 flex max-w-40 items-center gap-1 truncate rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                      ...(selectedAnnotation === ann.id ? { opacity: 1 } : {}),
                    }}
                  >
                    <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                    {ann.note}
                  </div>
                )}

                {/* Delete button */}
                {selectedAnnotation === ann.id && (
                  <button
                    type="button"
                    className="absolute -inset-e-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnotation(ann.id);
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Drawing preview */}
            {previewRect && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-red-400 bg-red-400/10"
                style={previewRect}
              />
            )}

            {/* Pending annotation preview — shows the drawn rectangle before note is added */}
            {pendingAnnotation && (
              <div
                className="pointer-events-none absolute border-2 border-red-500 bg-red-500/15"
                style={{
                  left: `${pendingAnnotation.x}%`,
                  top: `${pendingAnnotation.y}%`,
                  width: `${pendingAnnotation.width}%`,
                  height: `${pendingAnnotation.height}%`,
                  borderRadius: 2,
                }}
              />
            )}
          </div>
        </div>
      </CardContent>

      {/* Note input popover for new annotation */}
      {pendingAnnotation && (
        <div className="border-t bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={pendingNote}
              onChange={(e) => setPendingNote(e.target.value)}
              placeholder={t('xrays.viewer.annotationPlaceholder')}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAnnotation();
                if (e.key === 'Escape') cancelAnnotation();
              }}
            />
            <Button size="sm" onClick={confirmAnnotation}>
              {t('xrays.viewer.addButton')}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelAnnotation}>
              {t('xrays.editDialog.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Annotation list */}
      {annotations.length > 0 && (
        <div className="border-t p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {t('xrays.viewer.annotationsTitle')} ({annotations.length})
            </p>
            {hasUnsaved && (
              <Button size="sm" onClick={saveAnnotations} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="me-2 h-4 w-4" />
                )}
                {t('xrays.viewer.saveChanges')}
              </Button>
            )}
          </div>
          <div className="space-y-1">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                  selectedAnnotation === ann.id ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedAnnotation(selectedAnnotation === ann.id ? null : ann.id)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-sm border"
                    style={{
                      backgroundColor: `${ann.color || '#ef4444'}30`,
                      borderColor: ann.color || '#ef4444',
                    }}
                  />
                  <span>{ann.note || t('xrays.viewer.noNote')}</span>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAnnotation(ann.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Edit Metadata Dialog ────────────────────────────────────

interface EditDialogProps {
  xray: Xray;
  open: boolean;
  onClose: () => void;
}

function EditMetadataDialog({ xray, open, onClose }: EditDialogProps) {
  const { t } = useTranslation();
  const updateMutation = useUpdateXray(xray._id);

  const [title, setTitle] = useState(xray.title);
  const [xrayType, setXrayType] = useState(xray.xrayType);
  const [clinicalPurpose, setClinicalPurpose] = useState(xray.clinicalPurpose || '');
  const [region, setRegion] = useState(xray.region || '');
  const [toothNumbers, setToothNumbers] = useState(xray.toothNumbers?.join(', ') || '');
  const [notes, setNotes] = useState(xray.notes || '');
  const [findings, setFindings] = useState(xray.findings || '');

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast.error(t('xrays.editToast.titleRequired'));
      return;
    }
    try {
      const teeth = toothNumbers
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await updateMutation.mutateAsync({
        title: title.trim(),
        xrayType,
        clinicalPurpose: clinicalPurpose || undefined,
        region: region || undefined,
        toothNumbers: teeth,
        notes: notes || undefined,
        findings: findings || undefined,
      });
      toast.success(t('xrays.editToast.updated'));
      onClose();
    } catch {
      toast.error(t('xrays.editToast.updateFailed'));
    }
  }, [
    title,
    xrayType,
    clinicalPurpose,
    region,
    toothNumbers,
    notes,
    findings,
    updateMutation,
    onClose,
  ]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('xrays.editDialog.title')}</DialogTitle>
          <DialogDescription>{t('xrays.editDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('xrays.editDialog.titleField')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('xrays.editDialog.type')}</Label>
              <Select value={xrayType} onValueChange={setXrayType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {XRAY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('xrays.editDialog.purpose')}</Label>
              <Select
                value={clinicalPurpose || '_none'}
                onValueChange={(v) => setClinicalPurpose(v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('xrays.editDialog.none')}</SelectItem>
                  {PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {t(p.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('xrays.editDialog.region')}</Label>
              <Select
                value={region || '_none'}
                onValueChange={(v) => setRegion(v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('xrays.editDialog.none')}</SelectItem>
                  {REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {t(r.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('xrays.editDialog.toothNumbers')}</Label>
              <Input
                value={toothNumbers}
                onChange={(e) => setToothNumbers(e.target.value)}
                placeholder={t('xrays.editDialog.toothNumbersPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('xrays.editDialog.notes')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>{t('xrays.editDialog.findings')}</Label>
            <Textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('xrays.editDialog.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('xrays.editDialog.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

export default function XrayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: xray, isLoading, isError } = useXrayDetail(id ?? '');
  const deleteMutation = useDeleteXray();
  const { url: resolvedImageUrl, isLoading: isImageLoading } = useResolvedUrl(xray?.imageUrl);
  const getDownloadUrl = useGetDownloadUrl();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!xray) return;
    try {
      await deleteMutation.mutateAsync(xray._id);
      toast.success(t('xrays.editToast.deleted'));
      navigate('/xrays');
    } catch {
      toast.error(t('xrays.editToast.deleteFailed'));
    }
  }, [xray, deleteMutation, navigate]);

  const fmtDate = (d?: string) => (d ? formatDate(d) : '—');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !xray) {
    return (
      <div className="p-6">
        <PageHeader title={t('xrays.detail.notFound')}>
          <Button variant="outline" onClick={() => navigate('/xrays')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('xrays.detail.back')}
          </Button>
        </PageHeader>
      </div>
    );
  }

  const linked = !!xray.treatmentPlanId || !!xray.procedureNoteId || !!xray.dentalChartEntryId;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={xray.title}
        description={`${xray.xrayType} — ${fmtDate(xray.capturedAt || xray.createdAt)}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/xrays')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('xrays.detail.back')}
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="me-2 h-4 w-4" />
            {t('xrays.detail.edit')}
          </Button>
          {xray.imageUrl && (
            <Button
              variant="outline"
              onClick={async () => {
                const url = await getDownloadUrl(xray.imageUrl);
                window.open(url, '_blank');
              }}
            >
              <ExternalLink className="me-2 h-4 w-4" />
              {t('xrays.detail.openOriginal')}
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="me-2 h-4 w-4" />
            {t('xrays.detail.delete')}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Image Viewer — 2/3 width */}
        <div className="lg:col-span-2">
          {resolvedImageUrl ? (
            <XrayViewer
              imageUrl={resolvedImageUrl}
              title={xray.title}
              xrayId={xray._id}
              annotations={xray.annotations ?? []}
            />
          ) : isImageLoading ? (
            <Card>
              <CardContent className="flex h-100 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex h-100 items-center justify-center">
                <p className="text-muted-foreground">{t('xrays.detail.noImageAvailable')}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Metadata Sidebar — 1/3 width */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('xrays.detail.detailsCard')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <DetailRow label={t('xrays.detail.type')}>
                <Badge variant="outline" className="capitalize">
                  {xray.xrayType}
                </Badge>
              </DetailRow>
              <DetailRow label={t('xrays.detail.purpose')}>
                <span className="capitalize">{xray.clinicalPurpose || '—'}</span>
              </DetailRow>
              <DetailRow label={t('xrays.detail.region')}>
                <span className="capitalize">{xray.region?.replace(/_/g, ' ') || '—'}</span>
              </DetailRow>
              <DetailRow label={t('xrays.detail.captured')}>
                {fmtDate(xray.capturedAt || xray.createdAt)}
              </DetailRow>
              <DetailRow label={t('xrays.detail.uploaded')}>{fmtDate(xray.createdAt)}</DetailRow>
            </CardContent>
          </Card>

          {/* Teeth */}
          {xray.toothNumbers?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('xrays.detail.teethCard')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {xray.toothNumbers.map((t) => (
                    <Badge key={t} variant="secondary">
                      #{t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes & Findings */}
          {(xray.notes || xray.findings) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('xrays.detail.clinicalNotes')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {xray.notes && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {t('xrays.detail.notes')}
                    </p>
                    <p className="text-sm">{xray.notes}</p>
                  </div>
                )}
                {xray.notes && xray.findings && <Separator />}
                {xray.findings && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {t('xrays.detail.findings')}
                    </p>
                    <p className="text-sm">{xray.findings}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cross-Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('xrays.detail.crossLinksCard')}</CardTitle>
            </CardHeader>
            <CardContent>
              {linked ? (
                <div className="space-y-2">
                  {xray.treatmentPlanId && (
                    <Badge variant="default" className="w-full justify-start">
                      <Link2 className="me-1.5 h-3 w-3" />
                      {t('xrays.detail.treatmentPlan')}
                    </Badge>
                  )}
                  {xray.procedureNoteId && (
                    <Badge variant="default" className="w-full justify-start">
                      <Link2 className="me-1.5 h-3 w-3" />
                      {t('xrays.detail.procedureNote')}
                    </Badge>
                  )}
                  {xray.dentalChartEntryId && (
                    <Badge variant="default" className="w-full justify-start">
                      <Link2 className="me-1.5 h-3 w-3" />
                      {t('xrays.detail.dentalChart')}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('xrays.detail.noLinksYet')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditMetadataDialog xray={xray} open={editOpen} onClose={() => setEditOpen(false)} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => !o && setDeleteOpen(false)}
        title={t('xrays.deleteDialog.title')}
        description={t('xrays.deleteDialog.description', { title: xray.title })}
        confirmLabel={t('common.actions.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
