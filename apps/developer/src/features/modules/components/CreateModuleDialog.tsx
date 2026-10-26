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
} from '@dento/ui';
import { Plus } from 'lucide-react';
import { useCreateModule } from '../hooks/useModules.js';

const schema = z.object({
  slug: z
    .string()
    .min(2, 'At least 2 characters')
    .max(60)
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only'),
  nameEn: z.string().min(1, 'Required'),
  nameAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  version: z
    .string()
    .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Must be valid SemVer (e.g. 1.0.0)'),
  type: z.enum(['core', 'paid']),
  icon: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateModuleDialog({ open, onOpenChange }: CreateModuleDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodFormResolver(schema),
    defaultValues: {
      slug: '',
      nameEn: '',
      nameAr: '',
      descriptionEn: '',
      descriptionAr: '',
      version: '0.1.0',
      type: 'paid',
      icon: '',
    },
    mode: 'onChange',
  });

  const createModule = useCreateModule();

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    createModule.mutate(
      {
        slug: values.slug,
        name: { en: values.nameEn, ar: values.nameAr || undefined },
        description: values.descriptionEn
          ? { en: values.descriptionEn, ar: values.descriptionAr || undefined }
          : undefined,
        version: values.version,
        type: values.type,
        icon: values.icon || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Module
          </DialogTitle>
          <DialogDescription>
            Define a new platform module. Prices are managed separately on the Pricing page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug *</Label>
              <Input id="slug" placeholder="dental_charts" {...register('slug')} />
              {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="version">Version *</Label>
              <Input id="version" placeholder="0.1.0" {...register('version')} />
              {errors.version && <p className="text-xs text-red-500">{errors.version.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nameEn">Name (EN) *</Label>
              <Input id="nameEn" placeholder="Dental Charts" {...register('nameEn')} />
              {errors.nameEn && <p className="text-xs text-red-500">{errors.nameEn.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameAr">Name (AR)</Label>
              <Input id="nameAr" placeholder="مخططات الأسنان" {...register('nameAr')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descriptionEn">Description (EN)</Label>
            <Textarea
              id="descriptionEn"
              rows={2}
              placeholder="Module description..."
              {...register('descriptionEn')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descriptionAr">Description (AR)</Label>
            <Textarea
              id="descriptionAr"
              rows={2}
              placeholder="وصف الوحدة..."
              {...register('descriptionAr')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                {...register('type')}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="paid">Paid</option>
                <option value="core">Core (free)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="icon">Icon (Lucide name)</Label>
              <Input id="icon" placeholder="Package" {...register('icon')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || createModule.isPending}>
              {createModule.isPending ? 'Creating…' : 'Create Module'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
