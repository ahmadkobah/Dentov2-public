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
  toast,
} from '@dento/ui';
import { Plus } from 'lucide-react';
import { useCreateDomain } from '../hooks/useDomains.js';

/* ------------------------------------------------------------------ */
/*  Validation schema                                                  */
/* ------------------------------------------------------------------ */

const addDomainSchema = z.object({
  tenantSlug: z.string().min(1, 'Tenant slug is required').trim(),
  customDomain: z
    .string()
    .min(1, 'Domain is required')
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/,
      'Enter a valid domain (e.g. clinic.example.com)',
    ),
});

type AddDomainFormValues = z.infer<typeof addDomainSchema>;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface AddDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDomainDialog({ open, onOpenChange }: AddDomainDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<AddDomainFormValues>({
    resolver: zodFormResolver(addDomainSchema),
    defaultValues: { tenantSlug: '', customDomain: '' },
    mode: 'onChange',
  });

  const createDomain = useCreateDomain();

  // Reset form when dialog reopens
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const onSubmit = (values: AddDomainFormValues) => {
    createDomain.mutate(
      {
        tenantSlug: values.tenantSlug.trim(),
        customDomain: values.customDomain.trim().toLowerCase(),
      },
      {
        onSuccess: () => {
          toast.success('Domain added. Configure DNS records to verify.');
          reset();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to add domain');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Custom Domain
          </DialogTitle>
          <DialogDescription>
            Map a custom domain to a tenant's portal. DNS records will be generated after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantSlug">Tenant Slug</Label>
            <Input id="tenantSlug" placeholder="my-clinic" {...register('tenantSlug')} />
            {errors.tenantSlug && (
              <p className="text-xs text-red-500">{errors.tenantSlug.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customDomain">Custom Domain</Label>
            <Input id="customDomain" placeholder="app.myclinic.com" {...register('customDomain')} />
            {errors.customDomain && (
              <p className="text-xs text-red-500">{errors.customDomain.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || createDomain.isPending}>
              {createDomain.isPending ? 'Adding…' : 'Add Domain'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
