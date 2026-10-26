/**
 * StockAdjustmentDialog — Modal for manual stock adjustment.
 */

import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  toast,
} from '@dento/ui';
import { Loader2 } from 'lucide-react';
import { useAdjustStock } from '../hooks/useInventoryStock.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  branchId: string;
  currentQuantity: number;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
  branchId,
  currentQuantity,
}: StockAdjustmentDialogProps) {
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState('');
  const adjustMutation = useAdjustStock();
  const { t } = useTranslation();

  const handleSubmit = () => {
    if (!adjustment || !reason.trim()) {
      toast.error(t('inventory.stockAdjustment.toast.enterAdjustment'));
      return;
    }

    adjustMutation.mutate(
      { itemId, branchId, adjustment, reason },
      {
        onSuccess: () => {
          toast.success(t('inventory.stockAdjustment.toast.adjusted'));
          onOpenChange(false);
          setAdjustment(0);
          setReason('');
        },
        onError: (err: any) => {
          toast.error(err?.message || t('inventory.stockAdjustment.toast.adjustFailed'));
        },
      },
    );
  };

  const newQuantity = currentQuantity + adjustment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inventory.stockAdjustment.title')}</DialogTitle>
          <DialogDescription>{itemName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm text-muted-foreground">
              {t('inventory.stockAdjustment.currentQty')}
            </span>
            <span className="font-semibold">{currentQuantity}</span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="adj">{t('inventory.stockAdjustment.adjustmentLabel')}</Label>
            <Input
              id="adj"
              type="number"
              value={adjustment}
              onChange={(e) => setAdjustment(Number(e.target.value))}
              placeholder={t('inventory.stockAdjustment.placeholders.adjustment')}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm text-muted-foreground">
              {t('inventory.stockAdjustment.newQty')}
            </span>
            <span className={`font-semibold ${newQuantity < 0 ? 'text-destructive' : ''}`}>
              {newQuantity}
            </span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason">{t('inventory.stockAdjustment.reasonLabel')}</Label>
            <Textarea
              id="reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('inventory.stockAdjustment.placeholders.reason')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('inventory.stockAdjustment.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={adjustMutation.isPending || newQuantity < 0}
            className="gap-2"
          >
            {adjustMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('inventory.stockAdjustment.applyAdjustment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
