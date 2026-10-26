/**
 * Medical History form — per BUILD_RULES §8.4.
 * Updates embedded medicalHistory sub-document.
 */

import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { medicalHistorySchema, type MedicalHistoryInput } from '@dento/shared';
import { useUpdateMedicalHistory } from '../hooks/usePatients.js';
import { Button, Label, Checkbox, Input, Textarea, toast } from '@dento/ui';
import { Loader2, Save } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

interface MedicalHistoryFormProps {
  patientId: string;
  defaultValues?: MedicalHistoryInput;
}

const booleanFields = [
  { key: 'isDiabetes', label: 'Diabetes' },
  { key: 'isHypertension', label: 'Hypertension' },
  { key: 'isHeartDisease', label: 'Heart Disease' },
  { key: 'isBleedingDisorder', label: 'Bleeding Disorder' },
  { key: 'isHepatitis', label: 'Hepatitis' },
  { key: 'isAsthma', label: 'Asthma' },
  { key: 'isEpilepsy', label: 'Epilepsy' },
  { key: 'isPregnant', label: 'Pregnant' },
  { key: 'isSmoker', label: 'Smoker' },
  { key: 'isTakingBloodThinners', label: 'Taking Blood Thinners' },
  { key: 'isAllergicToAnesthesia', label: 'Allergic to Anesthesia' },
  { key: 'isAllergicToPenicillin', label: 'Allergic to Penicillin' },
  { key: 'isAllergicToLatex', label: 'Allergic to Latex' },
  { key: 'isDentalAnxiety', label: 'Dental Anxiety' },
] as const;

export function MedicalHistoryForm({ patientId, defaultValues }: MedicalHistoryFormProps) {
  const updateMutation = useUpdateMedicalHistory(patientId);
  const { t } = useTranslation();

  const { register, handleSubmit, setValue, watch } = useForm<MedicalHistoryInput>({
    resolver: zodFormResolver(medicalHistorySchema),
    defaultValues: defaultValues ?? {},
  });

  const onSubmit = async (data: MedicalHistoryInput) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success(t('patients.medical.updated'));
    } catch {
      toast.error(t('patients.medical.updateFailed'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Boolean conditions grid */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('patients.medical.title')}
        </h4>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {booleanFields.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!watch(key)}
                onCheckedChange={(checked) => setValue(key, !!checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Smoking frequency */}
      {watch('isSmoker') && (
        <div>
          <Label htmlFor="smokingFrequency">{t('patients.medical.smokingFrequency')}</Label>
          <Input
            id="smokingFrequency"
            {...register('smokingFrequency')}
            placeholder="e.g. 10 cigarettes/day"
          />
        </div>
      )}

      {/* Dental anxiety level */}
      {watch('isDentalAnxiety') && (
        <div>
          <Label htmlFor="dentalAnxietyLevel">{t('patients.medical.anxietyLevel')} (1-10)</Label>
          <Input
            id="dentalAnxietyLevel"
            type="number"
            min={1}
            max={10}
            {...register('dentalAnxietyLevel', { valueAsNumber: true })}
          />
        </div>
      )}

      {/* Text fields */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="previousDentalSurgeries">{t('patients.medical.previousSurgeries')}</Label>
          <Textarea
            id="previousDentalSurgeries"
            rows={3}
            {...register('previousDentalSurgeries')}
          />
        </div>
        <div>
          <Label htmlFor="otherConditions">{t('patients.medical.otherConditions')}</Label>
          <Textarea id="otherConditions" rows={3} {...register('otherConditions')} />
        </div>
      </div>

      <div>
        <Label htmlFor="additionalNotes">{t('patients.medical.additionalNotes')}</Label>
        <Textarea id="additionalNotes" rows={3} {...register('additionalNotes')} />
      </div>

      <div>
        <Label htmlFor="lastDentalVisitAt">{t('patients.medical.lastDentalVisit')}</Label>
        <Input id="lastDentalVisitAt" type="date" {...register('lastDentalVisitAt')} />
      </div>

      <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
        {updateMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {t('patients.medical.save')}
      </Button>
    </form>
  );
}
