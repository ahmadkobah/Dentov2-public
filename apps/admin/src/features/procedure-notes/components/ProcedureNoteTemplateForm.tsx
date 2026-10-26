import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import {
  createProcedureNoteTemplateSchema,
  type CreateProcedureNoteTemplateInput,
} from '@dento/shared';
import {
  Button,
  FormField,
  Input,
  Textarea,
  Switch,
  Label,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@dento/ui';
import { FileText, Loader2 } from 'lucide-react';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '@/stores/locale.store.js';

interface ProcedureNoteTemplateFormProps {
  defaultValues?: Partial<CreateProcedureNoteTemplateInput>;
  onSubmit: (data: CreateProcedureNoteTemplateInput) => void | Promise<void>;
  isPending?: boolean;
  mode?: 'create' | 'edit';
}

export function ProcedureNoteTemplateForm({
  defaultValues,
  onSubmit,
  isPending = false,
  mode = 'create',
}: ProcedureNoteTemplateFormProps) {
  const { isMultiLang } = useSupportedLanguages();
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateProcedureNoteTemplateInput>({
    resolver: zodFormResolver(createProcedureNoteTemplateSchema),
    defaultValues: {
      isActive: true,
      sortOrder: 0,
      name: { en: '', ar: '' },
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {mode === 'create'
            ? t('procedureNotes.templateForm.newTitle')
            : t('procedureNotes.templateForm.editTitle')}
        </DialogTitle>
      </DialogHeader>

      {/* Name (bilingual) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label={t('procedureNotes.templateForm.nameEn')}
          error={(errors.name as any)?.en?.message}
          required
        >
          <Input
            placeholder={t('procedureNotes.templateForm.namePlaceholder')}
            {...register('name.en')}
          />
        </FormField>
        {isMultiLang && (
          <FormField
            label={t('procedureNotes.templateForm.nameAr')}
            error={(errors.name as any)?.ar?.message}
          >
            <Input placeholder="اسم القالب" dir="rtl" {...register('name.ar')} />
          </FormField>
        )}
      </div>

      {/* Procedure Type */}
      <FormField
        label={t('procedureNotes.templateForm.procedureType')}
        error={errors.procedureType?.message}
        required
      >
        <Input
          placeholder={t('procedureNotes.templateForm.procedureTypePlaceholder')}
          {...register('procedureType')}
        />
      </FormField>

      {/* Template Content */}
      <FormField
        label={t('procedureNotes.templateForm.templateContent')}
        error={errors.templateContent?.message}
      >
        <Textarea
          placeholder={t('procedureNotes.templateForm.templateContentPlaceholder')}
          rows={4}
          {...register('templateContent')}
        />
      </FormField>

      {/* Active & Sort Order */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} id="isActive" />
            )}
          />
          <Label htmlFor="isActive">{t('procedureNotes.templateForm.active')}</Label>
        </div>
        <FormField
          label={t('procedureNotes.templateForm.sortOrder')}
          error={errors.sortOrder?.message}
        >
          <Input
            type="number"
            min={0}
            {...register('sortOrder', {
              setValueAs: (v) => (v === '' || v == null ? 0 : Number(v)),
            })}
          />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {mode === 'create'
            ? t('procedureNotes.templateForm.create')
            : t('procedureNotes.templateForm.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
