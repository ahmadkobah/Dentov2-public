import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Button,
  Separator,
} from '@dento/ui';
import { CheckCircle, XCircle, Copy } from 'lucide-react';
import { toast } from '@dento/ui';
import type { ErrorLog } from '../hooks/useErrorLogs.js';
import { useResolveError, useUnresolveError } from '../hooks/useResolveError.js';

interface ErrorDetailSheetProps {
  error: ErrorLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ErrorDetailSheet({ error, open, onOpenChange }: ErrorDetailSheetProps) {
  const resolve = useResolveError();
  const unresolve = useUnresolveError();

  if (!error) return null;

  const copyStack = () => {
    if (error.stack) {
      navigator.clipboard.writeText(error.stack);
      toast.success('Stack trace copied');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge
              variant={
                error.level === 'fatal' || error.level === 'error' ? 'destructive' : 'warning'
              }
              className="uppercase text-xs"
            >
              {error.level}
            </Badge>
            <span className="line-clamp-1">{error.message}</span>
          </SheetTitle>
          <SheetDescription>
            {error.occurrences} occurrence{error.occurrences !== 1 ? 's' : ''} — First seen{' '}
            {new Date(error.firstSeenAt).toLocaleString()} — Last seen{' '}
            {new Date(error.lastSeenAt).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Actions */}
          <div className="flex items-center gap-2">
            {error.resolved ? (
              <Button
                variant="outline"
                size="sm"
                disabled={unresolve.isPending}
                onClick={() => unresolve.mutate(error._id)}
              >
                <XCircle className="me-1.5 h-4 w-4" />
                Unresolve
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate(error._id)}
              >
                <CheckCircle className="me-1.5 h-4 w-4" />
                Resolve
              </Button>
            )}
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Source" value={error.source} />
            <Detail label="Status" value={error.resolved ? 'Resolved' : 'Open'} />
            {error.endpoint && (
              <Detail label="Endpoint" value={`${error.method ?? ''} ${error.endpoint}`} />
            )}
            {error.statusCode && <Detail label="Status Code" value={String(error.statusCode)} />}
            {error.tenantSlug && <Detail label="Tenant" value={error.tenantSlug} />}
            {error.requestId && <Detail label="Request ID" value={error.requestId} />}
            <Detail label="Fingerprint" value={error.fingerprint} />
          </div>

          {/* Stack trace */}
          {error.stack && (
            <>
              <Separator />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium">Stack Trace</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={copyStack}
                    aria-label="Copy stack trace"
                  >
                    <Copy className="me-1 h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs leading-relaxed text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  {error.stack}
                </pre>
              </div>
            </>
          )}

          {/* Request context */}
          {error.userAgent && (
            <>
              <Separator />
              <div className="text-sm">
                <h4 className="mb-2 font-medium">Request Context</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Detail label="User Agent" value={error.userAgent} />
                  {error.ip && <Detail label="IP Address" value={error.ip} />}
                </div>
              </div>
            </>
          )}

          {/* Metadata JSON */}
          {error.metadata && Object.keys(error.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-medium">Metadata</h4>
                <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  {JSON.stringify(error.metadata, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-all text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  );
}
