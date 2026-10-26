import { useState } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PageHeader,
  StatCard,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@dento/ui';
import { Shield, AlertTriangle, Activity, Zap, Pencil } from 'lucide-react';
import {
  useRateLimitAnalytics,
  useRateLimitViolations,
  useUpdateRateLimit,
} from '../hooks/useRateLimits.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { EmptyState } from '../../../components/EmptyState.js';

export default function RateLimitsPage() {
  const [tab, setTab] = useState('overview');
  const [tierFilter, setTierFilter] = useState('all');
  const [editTier, setEditTier] = useState<{
    tier: string;
    max: number;
    timeWindow: string;
  } | null>(null);
  const [editMax, setEditMax] = useState('');
  const [editWindow, setEditWindow] = useState('1 minute');
  const updateRateLimit = useUpdateRateLimit();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: analyticsRefetch,
  } = useRateLimitAnalytics(tierFilter);
  const {
    data: violations,
    isLoading: violationsLoading,
    isError: violationsError,
    refetch: violationsRefetch,
  } = useRateLimitViolations();

  function openEdit(tier: string, max: number, timeWindow: string) {
    setEditTier({ tier, max, timeWindow });
    setEditMax(String(max));
    setEditWindow(timeWindow);
  }

  function handleSave() {
    if (!editTier) return;
    const max = parseInt(editMax, 10);
    if (!max || max < 1 || max > 10000) {
      toast.error('Max must be between 1 and 10,000');
      return;
    }
    updateRateLimit.mutate(
      { tier: editTier.tier, max, timeWindow: editWindow },
      {
        onSuccess: () => {
          toast.success(`${editTier.tier} rate limit updated to ${max}/${editWindow}`);
          setEditTier(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to update rate limit');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rate Limits"
        description="Monitor rate-limit usage, active keys, and violations across all tiers"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">
            Violations
            {(violations?.total ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {violations?.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---- Overview Tab ---- */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {analyticsError && <QueryErrorBanner onRetry={() => analyticsRefetch()} />}

          {!analyticsLoading && !analyticsError && !analytics && (
            <EmptyState
              icon={Shield}
              title="No rate limit data"
              description="Rate limit metrics will appear once requests start flowing through the API."
            />
          )}

          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Active Keys"
              value={analytics?.summary.totalActiveKeys ?? 0}
              icon={<Activity className="h-5 w-5" />}
              variant="default"
            />
            <StatCard
              title="Blocked Keys"
              value={analytics?.summary.totalBlockedKeys ?? 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              variant={(analytics?.summary.totalBlockedKeys ?? 0) > 0 ? 'error' : 'success'}
            />
            <StatCard
              title="Tiers Monitored"
              value={analytics?.summary.tiersScanned ?? 0}
              icon={<Shield className="h-5 w-5" />}
              variant="default"
            />
          </div>

          {/* Tier Filter */}
          <div className="flex gap-2">
            {['all', 'global', 'auth', 'api_key', 'public', 'webhook', 'upload'].map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tierFilter === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t === 'all' ? 'All Tiers' : t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Per-Tier Cards */}
          {analyticsLoading && (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {analytics?.tiers.map((tier) => (
              <Card key={tier.tier}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">
                      {tier.tier.replace('_', ' ')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={tier.blockedKeys > 0 ? 'destructive' : 'secondary'}>
                        {tier.config.max}/{tier.config.timeWindow}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(tier.tier, tier.config.max, tier.config.timeWindow)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {tier.activeKeys} active · {tier.blockedKeys} blocked
                  </p>
                </CardHeader>
                <CardContent>
                  {tier.topConsumers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No active consumers</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs font-medium uppercase">
                        Top Consumers
                      </p>
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {tier.topConsumers.slice(0, 10).map((consumer) => (
                          <div
                            key={consumer.key}
                            className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted/50"
                          >
                            <span className="max-w-[200px] truncate font-mono text-xs">
                              {consumer.key}
                            </span>
                            <div className="flex items-center gap-2">
                              <span>
                                {consumer.count}/{consumer.max}
                              </span>
                              {consumer.blocked && (
                                <Badge variant="destructive" className="text-xs">
                                  blocked
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---- Violations Tab ---- */}
        <TabsContent value="violations" className="mt-6 space-y-6">
          {violationsError && <QueryErrorBanner onRetry={() => violationsRefetch()} />}

          {!violationsLoading && !violationsError && (violations?.total ?? 0) === 0 && (
            <EmptyState
              icon={Zap}
              title="No active violations"
              description="All clients are within their rate limits. Violations will appear here when keys exceed their configured maximum."
            />
          )}

          {violationsLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          )}

          {(violations?.total ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Violations ({violations?.total ?? 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {violations?.violations.map((v, idx) => (
                    <div
                      key={`${v.tier}-${v.key}-${idx}`}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="space-y-1">
                        <p className="font-mono text-sm">{v.key}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {v.tier.replace('_', ' ')}
                          </Badge>
                          <span className="text-muted-foreground text-xs">Resets in {v.ttl}s</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-destructive">
                          {v.count}/{v.max}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {Math.round(((v.count - v.max) / v.max) * 100)}% over
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Rate Limit Dialog */}
      <Dialog open={!!editTier} onOpenChange={(open) => !open && setEditTier(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="capitalize">
              Edit {editTier?.tier.replace('_', ' ')} Rate Limit
            </DialogTitle>
            <DialogDescription>
              Change the maximum requests allowed within the time window.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-max">Max Requests</Label>
              <Input
                id="edit-max"
                type="number"
                min={1}
                max={10000}
                value={editMax}
                onChange={(e) => setEditMax(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Time Window</Label>
              <Select value={editWindow} onValueChange={setEditWindow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 minute">1 minute</SelectItem>
                  <SelectItem value="5 minutes">5 minutes</SelectItem>
                  <SelectItem value="15 minutes">15 minutes</SelectItem>
                  <SelectItem value="1 hour">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTier(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateRateLimit.isPending}>
              {updateRateLimit.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
