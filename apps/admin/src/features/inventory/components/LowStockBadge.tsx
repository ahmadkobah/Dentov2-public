/**
 * LowStockBadge — Color-coded stock-status badge.
 */

import { Badge } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';

interface LowStockBadgeProps {
  currentStock: number;
  reorderLevel: number;
  minimumStock?: number;
}

export function LowStockBadge({
  currentStock,
  reorderLevel,
  minimumStock = 0,
}: LowStockBadgeProps) {
  const { t } = useTranslation();
  if (currentStock <= 0) {
    return <Badge variant="destructive">{t('inventory.stockBadge.outOfStock')}</Badge>;
  }
  if (currentStock <= minimumStock) {
    return <Badge variant="destructive">{t('inventory.stockBadge.critical')}</Badge>;
  }
  if (currentStock <= reorderLevel) {
    return <Badge variant="warning">{t('inventory.stockBadge.lowStock')}</Badge>;
  }
  return <Badge variant="success">{t('inventory.stockBadge.inStock')}</Badge>;
}
