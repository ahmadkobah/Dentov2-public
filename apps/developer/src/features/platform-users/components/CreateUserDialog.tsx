import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@dento/ui';
import { UserPlus, Shield, Crown, Eye, Lock, EyeOff } from 'lucide-react';
import { useCreatePlatformUser } from '../hooks/use-platform-users.js';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a digit')
    .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  phone: z.string().max(30).optional(),
  platformRole: z.enum(['platform_owner', 'platform_admin', 'platform_viewer']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CreateUserFormData>({
    resolver: zodFormResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      platformRole: 'platform_admin',
    },
  });

  const createMutation = useCreatePlatformUser();

  function handleSubmit(values: CreateUserFormData) {
    createMutation.mutate(
      {
        email: values.email,
        password: values.password,
        firstName: { en: values.firstName },
        lastName: { en: values.lastName },
        phone: values.phone || undefined,
        platformRole: values.platformRole,
      },
      {
        onSuccess: () => {
          toast.success('User created. Verification email sent.');
          form.reset();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to create user');
        },
      },
    );
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) form.reset();
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create User
          </DialogTitle>
          <DialogDescription>
            Create a new platform user. They will receive a verification email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-first">First Name</Label>
              <Input id="create-first" placeholder="First name" {...form.register('firstName')} />
              {form.formState.errors.firstName && (
                <p className="text-xs text-red-500">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-last">Last Name</Label>
              <Input id="create-last" placeholder="Last name" {...form.register('lastName')} />
              {form.formState.errors.lastName && (
                <p className="text-xs text-red-500">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="user@company.com"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="create-phone">Phone (optional)</Label>
            <Input id="create-phone" placeholder="Phone number" {...form.register('phone')} />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="create-password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="create-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars, uppercase, digit, special"
                className="pl-10 pr-10"
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
            )}
            <p className="text-xs text-gray-500">
              The user can change this password later from their profile.
            </p>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={form.watch('platformRole')}
              onValueChange={(v) =>
                form.setValue('platformRole', v as CreateUserFormData['platformRole'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform_owner">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Owner — Full access
                  </div>
                </SelectItem>
                <SelectItem value="platform_admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Admin — Near-full access
                  </div>
                </SelectItem>
                <SelectItem value="platform_viewer">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 opacity-50" />
                    Viewer — Read-only
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
