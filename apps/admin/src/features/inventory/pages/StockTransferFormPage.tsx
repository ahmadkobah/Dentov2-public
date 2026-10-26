/**
 * StockTransferFormPage — Create a new stock transfer.
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Button, toast } from '@dento/ui';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client.js';
import { useCreateStockTransfer } from '../hooks/useStockTransfers.js';
import { StockTransferForm } from '../components/StockTransferForm.js';
import { useTranslation } from '../../../stores/locale.store.js';

export default function StockTransferFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createMutation = useCreateStockTransfer();

  // Fetch branches for the picker
  const { data: branchesData, isError: branchesError } = useQuery({
    queryKey: ['branches', 'list'],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: { branches: Array<{ _id: string; name: { en: string } }> };
      }>('/api/branches'),
    select: (res) => res.data.branches,
  });

  const handleSubmit = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success(t('inventory.transferFormPage.toast.created'));
        navigate('/inventory/transfers');
      },
      onError: (err: any) =>
        toast.error(err?.message || t('inventory.transferFormPage.toast.createFailed')),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('inventory.transferFormPage.title')}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/inventory/transfers')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> {t('inventory.transferFormPage.actions.back')}
        </Button>
      </PageHeader>

      {branchesError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-8 text-center text-sm text-destructive">
          {t('inventory.transferFormPage.error.branchesFailed')}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <StockTransferForm
            branches={branchesData || []}
            onSubmit={handleSubmit}
            isPending={createMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}
