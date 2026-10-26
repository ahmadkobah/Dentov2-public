/**
 * PrescriptionForm — Dialog form for creating or editing a prescription.
 *
 * Fields: Patient, Doctor, Items (medications), Diagnosis, Notes
 * Medication items picked from the medications catalog.
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from '@dento/ui';
import { PatientCombobox } from '@/components/entity-selectors/PatientCombobox.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useMedicationList, type Medication } from '@/features/medications/hooks/useMedications.js';
import {
  useCreatePrescription,
  useUpdatePrescription,
  type Prescription,
} from '../hooks/usePrescriptions.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { ApiError } from '@/lib/api-client.js';

interface PrescriptionFormProps {
  open: boolean;
  onClose: () => void;
  prescription?: Prescription | null;
}

interface ItemDraft {
  medicationId?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

const emptyItem = (): ItemDraft => ({
  medicationName: '',
  dosage: '',
  frequency: '',
  duration: '',
  quantity: 1,
  instructions: '',
});

export function PrescriptionForm({ open, onClose, prescription }: PrescriptionFormProps) {
  const { t } = useTranslation();
  const isEditing = !!prescription;

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [safetyWarnings, setSafetyWarnings] = useState<string[] | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const { data: doctorsData } = useDoctorList({ isActive: true, limit: 100 });
  const { data: medsData } = useMedicationList({
    isActive: true,
    limit: 200,
    sortBy: 'nameEn',
    sortOrder: 'asc',
  });
  const createMutation = useCreatePrescription();
  const updateMutation = useUpdatePrescription(prescription?._id ?? '');

  const doctors = doctorsData?.items ?? [];
  const medicationsList = medsData?.items ?? [];

  // Pre-populate form when editing
  useEffect(() => {
    if (prescription && open) {
      setPatientId(
        typeof prescription.patientId === 'object'
          ? prescription.patientId._id
          : prescription.patientId,
      );
      setDoctorId(prescription.doctorId);
      setDiagnosis(prescription.diagnosis || '');
      setNotes(prescription.notes || '');
      setStatus(prescription.status === 'active' ? 'active' : 'draft');
      setItems(
        prescription.items.map((it) => ({
          medicationId: it.medicationId || undefined,
          medicationName: it.medicationName,
          dosage: it.dosage || '',
          frequency: it.frequency || '',
          duration: it.duration || '',
          quantity: it.quantity || 1,
          instructions: it.instructions || '',
        })),
      );
    }
  }, [prescription, open]);

  const reset = useCallback(() => {
    setPatientId('');
    setDoctorId('');
    setDiagnosis('');
    setNotes('');
    setItems([emptyItem()]);
    setStatus('draft');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const updateItem = (idx: number, field: keyof ItemDraft, value: string | number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectMedication = (idx: number, med: Medication) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              medicationId: med._id,
              medicationName: med.nameEn,
              dosage: med.defaultDosage || it.dosage,
              frequency: med.defaultFrequency || it.frequency,
              duration: med.defaultDuration || it.duration,
            }
          : it,
      ),
    );
  };

  const handleSubmit = async (override?: { acknowledged: true; reason: string }) => {
    if (!patientId || !doctorId) {
      toast.error(t('prescriptions.form.validationPatientDoctor'));
      return;
    }

    const validItems = items.filter((it) => it.medicationName.trim());
    if (validItems.length === 0) {
      toast.error(t('prescriptions.form.validationMedication'));
      return;
    }

    try {
      const payload = {
        patientId,
        doctorId,
        items: validItems.map((it) => ({
          medicationId: it.medicationId || '',
          medicationName: it.medicationName,
          dosage: it.dosage || '',
          frequency: it.frequency || '',
          duration: it.duration || '',
          quantity: it.quantity || 1,
          instructions: it.instructions || '',
        })),
        diagnosis: diagnosis || undefined,
        notes: notes || undefined,
        status,
        ...(override ? { safetyOverride: override } : {}),
      };

      if (isEditing) {
        await updateMutation.mutateAsync(payload);
        toast.success(t('prescriptions.toast.updated'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('prescriptions.toast.created'));
      }
      setSafetyWarnings(null);
      setOverrideReason('');
      handleClose();
    } catch (err) {
      // Phase 1.2 — Surface clinical-safety warnings inline
      if (
        err instanceof ApiError &&
        err.statusCode === 409 &&
        err.details &&
        typeof err.details === 'object' &&
        Array.isArray((err.details as { warnings?: unknown }).warnings)
      ) {
        setSafetyWarnings((err.details as { warnings: string[] }).warnings);
        return;
      }
      toast.error(
        isEditing ? t('prescriptions.toast.updateFailed') : t('prescriptions.toast.createFailed'),
      );
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 backdrop-blur-sm">
      <Card className="w-full max-w-3xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">
            {isEditing ? t('prescriptions.form.editTitle') : t('prescriptions.form.newTitle')}
          </CardTitle>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Patient & Doctor row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1.5">{t('prescriptions.form.patient')} *</Label>
              <PatientCombobox value={patientId} onValueChange={setPatientId} />
            </div>
            <div>
              <Label className="mb-1.5">{t('prescriptions.form.doctor')} *</Label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('prescriptions.form.selectDoctor')}</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.firstName} {d.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diagnosis & Status */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1.5">{t('prescriptions.form.diagnosis')}</Label>
              <Input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Dental abscess"
              />
            </div>
            <div>
              <Label className="mb-1.5">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'active')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('prescriptions.form.statusDraft')}</SelectItem>
                  <SelectItem value="active">{t('prescriptions.form.statusActive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Medication Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>{t('prescriptions.form.medications')} *</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="me-1 h-3.5 w-3.5" />
                {t('prescriptions.form.add')}
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="relative rounded-lg border bg-gray-50 p-3 dark:bg-gray-800"
                >
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(idx)}
                      className="absolute end-2 top-2 rounded p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Medication select */}
                  <div className="mb-2">
                    <Label className="mb-1 text-xs">{t('prescriptions.form.medications')} *</Label>
                    <select
                      value={item.medicationId || ''}
                      onChange={(e) => {
                        const med = medicationsList.find((m) => m._id === e.target.value);
                        if (med) selectMedication(idx, med);
                      }}
                      className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">{t('prescriptions.form.selectMedication')}</option>
                      {medicationsList.map((med) => (
                        <option key={med._id} value={med._id}>
                          {med.nameEn}
                          {med.strength ? ` — ${med.strength}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div>
                      <Label className="mb-1 text-xs">{t('prescriptions.form.dosage')}</Label>
                      <Input
                        value={item.dosage}
                        onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                        placeholder="e.g. 500mg"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 text-xs">{t('prescriptions.form.frequency')}</Label>
                      <Input
                        value={item.frequency}
                        onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                        placeholder="e.g. 3x daily"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 text-xs">{t('prescriptions.form.duration')}</Label>
                      <Input
                        value={item.duration}
                        onChange={(e) => updateItem(idx, 'duration', e.target.value)}
                        placeholder="e.g. 7 days"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 text-xs">{t('prescriptions.form.qty')}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <Label className="mb-1 text-xs">{t('prescriptions.form.instructions')}</Label>
                    <Input
                      value={item.instructions}
                      onChange={(e) => updateItem(idx, 'instructions', e.target.value)}
                      placeholder="e.g. Take after meals"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1.5">{t('prescriptions.form.notes')}</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Additional notes…"
            />
          </div>

          {/* Phase 1.2 — Clinical-safety warnings (allergies/contraindications) */}
          {safetyWarnings && safetyWarnings.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Clinical-Safety Warnings
              </div>
              <ul className="list-disc ps-6 space-y-1 text-sm">
                {safetyWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <div>
                <Label className="mb-1.5 text-xs">Override reason (required, audited)</Label>
                <Input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Clinical justification for proceeding…"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setSafetyWarnings(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={overrideReason.trim().length < 3 || createMutation.isPending}
                  onClick={() =>
                    handleSubmit({ acknowledged: true, reason: overrideReason.trim() })
                  }
                >
                  {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  Override and prescribe
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleClose}>
              {t('prescriptions.form.cancel')}
            </Button>
            <Button onClick={() => handleSubmit()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('prescriptions.form.create')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
