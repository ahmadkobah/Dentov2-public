/**
 * StockCountForm — Form for creating a stock count (physical inventory).
 */

import { useForm, useFieldArray } from 'react-hook-form';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useInventoryItemList } from '../hooks/useInventoryItems.js';
import { BarcodeScanner } from './BarcodeScanner.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface CountFormValues {
  branchId: string;
  type: 'full' | 'partial' | 'cycle';
  notes?: string;
  items: Array<{ itemId: string; expectedQuantity: number; countedQuantity: number }>;
}

interface StockCountFormProps {
  branches: Array<{ _id: string; name: { en: string } }>;
  onSubmit: (data: CountFormValues) => void;
  isPending?: boolean;
}

const countFormSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  type: z.enum(['full', 'partial', 'cycle']),
  notes: z.string().optional().default(''),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Item is required'),
        expectedQuantity: z.coerce.number().int().min(0),
        countedQuantity: z.coerce.number().int().min(0, 'Counted qty must be ≥ 0'),
      }),
    )
    .min(1, 'At least one item is required'),
});

export function StockCountForm({ branches, onSubmit, isPending = false }: StockCountFormProps) {
  const { register, handleSubmit, control, watch, setValue } = useForm<CountFormValues>({
    resolver: zodFormResolver(countFormSchema),
    defaultValues: {
      branchId: '',
      type: 'partial',
      items: [{ itemId: '', expectedQuantity: 0, countedQuantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const { data: itemsData } = useInventoryItemList({ limit: 200 });
  const { t } = useTranslation();
  const watchItems = watch('items');

  const handleBarcodeScan = (code: string) => {
    const found = itemsData?.items.find((i) => i.barcode === code || i.sku === code);
    if (found) {
      // Check if already in list
      const existingIdx = watchItems.findIndex((wi) => wi.itemId === found._id);
      if (existingIdx >= 0) {
        // Increment counted quantity
        const current = watchItems[existingIdx].countedQuantity || 0;
        setValue(`items.${existingIdx}.countedQuantity`, current + 1);
      } else {
        append({
          itemId: found._id,
          expectedQuantity: found.currentStock || 0,
          countedQuantity: 1,
        });
      }
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('inventory.countForm.title')}</DialogTitle>
        <DialogDescription>{t('inventory.countForm.description')}</DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pe-2"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>{t('inventory.countForm.labels.branch')}</Label>
            <Select value={watch('branchId')} onValueChange={(v) => setValue('branchId', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('inventory.countForm.placeholders.selectBranch')} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('inventory.countForm.labels.countType')}</Label>
            <Select
              value={watch('type')}
              onValueChange={(v) => setValue('type', v as CountFormValues['type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">
                  {t('inventory.countForm.countTypes.fullCount')}
                </SelectItem>
                <SelectItem value="partial">
                  {t('inventory.countForm.countTypes.partialCount')}
                </SelectItem>
                <SelectItem value="cycle">
                  {t('inventory.countForm.countTypes.cycleCount')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <BarcodeScanner onScan={handleBarcodeScan} />

        {/* Count Items */}
        <div className="space-y-2">
          <Label>{t('inventory.countForm.labels.itemsToCount')}</Label>
          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-[1fr_80px_80px_32px] items-end gap-2">
              <Select
                value={watchItems[idx]?.itemId || ''}
                onValueChange={(v) => setValue(`items.${idx}.itemId`, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inventory.countForm.placeholders.selectItem')} />
                </SelectTrigger>
                <SelectContent>
                  {itemsData?.items.map((i) => (
                    <SelectItem key={i._id} value={i._id}>
                      {i.name.en} ({i.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder={t('inventory.countForm.placeholders.expected')}
                {...register(`items.${idx}.expectedQuantity`, { valueAsNumber: true })}
                disabled
              />
              <Input
                type="number"
                placeholder={t('inventory.countForm.placeholders.counted')}
                min={0}
                {...register(`items.${idx}.countedQuantity`, { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(idx)}
                disabled={fields.length === 1}
                aria-label={t('inventory.countForm.actions.removeItem')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ itemId: '', expectedQuantity: 0, countedQuantity: 0 })}
            className="gap-1"
          >
            <Plus className="h-3 w-3" /> {t('inventory.countForm.actions.addItem')}
          </Button>
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes">{t('inventory.countForm.labels.notes')}</Label>
          <Textarea id="notes" rows={2} {...register('notes')} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('inventory.countForm.actions.submitCount')}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
