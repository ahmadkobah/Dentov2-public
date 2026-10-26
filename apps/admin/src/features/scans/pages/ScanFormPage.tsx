/**
 * Scan Form Page — Upload a new 3D intraoral scan.
 * Patient/doctor selectors, scan type, ZIP upload, scanner model, notes.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateScan, useMarkScanReady } from '../hooks/useScan.js';
import { PatientCombobox } from '@/components/entity-selectors/PatientCombobox.js';
import { DoctorCombobox } from '@/components/entity-selectors/DoctorCombobox.js';
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
import { FileUploader } from '@/features/uploads/components/FileUploader.js';
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
  Textarea,
  toast,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@dento/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

const SCAN_TYPES = [
  { value: 'full_arch', label: 'Full Arch' },
  { value: 'upper_arch', label: 'Upper Arch' },
  { value: 'lower_arch', label: 'Lower Arch' },
  { value: 'bite_registration', label: 'Bite Registration' },
  { value: 'single_tooth', label: 'Single Tooth' },
  { value: 'other', label: 'Other' },
] as const;

export default function ScanFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateScan();
  const markReadyMutation = useMarkScanReady();
  const { t } = useTranslation();

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [scanType, setScanType] = useState<string>('full_arch');
  const [scannerModel, setScannerModel] = useState('');
  const [scanDate, setScanDate] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{
    key: string;
    fileSize: number;
  } | null>(null);

  const { data: branches } = useActiveBranches();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!patientId) {
        toast.error(t('scans.form.validation.selectPatient'));
        return;
      }
      if (!doctorId) {
        toast.error(t('scans.form.validation.selectDoctor'));
        return;
      }
      if (!uploadedFile) {
        toast.error(t('scans.form.validation.uploadFile'));
        return;
      }

      try {
        const result = await createMutation.mutateAsync({
          patientId,
          doctorId,
          branchId: branchId || undefined,
          scanType: scanType as 'full_arch',
          scannerModel: scannerModel || undefined,
          scanDate: scanDate || undefined,
          notes: notes || undefined,
          fileKey: uploadedFile.key,
          fileSizeMB: Number((uploadedFile.fileSize / (1024 * 1024)).toFixed(2)),
        });

        // Mark as ready
        const scanId = (result as { data: { scan: { _id: string } } }).data.scan._id;
        if (scanId) {
          try {
            await markReadyMutation.mutateAsync(scanId);
          } catch {
            // Non-critical — scan will still be viewable
          }
        }

        toast.success(t('scans.toast.created'));
        navigate('/scans');
      } catch {
        toast.error(t('scans.toast.createFailed'));
      }
    },
    [patientId, doctorId, branchId, scanType, scannerModel, scanDate, notes, uploadedFile],
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('scans.form.title')} description={t('scans.form.subtitle')}>
        <Button variant="outline" onClick={() => navigate('/scans')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('common.back')}
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        {/* Patient & Doctor */}
        <Card>
          <CardHeader>
            <CardTitle>{t('scans.form.patientSection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('scans.form.patient')}</Label>
              <PatientCombobox value={patientId} onValueChange={setPatientId} />
            </div>
            <div>
              <Label>{t('scans.form.doctor')}</Label>
              <DoctorCombobox value={doctorId} onValueChange={setDoctorId} />
            </div>
            {branches && branches.length > 1 && (
              <div>
                <Label>{t('scans.form.branch')}</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('scans.form.selectBranch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b: { _id: string; name: { en: string } }) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.name.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scan Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t('scans.form.scanSection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('scans.form.scanType')}</Label>
              <Select value={scanType} onValueChange={setScanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCAN_TYPES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('scans.form.scannerModel')}</Label>
              <Input
                value={scannerModel}
                onChange={(e) => setScannerModel(e.target.value)}
                placeholder={t('scans.form.scannerModelPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('scans.form.scanDate')}</Label>
              <Input type="date" value={scanDate} onChange={(e) => setScanDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('scans.form.notes')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('scans.form.notesPlaceholder')}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>{t('scans.form.uploadSection')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-3 text-sm">{t('scans.form.uploadHint')}</p>
            <FileUploader
              category="intraoral_scan"
              accept={{
                'application/zip': ['.zip'],
                'application/octet-stream': ['.stl', '.ply', '.obj'],
                'model/stl': ['.stl'],
              }}
              placeholder={t('scans.form.dropZip')}
              onUploadComplete={(result) =>
                setUploadedFile({ key: result.key, fileSize: result.fileSize })
              }
              onError={(err) => toast.error(err)}
            />
            {uploadedFile && (
              <p className="text-muted-foreground mt-2 text-sm">
                {t('scans.form.uploadedSize', {
                  size: (uploadedFile.fileSize / (1024 * 1024)).toFixed(1),
                })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/scans')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('scans.form.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
