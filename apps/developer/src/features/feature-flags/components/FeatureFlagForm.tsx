/**
 * FeatureFlagForm — Create/Edit sheet for feature flags
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 3.10
 * Key, name, description, enabled toggle, percentage slider,
 * tenant ID, user IDs list, conditions JSON editor, value JSON editor.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Separator,
  Badge,
} from '@dento/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { FeatureFlag, CreateFeatureFlagInput, UpdateFeatureFlagInput } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Validation schema (flat form state)                                */
/* ------------------------------------------------------------------ */

const featureFlagFormSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(
      /^[a-z][a-z0-9_]*$/,
      'Must start with lowercase letter; only lowercase, numbers, underscores',
    ),
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  tenantId: z.string(),
  enabled: z.boolean(),
  percentageRollout: z.string(),
  usePercentage: z.boolean(),
  userIds: z.array(z.string()),
  conditionsJson: z.string().superRefine((v, ctx) => {
    if (!v.trim()) return;
    try {
      const parsed = JSON.parse(v);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a JSON object' });
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' });
    }
  }),
  valueJson: z.string().superRefine((v, ctx) => {
    if (!v.trim()) return;
    try {
      JSON.parse(v);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' });
    }
  }),
});

type FormState = z.infer<typeof featureFlagFormSchema>;

function emptyForm(): FormState {
  return {
    key: '',
    name: '',
    description: '',
    tenantId: '',
    enabled: false,
    percentageRollout: '100',
    usePercentage: false,
    userIds: [],
    conditionsJson: '',
    valueJson: '',
  };
}

function flagToForm(flag: FeatureFlag): FormState {
  return {
    key: flag.key,
    name: flag.name,
    description: flag.description ?? '',
    tenantId: flag.tenantId ?? '',
    enabled: flag.enabled,
    percentageRollout: flag.percentageRollout != null ? String(flag.percentageRollout) : '100',
    usePercentage: flag.percentageRollout != null,
    userIds: flag.userIds ?? [],
    conditionsJson: flag.conditions ? JSON.stringify(flag.conditions, null, 2) : '',
    valueJson: flag.value != null ? JSON.stringify(flag.value, null, 2) : '',
  };
}

function formToCreateInput(form: FormState): CreateFeatureFlagInput {
  const input: CreateFeatureFlagInput = {
    key: form.key,
    name: form.name,
  };

  if (form.description) input.description = form.description;
  if (form.tenantId) input.tenantId = form.tenantId;
  else input.tenantId = null;

  input.enabled = form.enabled;

  if (form.usePercentage) {
    input.percentageRollout = parseInt(form.percentageRollout, 10) || 0;
  } else {
    input.percentageRollout = null;
  }

  if (form.userIds.length > 0) {
    input.userIds = form.userIds.filter(Boolean);
  }

  if (form.conditionsJson.trim()) {
    try {
      input.conditions = JSON.parse(form.conditionsJson);
    } catch {
      // ignore — validation will catch
    }
  }

  if (form.valueJson.trim()) {
    try {
      input.value = JSON.parse(form.valueJson);
    } catch {
      // ignore
    }
  }

  return input;
}

