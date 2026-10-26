/**
 * Allergy list + add/remove for patient detail page.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { allergySchema, type AllergyInput } from '@dento/shared';
import { useAddAllergy, useRemoveAllergy } from '../hooks/usePatients.js';
import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  Card,
  CardContent,
  toast,
} from '@dento/ui';
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

interface AllergyListProps {
  patientId: string;
  allergies: Array<{
    _id: string;
    allergen: string;
    reaction?: string;
    severity: 'mild' | 'moderate' | 'severe';
    notedAt?: string;
  }>;
}

const severityColors: Record<string, string> = {
  mild: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  moderate: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  severe: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export function AllergyList({ patientId, allergies }: AllergyListProps) {
  const [showForm, setShowForm] = useState(false);
  const { t } = useTranslation();
  const addMutation = useAddAllergy(patientId);
  const removeMutation = useRemoveAllergy(patientId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AllergyInput>({
    resolver: zodFormResolver(allergySchema),
    defaultValues: { allergen: '', severity: 'mild' },
  });

  const severity = watch('severity');

  const onSubmit = async (data: AllergyInput) => {
    try {
      await addMutation.mutateAsync(data);
      reset();
      setShowForm(false);
      toast.success(t('patients.allergies.added'));
    } catch {
      toast.error(t('patients.allergies.addFailed'));
    }
  };

  const handleRemove = async (allergyId: string) => {
    try {
      await removeMutation.mutateAsync(allergyId);
      toast.success(t('patients.allergies.removed'));
    } catch {
      toast.error(t('patients.allergies.removeFailed'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Allergies ({allergies.length})
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="me-1 h-4 w-4" />
          {t('patients.allergies.add')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-1 gap-3 md:grid-cols-4"
            >
              <div>
                <Label htmlFor="allergen">{t('patients.allergies.allergen')} *</Label>
                <Input
                  id="allergen"
                  {...register('allergen')}
                  placeholder="e.g. Penicillin"
                  aria-describedby={errors.allergen ? 'allergen-error' : undefined}
                />
                {errors.allergen && (
                  <p id="allergen-error" className="mt-1 text-xs text-red-500">
                    {errors.allergen.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="reaction">{t('patients.allergies.reaction')}</Label>
                <Input id="reaction" {...register('reaction')} placeholder="e.g. Rash" />
              </div>
              <div>
                <Label htmlFor="severity">{t('patients.allergies.severity')}</Label>
                <Select
                  value={severity}
                  onValueChange={(v) => setValue('severity', v as AllergyInput['severity'])}
                >
                  <SelectTrigger id="severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">{t('patients.allergies.mild')}</SelectItem>
                    <SelectItem value="moderate">{t('patients.allergies.moderate')}</SelectItem>
                    <SelectItem value="severe">{t('patients.allergies.severe')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={addMutation.isPending} className="gap-2">
                  {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {allergies.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('patients.allergies.empty')}
        </p>
      ) : (
        <div className="space-y-2">
          {allergies.map((a) => (
            <div
              key={a._id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{a.allergen}</span>
                  {a.reaction && (
                    <span className="ms-2 text-sm text-gray-500 dark:text-gray-400">
                      — {a.reaction}
                    </span>
                  )}
                </div>
                <Badge className={severityColors[a.severity]}>{a.severity}</Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${a.allergen} allergy`}
                onClick={() => handleRemove(a._id)}
                disabled={removeMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
