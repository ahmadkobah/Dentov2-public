import { Button, Card, CardContent } from '@dento/ui';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface QueryErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryErrorBanner({
  message = 'Failed to load data. Please try again.',
  onRetry,
}: QueryErrorBannerProps) {
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
      <CardContent className="flex items-center gap-3 p-4">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <p className="flex-1 text-sm text-red-700 dark:text-red-300">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
            <RefreshCw className="me-2 h-3 w-3" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
