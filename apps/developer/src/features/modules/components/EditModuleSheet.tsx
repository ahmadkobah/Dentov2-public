import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Separator,
} from '@dento/ui';
import { useUpdateModule } from '../hooks/useModules.js';
import type { ModuleItem } from '../hooks/useModules.js';

const schema = z.object({
  nameEn: z.string().min(1, 'Required'),
  nameAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  dependsOn: z.string(),
  conflictsWith: z.string(),
  icon: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface EditModuleSheetProps {
  module: ModuleItem | null;
  onClose: () => void;
}

export function EditModuleSheet({ module, onClose }: EditModuleSheetProps) {
  const updateModule = useUpdateModule(module?.slug ?? '');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodFormResolver(schema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (module) {
      reset({
        nameEn: module.name.en,
        nameAr: module.name.ar ?? '',
        descriptionEn: module.description?.en ?? '',
        descriptionAr: module.description?.ar ?? '',
        dependsOn: module.dependsOn.join(', '),
        conflictsWith: module.conflictsWith.join(', '),
        icon: module.icon ?? '',
        isActive: module.isActive,
      });
    }
  }, [module, reset]);

  const isActive = watch('isActive');

  const onSubmit = (values: FormValues) => {
    const deps = values.dependsOn
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const conflicts = values.conflictsWith
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    updateModule.mutate(
      {
        name: { en: values.nameEn, ar: values.nameAr || undefined },
        description: { en: values.descriptionEn ?? '', ar: values.descriptionAr || undefined },
        dependsOn: deps,
        conflictsWith: conflicts,
        icon: values.icon || undefined,
        isActive: values.isActive,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={!!module} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Module</DialogTitle>
          <DialogDescription>
            {module?.slug} · v{module?.version} · {module?.status}
          </DialogDescription>
        </DialogHeader>

        {module && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-nameEn">Name (EN) *</Label>
                <Input id="edit-nameEn" {...register('nameEn')} />
                {errors.nameEn && <p className="text-xs text-red-500">{errors.nameEn.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-nameAr">Name (AR)</Label>
                <Input id="edit-nameAr" {...register('nameAr')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-descEn">Description (EN)</Label>
              <Textarea id="edit-descEn" rows={2} {...register('descriptionEn')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-descAr">Description (AR)</Label>
              <Textarea id="edit-descAr" rows={2} {...register('descriptionAr')} />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="edit-deps">Dependencies (comma-separated slugs)</Label>
              <Input
                id="edit-deps"
                placeholder="patients, appointments"
                {...register('dependsOn')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-conflicts">Conflicts With (comma-separated slugs)</Label>
              <Input id="edit-conflicts" placeholder="" {...register('conflictsWith')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-icon">Icon (Lucide name)</Label>
              <Input id="edit-icon" placeholder="Package" {...register('icon')} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-gray-500">Disable to hide module from tenants</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(v) => setValue('isActive', v, { shouldDirty: true })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isDirty || updateModule.isPending}>
                {updateModule.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
