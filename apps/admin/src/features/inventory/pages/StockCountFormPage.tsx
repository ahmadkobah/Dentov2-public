/**
 * StockCountFormPage — Create a new stock count.
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Button, toast } from '@dento/ui';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client.js';
import { StockCountForm } from '../components/StockCountForm.js';
import { useCreateStockCount } from '../hooks/useStockCounts.js';
import { useTranslation } from '../../../stores/locale.store.js';

export default function StockCountFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: branches, isError: branchesError } = useQuery({
    queryKey: ['branches', 'list'],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: { branches: Array<{ _id: string; name: { en: string } }> };
      }>('/api/branches'),
    select: (res) => res.data.branches,
  });

  const createMutation = useCreateStockCount();

  const handleSubmit = (data: unknown) => {
    createMutation.mutate(data as Record<string, unknown>, {
      onSuccess: () => {
        toast.success(t('inventory.countFormPage.toast.created'));
        navigate('/inventory/stock-count');
      },
      onError: (err: any) =>
        toast.error(err?.message || t('inventory.countFormPage.toast.createFailed')),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('inventory.countFormPage.title')}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/inventory/stock-count')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> {t('inventory.countFormPage.actions.back')}
        </Button>
      </PageHeader>

      {branchesError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-8 text-center text-sm text-destructive">
          {t('inventory.countFormPage.error.branchesFailed')}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <StockCountForm
            branches={branches || []}
            onSubmit={handleSubmit}
            isPending={createMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}