function formToUpdateInput(form: FormState): UpdateFeatureFlagInput {
  const input: UpdateFeatureFlagInput = {
    name: form.name,
  };

  if (form.description !== undefined) input.description = form.description;
  input.tenantId = form.tenantId || null;
  input.enabled = form.enabled;

  if (form.usePercentage) {
    input.percentageRollout = parseInt(form.percentageRollout, 10) || 0;
  } else {
    input.percentageRollout = null;
  }

  input.userIds = form.userIds.length > 0 ? form.userIds.filter(Boolean) : null;

  if (form.conditionsJson.trim()) {
    try {
      input.conditions = JSON.parse(form.conditionsJson);
    } catch {
      // ignore
    }
  } else {
    input.conditions = null;
  }

  if (form.valueJson.trim()) {
    try {
      input.value = JSON.parse(form.valueJson);
    } catch {
      // ignore
    }
  } else {
    input.value = null;
  }

  return input;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FeatureFlagFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFlag: FeatureFlag | null;
  onSubmit: (data: CreateFeatureFlagInput | (UpdateFeatureFlagInput & { id: string })) => void;
  isSubmitting: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FeatureFlagForm({
  open,
  onOpenChange,
  editingFlag,
  onSubmit,
  isSubmitting,
}: FeatureFlagFormProps) {
  const isEditing = !!editingFlag;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormState>({
    resolver: zodFormResolver(featureFlagFormSchema),
    defaultValues: emptyForm(),
    mode: 'onChange',
  });

  // Reset form when opening/switching modes
  useEffect(() => {
    if (open) {
      reset(editingFlag ? flagToForm(editingFlag) : emptyForm());
    }
  }, [open, editingFlag, reset]);

  // Watched values for controlled components
  const enabled = watch('enabled');
  const usePercentage = watch('usePercentage');
  const percentageRollout = watch('percentageRollout');
  const userIds = watch('userIds');

  // User IDs management
  const addUserId = () => {
    setValue('userIds', [...userIds, ''], { shouldValidate: true });
  };
  const removeUserId = (index: number) => {
    setValue(
      'userIds',
      userIds.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  };
  const updateUserId = (index: number, val: string) => {
    const updated = [...userIds];
    updated[index] = val;
    setValue('userIds', updated, { shouldValidate: true });
  };

  const onFormSubmit = (data: FormState) => {
    if (isEditing && editingFlag) {
      onSubmit({ ...formToUpdateInput(data), id: editingFlag._id });
    } else {
      onSubmit(formToCreateInput(data));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Feature Flag' : 'Create Feature Flag'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Editing flag "${editingFlag.name}"`
              : 'Create a new feature flag for gradual rollout control'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="mt-6 space-y-6">
          {/* ── Key ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="ff-key">
              Flag Key <span className="text-xs text-gray-500">(lowercase_snake, immutable)</span>
            </Label>
            <Input
              id="ff-key"
              {...register('key')}
              placeholder="e.g. enable_new_dashboard"
              disabled={isEditing}
            />
            {errors.key && <p className="text-xs text-red-600">{errors.key.message}</p>}
          </div>

          {/* ── Name ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="ff-name">Flag Name *</Label>
            <Input id="ff-name" {...register('name')} placeholder="e.g. New Dashboard" />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          {/* ── Description ──────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="ff-desc">Description</Label>
            <Textarea
              id="ff-desc"
              {...register('description')}
              placeholder="What does this feature flag control?"
              rows={2}
            />
          </div>

          <Separator />

          {/* ── Enable / Disable ─────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Enabled</Label>
              <p className="text-xs text-gray-500">Toggle this flag on or off</p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => setValue('enabled', v, { shouldValidate: true })}
            />
          </div>

          {/* ── Tenant Scope ─────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="ff-tenant">
              Tenant ID <span className="text-xs text-gray-500">(leave empty for global)</span>
            </Label>
            <Input id="ff-tenant" {...register('tenantId')} placeholder="Global (all tenants)" />
          </div>

          <Separator />

          {/* ── Percentage Rollout ────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Percentage Rollout</Label>
                <p className="text-xs text-gray-500">Gradually roll out to a % of users</p>
              </div>
              <Switch
                checked={usePercentage}
                onCheckedChange={(v) => setValue('usePercentage', v, { shouldValidate: true })}
              />
            </div>
            {usePercentage && (
              <div className="flex items-center gap-3">
                <Input
                  type="range"
                  min={0}
                  max={100}
                  value={percentageRollout}
                  onChange={(e) =>
                    setValue('percentageRollout', e.target.value, { shouldValidate: true })
                  }
                  className="flex-1"
                />
                <Badge variant="secondary" className="min-w-[3rem] text-center text-sm">
                  {percentageRollout}%
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* ── User Targeting ────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>
                  User Targeting{' '}
                  <Badge variant="secondary" className="ms-1 text-xs">
                    {userIds.length}
                  </Badge>
                </Label>
                <p className="text-xs text-gray-500">Target specific user IDs</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addUserId}>
                <Plus className="me-1 h-3 w-3" />
                Add User
              </Button>
            </div>
            {userIds.length > 0 && (
              <div className="space-y-2">
                {userIds.map((uid, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={uid}
                      onChange={(e) => updateUserId(i, e.target.value)}
                      placeholder="User ID"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUserId(i)}
                      className="shrink-0 text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* ── Conditions (JSON) ─────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="ff-conditions">
              Conditions <span className="text-xs text-gray-500">(JSON object)</span>
            </Label>
            <Textarea
              id="ff-conditions"
              {...register('conditionsJson')}
              placeholder='{"plan": "premium", "region": "mena"}'
              rows={3}
              className="font-mono text-xs"
            />
            {errors.conditionsJson && (
              <p className="text-xs text-red-600">{errors.conditionsJson.message}</p>
            )}
          </div>

          {/* ── Value (JSON) ──────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="ff-value">
              Value <span className="text-xs text-gray-500">(any JSON value)</span>
            </Label>
            <Textarea
              id="ff-value"
              {...register('valueJson')}
              placeholder='{"maxItems": 10}'
              rows={3}
              className="font-mono text-xs"
            />
            {errors.valueJson && <p className="text-xs text-red-600">{errors.valueJson.message}</p>}
          </div>
          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? 'Saving…'
                  : 'Creating…'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Flag'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
