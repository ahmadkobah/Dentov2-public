import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Button,
  Separator,
  Card,
  CardContent,
} from '@dento/ui';
import { CheckCircle, XCircle, RefreshCw, Copy, Trash2 } from 'lucide-react';
import { toast } from '@dento/ui';
import type { Domain } from '../hooks/useDomains.js';
import { useVerifyDomain, useDeleteDomain } from '../hooks/useDomains.js';

interface DomainDetailSheetProps {
  domain: Domain | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sslBadgeVariant: Record<string, 'default' | 'destructive' | 'warning' | 'secondary'> = {
  active: 'default',
  pending: 'warning',
  expired: 'destructive',
  error: 'destructive',
};

export function DomainDetailSheet({ domain, open, onOpenChange }: DomainDetailSheetProps) {
  const verifyDomain = useVerifyDomain();
  const deleteDomain = useDeleteDomain();

  if (!domain) return null;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleVerify = () => {
    verifyDomain.mutate(domain._id, {
      onSuccess: () => toast.success('DNS verification triggered'),
      onError: () => toast.error('Verification failed'),
    });
  };

  const handleDelete = () => {
    deleteDomain.mutate(domain._id, {
      onSuccess: () => {
        toast.success('Domain removed');
        onOpenChange(false);
      },
      onError: () => toast.error('Failed to remove domain'),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {domain.customDomain}
            <Badge variant={domain.isActive ? 'default' : 'secondary'}>
              {domain.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Tenant: {domain.tenantSlug} • Created {new Date(domain.createdAt).toLocaleDateString()}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={verifyDomain.isPending}
              onClick={handleVerify}
            >
              <RefreshCw
                className={`me-1.5 h-4 w-4 ${verifyDomain.isPending ? 'animate-spin' : ''}`}
              />
              Verify DNS
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteDomain.isPending}
              onClick={handleDelete}
            >
              <Trash2 className="me-1.5 h-4 w-4" />
              Remove
            </Button>
          </div>

          <Separator />

          {/* Status info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="DNS Verified">
              {domain.dnsVerified ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" /> Yes
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500">
                  <XCircle className="h-4 w-4" /> No
                </span>
              )}
            </Detail>
            <Detail label="SSL Status">
              <Badge
                variant={sslBadgeVariant[domain.sslStatus] ?? 'secondary'}
                className="capitalize"
              >
                {domain.sslStatus}
              </Badge>
            </Detail>
            {domain.sslExpiresAt && (
              <Detail label="SSL Expires">
                {new Date(domain.sslExpiresAt).toLocaleDateString()}
              </Detail>
            )}
            {domain.verifiedAt && (
              <Detail label="Verified At">
                {new Date(domain.verifiedAt).toLocaleDateString()}
              </Detail>
            )}
          </div>

          <Separator />

          {/* DNS Records */}
          <div>
            <h4 className="mb-3 text-sm font-medium">Required DNS Records</h4>
            <div className="space-y-3">
              {domain.requiredRecords.map((record, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {record.type}
                          </Badge>
                          {record.verified ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Name:</span> {record.name}
                        </p>
                        <p className="text-xs text-gray-500 break-all">
                          <span className="font-medium">Value:</span> {record.value}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => copyText(record.value)}
                        title="Copy value"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
  );
}
