/**
 * StockTransferForm — Form for creating a stock transfer between branches.
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
import { useTranslation } from '../../../stores/locale.store.js';

interface TransferFormValues {
  fromBranchId: string;
  toBranchId: string;
  notes?: string;
  items: Array<{ itemId: string; quantity: number }>;
}

interface StockTransferFormProps {
  branches: Array<{ _id: string; name: { en: string } }>;
  onSubmit: (data: TransferFormValues) => void;
  isPending?: boolean;
}

const transferFormSchema = z.object({
  fromBranchId: z.string().min(1, 'Source branch is required'),
  toBranchId: z.string().min(1, 'Destination branch is required'),
  notes: z.string().optional().default(''),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Item is required'),
        quantity: z.coerce.number().int().min(1, 'Qty must be ≥ 1'),
      }),
    )
    .min(1, 'At least one item is required'),
});

export function StockTransferForm({
  branches,
  onSubmit,
  isPending = false,
}: StockTransferFormProps) {
  const { register, handleSubmit, control, watch, setValue } = useForm<TransferFormValues>({
    resolver: zodFormResolver(transferFormSchema),
    defaultValues: {
      fromBranchId: '',
      toBranchId: '',
      items: [{ itemId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const { data: itemsData } = useInventoryItemList({ limit: 100 });
  const { t } = useTranslation();
  const watchItems = watch('items');

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('inventory.transferForm.title')}</DialogTitle>
        <DialogDescription>{t('inventory.transferForm.description')}</DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pe-2"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>{t('inventory.transferForm.labels.fromBranch')}</Label>
            <Select
              value={watch('fromBranchId')}
              onValueChange={(v) => setValue('fromBranchId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('inventory.transferForm.placeholders.selectBranch')} />
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
            <Label>{t('inventory.transferForm.labels.toBranch')}</Label>
            <Select value={watch('toBranchId')} onValueChange={(v) => setValue('toBranchId', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('inventory.transferForm.placeholders.selectBranch')} />
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
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <Label>{t('inventory.transferForm.labels.itemsToTransfer')}</Label>
          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-[1fr_80px_32px] items-end gap-2">
              <Select
                value={watchItems[idx]?.itemId || ''}
                onValueChange={(v) => setValue(`items.${idx}.itemId`, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inventory.transferForm.placeholders.selectItem')} />
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
                placeholder={t('inventory.transferForm.placeholders.qty')}
                min={1}
                {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(idx)}
                disabled={fields.length === 1}
                aria-label={t('inventory.transferForm.actions.removeItem')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ itemId: '', quantity: 1 })}
            className="gap-1"
          >
            <Plus className="h-3 w-3" /> {t('inventory.transferForm.actions.addItem')}
          </Button>
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes">{t('inventory.transferForm.labels.notes')}</Label>
          <Textarea id="notes" rows={2} {...register('notes')} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('inventory.transferForm.actions.createTransfer')}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
