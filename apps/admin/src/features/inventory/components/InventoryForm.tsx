/**
 * InventoryForm — Shared form for creating / editing an inventory item.
 * Rendered inside a Dialog from the list / form page.
 */

import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@dento/ui';
import { Loader2 } from 'lucide-react';
import { useInventoryCategories, type InventoryItem } from '../hooks/useInventoryItems.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '../../../stores/locale.store.js';

const UNIT_TYPES = [
  'piece',
  'box',
  'pack',
  'bottle',
  'tube',
  'roll',
  'sheet',
  'ml',
  'g',
  'kg',
  'liter',
  'pair',
] as const;

const inventoryFormSchema = z.object({
  name: z.object({
    en: z.string().min(1, 'Name (English) is required'),
    ar: z.string().optional().default(''),
  }),
  sku: z.string().min(1, 'SKU is required'),
  categoryId: z.string().optional().default(''),
  description: z.object({ en: z.string().optional().default('') }).optional(),
  unitOfMeasure: z.string().default('piece'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be ≥ 0'),
  sellingPrice: z.coerce.number().min(0).optional().default(0),
  minimumStock: z.coerce.number().int().min(0).optional().default(5),
  maximumStock: z.coerce.number().int().min(0).optional().default(0),
  barcode: z.string().optional().default(''),
  manufacturer: z.string().optional().default(''),
  isConsumable: z.boolean().optional().default(true),
  trackBatches: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

/**
 * Transform frontend form data to API-expected field names.
 * The API Zod schema uses .strict() and expects flat fields like
 * nameEn/nameAr instead of name.en/name.ar.
 */
export function transformFormToApi(data: Record<string, any>): Record<string, any> {
  const { name, description, unitOfMeasure, minimumStock, maximumStock, trackBatches, ...rest } =
    data;
  return {
    ...rest,
    nameEn: name?.en ?? '',
    nameAr: name?.ar ?? '',
    description: typeof description === 'object' ? (description?.en ?? '') : (description ?? ''),
    unit: unitOfMeasure ?? 'piece',
    minStockLevel: minimumStock ?? 0,
    maxStockLevel: maximumStock ?? 0,
  };
}

interface InventoryFormProps {
  defaultValues?: Partial<InventoryItem>;
  onSubmit: (data: Partial<InventoryItem>) => void;
  isPending?: boolean;
  mode?: 'create' | 'edit';
  /** When true, renders plain headings instead of Dialog* components */
  standalone?: boolean;
  /** Current stock for display in edit mode */
  currentStock?: number;
  /** Callback when stock quantity is changed in edit mode */
  onStockChange?: (quantity: number) => void;
}

export function InventoryForm({
  defaultValues,
  onSubmit,
  isPending = false,
  mode = 'create',
  standalone = false,
  currentStock,
  onStockChange,
}: InventoryFormProps) {
  const dv = defaultValues as Record<string, any> | undefined;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Partial<InventoryItem>>({
    resolver: zodFormResolver(inventoryFormSchema),
    defaultValues: {
      unitCost: 0,
      isActive: true,
      isConsumable: true,
      trackBatches: false,
      ...defaultValues,
      // Map API field names → form field names
      unitOfMeasure: dv?.unitOfMeasure ?? dv?.unit ?? 'piece',
      minimumStock: dv?.minimumStock ?? dv?.minStockLevel ?? 5,
      maximumStock: dv?.maximumStock ?? dv?.maxStockLevel ?? 0,
      description:
        typeof dv?.description === 'string'
          ? { en: dv.description }
          : (dv?.description ?? { en: '' }),
      // Extract _id from populated categoryId object
      categoryId:
        typeof defaultValues?.categoryId === 'object' && defaultValues?.categoryId
          ? (defaultValues.categoryId as { _id: string })._id
          : ((defaultValues?.categoryId as string) ?? ''),
    },
  });

  const { isMultiLang } = useSupportedLanguages();
  const { t } = useTranslation();
  const { data: categories } = useInventoryCategories();

  const title = mode === 'create' ? t('inventory.form.createTitle') : t('inventory.form.editTitle');
  const description =
    mode === 'create' ? t('inventory.form.createDescription') : t('inventory.form.editDescription');

  return (
    <>
      {standalone ? (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      ) : (
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className={standalone ? 'space-y-4' : 'mt-4 max-h-[60vh] space-y-4 overflow-y-auto pe-2'}
      >
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t('inventory.form.labels.nameEn')}</Label>
            <Input id="name" aria-describedby="name-error" {...register('name.en')} />
            {errors.name && (
              <p id="name-error" className="text-xs text-destructive">
                {(errors.name as any).en?.message}
              </p>
            )}
          </div>
          {isMultiLang && (
            <div className="space-y-1">
              <Label htmlFor="nameAr">{t('inventory.form.labels.nameAr')}</Label>
              <Input id="nameAr" dir="rtl" {...register('name.ar')} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="sku">{t('inventory.form.labels.sku')}</Label>
            <Input id="sku" aria-describedby="sku-error" {...register('sku')} />
            {errors.sku && (
              <p id="sku-error" className="text-xs text-destructive">
                {errors.sku.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="barcode">{t('inventory.form.labels.barcode')}</Label>
            <Input id="barcode" {...register('barcode')} />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <Label>{t('inventory.form.labels.category')}</Label>
          <Select
            value={(watch('categoryId') as string) || ''}
            onValueChange={(v) => setValue('categoryId', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('inventory.form.placeholders.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unit & Pricing */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>{t('inventory.form.labels.unitOfMeasure')}</Label>
            <Select
              value={watch('unitOfMeasure') || 'piece'}
              onValueChange={(v) => setValue('unitOfMeasure', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="unitCost">{t('inventory.form.labels.unitCost')}</Label>
            <Input
              id="unitCost"
              type="number"
              step="0.01"
              {...register('unitCost', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sellingPrice">{t('inventory.form.labels.sellingPrice')}</Label>
            <Input
              id="sellingPrice"
              type="number"
              step="0.01"
              {...register('sellingPrice', { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Stock Settings */}
        <div className="grid grid-cols-3 gap-4">
          {mode === 'edit' && (
            <div className="space-y-1">
              <Label htmlFor="stockQty">{t('inventory.form.labels.stockQuantity')}</Label>
              <Input
                id="stockQty"
                type="number"
                min={0}
                defaultValue={currentStock ?? 0}
                onChange={(e) => onStockChange?.(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Current: {currentStock ?? 0}</p>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="minStock">{t('inventory.form.labels.minStock')}</Label>
            <Input
              id="minStock"
              type="number"
              {...register('minimumStock', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="maxStock">{t('inventory.form.labels.maxStock')}</Label>
            <Input
              id="maxStock"
              type="number"
              {...register('maximumStock', { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Flags */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isConsumable')} className="accent-primary" />
            {t('inventory.form.labels.consumable')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('trackBatches')} className="accent-primary" />
            {t('inventory.form.labels.trackBatches')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isActive')} className="accent-primary" />
            {t('inventory.form.labels.active')}
          </label>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label htmlFor="desc">{t('inventory.form.labels.description')}</Label>
          <Textarea id="desc" rows={2} {...register('description.en')} />
        </div>

        {standalone ? (
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'create'
                ? t('inventory.form.actions.createItem')
                : t('inventory.form.actions.saveChanges')}
            </Button>
          </div>
        ) : (
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'create'
                ? t('inventory.form.actions.createItem')
                : t('inventory.form.actions.saveChanges')}
            </Button>
          </DialogFooter>
        )}
      </form>
    </>
  );
}
