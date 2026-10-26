/**
 * InventoryFormPage — Create / edit form page for inventory items.
 * Uses :id param for edit mode.
 */

import { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Button, toast } from '@dento/ui';
import { ArrowLeft } from 'lucide-react';
import {
  useInventoryItemDetail,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useAdjustStock,
  type InventoryItem,
} from '../hooks/useInventoryItems.js';
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
import { InventoryForm, transformFormToApi } from '../components/InventoryForm.js';
import { useTranslation } from '../../../stores/locale.store.js';

export default function InventoryFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: item, isLoading, isError } = useInventoryItemDetail(id || '');
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem(id || '');
  const adjustStockMutation = useAdjustStock();
  const { data: branchesData } = useActiveBranches();

  const stockQuantityRef = useRef<number | null>(null);

  const handleSubmit = (data: Partial<InventoryItem>) => {
    const apiData = transformFormToApi(data as Record<string, any>);

    const afterSave = () => {
      // If stock quantity was changed in edit mode, adjust stock too
      const newQty = stockQuantityRef.current;
      if (isEdit && newQty !== null && newQty !== (item?.currentStock ?? 0)) {
        const branches = (branchesData as any)?.branches ?? branchesData ?? [];
        const branchId = branches[0]?._id;
        if (branchId) {
          adjustStockMutation.mutate(
            { itemId: id!, branchId, quantity: newQty, reason: 'Updated via edit form' },
            {
              onSuccess: () => {
                toast.success(t('inventory.formPage.toast.updatedWithStock'));
                navigate('/inventory');
              },
              onError: (err: any) => {
                toast.error(err?.message || t('inventory.formPage.toast.savedButStockFailed'));
                navigate('/inventory');
              },
            },
          );
          return;
        }
      }
      toast.success(
        isEdit ? t('inventory.formPage.toast.updated') : t('inventory.formPage.toast.created'),
      );
      navigate('/inventory');
    };

    if (isEdit) {
      updateMutation.mutate(apiData as Partial<InventoryItem>, {
        onSuccess: afterSave,
        onError: (err: any) =>
          toast.error(err?.message || t('inventory.formPage.toast.updateFailed')),
      });
    } else {
      createMutation.mutate(apiData as Partial<InventoryItem>, {
        onSuccess: afterSave,
        onError: (err: any) =>
          toast.error(err?.message || t('inventory.formPage.toast.createFailed')),
      });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isEdit && isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-8 text-center text-sm text-destructive">
          {t('inventory.formPage.error.loadFailed')}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={isEdit ? t('inventory.formPage.editTitle') : t('inventory.formPage.newTitle')}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/inventory')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> {t('inventory.formPage.actions.back')}
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card p-6">
        <InventoryForm
          defaultValues={item as Partial<InventoryItem> | undefined}
          onSubmit={handleSubmit}
          isPending={
            isEdit
              ? updateMutation.isPending || adjustStockMutation.isPending
              : createMutation.isPending
          }
          mode={isEdit ? 'edit' : 'create'}
          standalone
          currentStock={item?.currentStock ?? 0}
          onStockChange={(qty) => {
            stockQuantityRef.current = qty;
          }}
        />
      </div>
    </div>
  );
}
