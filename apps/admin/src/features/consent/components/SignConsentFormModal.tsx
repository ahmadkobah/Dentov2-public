/**
 * SignConsentFormModal — Modal for creating a signed consent form.
 *
 * Steps:
 * 1. Select patient
 * 2. Select consent template → displays template content for the patient to read
 * 3. Select attending doctor
 * 4. Patient signs on canvas
 * 5. Submit
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@dento/ui';
import { PatientCombobox } from '@/components/entity-selectors/PatientCombobox.js';
import { useConsentTemplateList, useCreateConsentForm } from '../hooks/useConsent.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { formatDate } from '@/lib/date.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface SignConsentFormModalProps {
  open: boolean;
  onClose: () => void;
}

export function SignConsentFormModal({ open, onClose }: SignConsentFormModalProps) {
  const locale = useThemeStore((s) => s.locale);
  const lang = locale === 'ar' ? 'ar' : 'en';
  const { t } = useTranslation();

  const [patientId, setPatientId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [doctorId, setDoctorId] = useState('');

  const { data: templatesData } = useConsentTemplateList({ isActive: 'true', limit: 100 });
  const { data: doctorsData } = useDoctorList({ isActive: true, limit: 100 });
  const createMutation = useCreateConsentForm();

  const templates = templatesData?.items ?? [];
  const doctors = doctorsData?.items ?? [];
  const selectedTemplate = templates.find((t) => t._id === templateId);

  // ── Signature Canvas ──────────────────────────────────────

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasSigned, setHasSigned] = useState(false);

  const getCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { x, y } = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [getCoords],
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { x, y } = getCoords(e);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSigned(true);
    },
    [getCoords],
  );

  const stopDraw = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setPatientId('');
      setTemplateId('');
      setDoctorId('');
      setHasSigned(false);
    }
  }, [open]);

  // Clear canvas when template changes
  useEffect(() => {
    clearCanvas();
  }, [templateId, clearCanvas]);

  // ── Submit ────────────────────────────────────────────────

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !patientId || !templateId || !doctorId || !hasSigned) return;
    const signatureDataUrl = canvas.toDataURL('image/png');

    createMutation.mutate(
      {
        templateId,
        patientId,
        doctorId,
        patientSignature: signatureDataUrl,
        signedAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const isReady = patientId && templateId && doctorId && hasSigned;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('consent.sign.title')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 1. Patient Selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t('consent.sign.patient')}</label>
            <PatientCombobox value={patientId} onValueChange={setPatientId} />
          </div>

          {/* 2. Template Selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t('consent.sign.template')}</label>
            <select
              aria-label="Select consent template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('consent.sign.templatePlaceholder')}</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name[lang] || t.name.en} — {t.procedureType}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Template content for the patient to read */}
          {selectedTemplate && (
            <div className="space-y-3 rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">
                  {selectedTemplate.name[lang] || selectedTemplate.name.en}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {selectedTemplate.procedureType}
                </Badge>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('consent.sign.consentDetails')}
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {selectedTemplate.content[lang] || selectedTemplate.content.en}
                </p>
              </div>

              {(selectedTemplate.risks[lang] || selectedTemplate.risks.en) && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('consent.sign.risksTitle')}
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                    {selectedTemplate.risks[lang] || selectedTemplate.risks.en}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. Doctor Selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t('consent.sign.doctor')}</label>
            <select
              aria-label="Select doctor"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('consent.sign.doctorPlaceholder')}</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.title ? `${d.title} ` : ''}
                  {d.firstName} {d.lastName}
                  {d.specialization ? ` — ${d.specialization}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Signature Canvas */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">{t('consent.sign.signatureTitle')}</label>
              {hasSigned && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvas}
                  className="h-7 text-xs"
                >
                  <RotateCcw className="me-1 h-3 w-3" /> {t('consent.sign.clearSignature')}
                </Button>
              )}
            </div>
            <div className="rounded-lg border-2 border-dashed bg-white dark:bg-gray-950">
              <canvas
                ref={canvasRef}
                width={560}
                height={160}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            {!hasSigned && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('consent.sign.signatureInstruction')}
              </p>
            )}
          </div>

          {/* Date display */}
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{t('consent.sign.dateLabel')}</span>{' '}
            {formatDate(new Date().toISOString())}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {t('consent.sign.cancelBtn')}
            </Button>
            <Button
              className="flex-1"
              disabled={!isReady || createMutation.isPending}
              onClick={handleSubmit}
            >
              {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('consent.sign.submitBtn')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
