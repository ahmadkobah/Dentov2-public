/**
 * X-Ray Upload Page — Upload new X-ray with metadata.
 * FileUploader (drag-and-drop) + metadata form + patient/doctor selectors.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/stores/locale.store.js';
import { useCreateXray } from '../hooks/useXrays.js';
import { FileUploader } from '@/features/uploads/components/FileUploader.js';
import type { UploadResult } from '@/features/uploads/hooks/useUpload.js';
import { PatientCombobox } from '@/components/entity-selectors/PatientCombobox.js';
import { DoctorCombobox } from '@/components/entity-selectors/DoctorCombobox.js';
import { TreatmentPlanCombobox } from '@/components/entity-selectors/TreatmentPlanCombobox.js';
import { ProcedureNoteCombobox } from '@/components/entity-selectors/ProcedureNoteCombobox.js';
import { ToothSelector } from '@/components/ToothSelector.js';
import {
  PageHeader,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from '@dento/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';

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

export default function XrayUploadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createMutation = useCreateXray();

  // Upload state
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // Form state
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [title, setTitle] = useState('');
  const [xrayType, setXrayType] = useState('periapical');
  const [clinicalPurpose, setClinicalPurpose] = useState('');
  const [region, setRegion] = useState('');
  const [toothNumbers, setToothNumbers] = useState<string[]>([]);
  const [treatmentPlanId, setTreatmentPlanId] = useState('');
  const [procedureNoteId, setProcedureNoteId] = useState('');
  const [notes, setNotes] = useState('');
  const [findings, setFindings] = useState('');
  const [capturedAt, setCapturedAt] = useState('');

  const handleUploadComplete = useCallback((result: UploadResult) => {
    setUploadResult(result);
    // Auto-fill title from filename if empty
    setTitle((prev) => prev || result.fileName.replace(/\.[^.]+$/, ''));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!uploadResult) {
        toast.error(t('xrays.uploadToast.noImage'));
        return;
      }
      if (!patientId) {
        toast.error(t('xrays.uploadToast.noPatient'));
        return;
      }
      if (!doctorId) {
        toast.error(t('xrays.uploadToast.noDoctor'));
        return;
      }
      if (!title.trim()) {
        toast.error(t('xrays.uploadToast.noTitle'));
        return;
      }

      try {
        await createMutation.mutateAsync({
          patientId,
          doctorId,
          title: title.trim(),
          xrayType,
          imageUrl: uploadResult.key,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          toothNumbers,
          clinicalPurpose: clinicalPurpose || undefined,
          region: region || undefined,
          treatmentPlanId: treatmentPlanId || undefined,
          procedureNoteId: procedureNoteId || undefined,
          notes: notes || undefined,
          findings: findings || undefined,
          capturedAt: capturedAt || undefined,
        });

        toast.success(t('xrays.uploadToast.success'));
        navigate('/xrays');
      } catch {
        toast.error(t('xrays.uploadToast.failed'));
      }
    },
    [
      uploadResult,
      patientId,
      doctorId,
      title,
      xrayType,
      toothNumbers,
      treatmentPlanId,
      procedureNoteId,
      clinicalPurpose,
      region,
      notes,
      findings,
      capturedAt,
      createMutation,
      navigate,
    ],
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('xrays.upload.title')} description={t('xrays.upload.description')}>
        <Button variant="outline" onClick={() => navigate('/xrays')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('xrays.upload.back')}
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>{t('xrays.upload.imageSection')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploader
              category="xray"
              accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.dcm'] }}
              onUploadComplete={handleUploadComplete}
              onError={(err) => toast.error(err)}
              placeholder={t('xrays.upload.dropzoneText')}
            />
          </CardContent>
        </Card>

        {/* Patient & Doctor */}
        <Card>
          <CardHeader>
            <CardTitle>{t('xrays.upload.patientDoctor')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('xrays.upload.patient')}</Label>
              <PatientCombobox value={patientId} onValueChange={setPatientId} />
            </div>
            <div className="space-y-2">
              <Label>{t('xrays.upload.doctor')}</Label>
              <DoctorCombobox value={doctorId} onValueChange={setDoctorId} />
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>{t('xrays.upload.details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('xrays.upload.titleField')}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Periapical #14 — Pre-treatment"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('xrays.upload.xrayType')}</Label>
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
                <Label>{t('xrays.upload.clinicalPurpose')}</Label>
                <Select
                  value={clinicalPurpose || '_none'}
                  onValueChange={(v) => setClinicalPurpose(v === '_none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
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

              <div className="space-y-2">
                <Label>{t('xrays.upload.region')}</Label>
                <Select
                  value={region || '_none'}
                  onValueChange={(v) => setRegion(v === '_none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('xrays.upload.toothNumbers')}</Label>
                <ToothSelector value={toothNumbers} onValueChange={setToothNumbers} />
              </div>
              <div className="space-y-2">
                <Label>{t('xrays.upload.capturedDate')}</Label>
                <Input
                  type="date"
                  value={capturedAt}
                  onChange={(e) => setCapturedAt(e.target.value)}
                />
              </div>
            </div>

            {/* Optional Linking */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('xrays.upload.linkTreatmentPlan')}</Label>
                <TreatmentPlanCombobox
                  value={treatmentPlanId}
                  onValueChange={setTreatmentPlanId}
                  patientId={patientId || undefined}
                  disabled={!patientId}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('xrays.upload.linkProcedureNote')}</Label>
                <ProcedureNoteCombobox
                  value={procedureNoteId}
                  onValueChange={setProcedureNoteId}
                  patientId={patientId || undefined}
                  disabled={!patientId}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('xrays.detail.notes')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Clinical notes about this X-ray..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('xrays.detail.findings')}</Label>
              <Textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Clinical observations and findings..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3 rtl:justify-start">
          <Button type="button" variant="outline" onClick={() => navigate('/xrays')}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" disabled={createMutation.isPending || !uploadResult}>
            {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('xrays.editDialog.saveChanges')}
          </Button>
        </div>
      </form>
    </div>
  );
}
