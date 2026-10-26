/**
 * ExpiryDashboardPage — Expiry status overview + batch table with dispose action.
 */

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@dento/ui';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { apiClient } from '@/lib/api-client.js';
import { ExpiryDashboard } from '../components/ExpiryDashboard.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface ExpiryBatch {
  _id: string;
  itemId: string;
  itemName: string;
  sku: string;
  branchId: string;
  branchName: string;
  batchNumber?: string;
  expiryDate: string;
  quantity: number;
}

export default function ExpiryDashboardPage() {
  const { t } = useTranslation();
  const {
    data: batches,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inventory-stock', 'expiry'],
    queryFn: () =>
      apiClient.get<{ success: true; data: { batches: ExpiryBatch[] } }>(
        '/api/inventory-stock/expiry',
      ),
    select: (res) => res.data.batches,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.expiryDashboard.page.title')}
        description={t('inventory.expiryDashboard.page.description')}
      />

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={refetch} />
      ) : (
        <ExpiryDashboard batches={batches || []} />
      )}
    </div>
  );
}
