import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { createServiceSchema, type CreateServiceInput } from '@dento/shared';
import { Button, FormField, Input, DialogHeader, DialogTitle, DialogFooter } from '@dento/ui';
import { Loader2 } from 'lucide-react';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '@/stores/locale.store.js';

interface ServiceFormProps {
  defaultValues?: Partial<CreateServiceInput>;
  onSubmit: (data: CreateServiceInput) => void | Promise<void>;
  isPending?: boolean;
  mode?: 'create' | 'edit';
}

export function ServiceForm({
  defaultValues,
  onSubmit,
  isPending = false,
  mode = 'create',
}: ServiceFormProps) {
  const { t } = useTranslation();
  const { isMultiLang } = useSupportedLanguages();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateServiceInput>({
    resolver: zodFormResolver(createServiceSchema),
    defaultValues: {
      defaultPrice: 0,
      defaultDuration: 30,
      sortOrder: 0,
      isActive: true,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <DialogHeader>
        <DialogTitle>
          {mode === 'create' ? t('services.form.newTitle') : t('services.form.editTitle')}
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={t('services.form.nameEn')} error={errors.name?.en?.message} required>
          <Input {...register('name.en')} placeholder="e.g. Dental Cleaning" />
        </FormField>
        {isMultiLang && (
          <FormField label={t('services.form.nameAr')} error={errors.name?.ar?.message}>
            <Input {...register('name.ar')} placeholder="اسم الخدمة" dir="rtl" />
          </FormField>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={t('services.form.descriptionEn')} error={errors.description?.en?.message}>
          <Input {...register('description.en')} placeholder="Brief description" />
        </FormField>
        {isMultiLang && (
          <FormField
            label={t('services.form.descriptionAr')}
            error={errors.description?.ar?.message}
          >
            <Input {...register('description.ar')} placeholder="وصف مختصر" dir="rtl" />
          </FormField>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t('services.form.code')} error={errors.code?.message}>
          <Input {...register('code')} placeholder="e.g. D0120" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label={t('services.form.defaultPrice')}
          error={errors.defaultPrice?.message}
          required
        >
          <Input type="number" step="0.01" min="0" {...register('defaultPrice')} />
        </FormField>
        <FormField label={t('services.form.duration')} error={errors.defaultDuration?.message}>
          <Input type="number" min="5" max="480" {...register('defaultDuration')} />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? t('services.form.create') : t('services.form.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
