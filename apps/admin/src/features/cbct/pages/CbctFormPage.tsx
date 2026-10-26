/**
 * CBCT Form Page — Create a new CBCT order.
 * Patient/doctor selectors, indication, purpose, priority, scheduling.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateCbctOrder } from '../hooks/useCbct.js';
import { PatientCombobox } from '@/components/entity-selectors/PatientCombobox.js';
import { DoctorCombobox } from '@/components/entity-selectors/DoctorCombobox.js';
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
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

const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'low', label: 'Low' },
] as const;

const PURPOSES = [
  { value: 'implant_planning', label: 'Implant Planning' },
  { value: 'endo_evaluation', label: 'Endodontic Evaluation' },
  { value: 'ortho_assessment', label: 'Orthodontic Assessment' },
  { value: 'tmj_evaluation', label: 'TMJ Evaluation' },
  { value: 'pathology', label: 'Pathology' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'surgical_planning', label: 'Surgical Planning' },
  { value: 'other', label: 'Other' },
] as const;

export default function CbctFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateCbctOrder();
  const { t } = useTranslation();

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [indication, setIndication] = useState('');

  const { data: branches } = useActiveBranches();
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [clinicalPurpose, setClinicalPurpose] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'routine' | 'stat' | 'asap'>('routine');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!patientId) {
        toast.error(t('cbct.form.validation.selectPatient'));
        return;
      }
      if (!doctorId) {
        toast.error(t('cbct.form.validation.selectDoctor'));
        return;
      }

      try {
        const result = await createMutation.mutateAsync({
          patientId,
          requestingDoctorId: doctorId,
          branchId: branchId || undefined,
          indication: indication || undefined,
          clinicalNotes: clinicalNotes || undefined,
          clinicalPurpose: clinicalPurpose || undefined,
          priority,
          scheduledDate: scheduledDate || undefined,
          scheduledTime: scheduledTime || undefined,
        });

        toast.success(t('cbct.toast.created'));
        // Navigate to the detail page if we get the ID back
        const orderId = (result as { data?: { cbctOrder?: { _id: string } } })?.data?.cbctOrder
          ?._id;
        navigate(orderId ? `/cbct/${orderId}` : '/cbct');
      } catch {
        toast.error(t('cbct.toast.createFailed'));
      }
    },
    [
      patientId,
      doctorId,
      branchId,
      indication,
      clinicalNotes,
      clinicalPurpose,
      priority,
      scheduledDate,
      scheduledTime,
      createMutation,
      navigate,
    ],
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('cbct.form.title')} description={t('cbct.form.subtitle')}>
        <Button variant="outline" onClick={() => navigate('/cbct')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('cbct.form.backBtn')}
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        {/* Patient & Doctor */}
        <Card>
          <CardHeader>
            <CardTitle>{t('cbct.form.section.patientDoctor')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('cbct.form.patient')}</Label>
              <PatientCombobox value={patientId} onValueChange={setPatientId} />
            </div>
            <div className="space-y-2">
              <Label>{t('cbct.form.doctor')}</Label>
              <DoctorCombobox value={doctorId} onValueChange={setDoctorId} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('cbct.form.branch')}</Label>
              <Select
                value={branchId || '_none'}
                onValueChange={(v) => setBranchId(v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {branches?.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t('cbct.form.section.orderDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('cbct.form.purpose')}</Label>
                <Select
                  value={clinicalPurpose || '_none'}
                  onValueChange={(v) => setClinicalPurpose(v === '_none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('cbct.form.priority')}</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('cbct.form.indication')}</Label>
              <Textarea
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
                placeholder="Clinical reason for the CBCT scan..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('cbct.form.clinicalNotes')}</Label>
              <Textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Additional clinical information..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle>{t('cbct.form.section.scheduling')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('cbct.form.scheduledDate')}</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('cbct.form.scheduledTime')}</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3 rtl:justify-start">
          <Button type="button" variant="outline" onClick={() => navigate('/cbct')}>
            {t('cbct.form.cancelBtn')}
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('cbct.form.submitBtn')}
          </Button>
        </div>
      </form>
    </div>
  );
}
