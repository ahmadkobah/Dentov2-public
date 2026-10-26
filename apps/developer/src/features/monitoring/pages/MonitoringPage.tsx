import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, PageHeader, StatCard } from '@dento/ui';
import { Activity, AlertTriangle, Bug, CheckCircle, Clock } from 'lucide-react';
import { useMonitoringStats } from '../hooks/useMonitoringStats.js';
import { ErrorTimelineChart } from '../components/ErrorTimelineChart.js';
import { RecentErrorsTable } from '../components/RecentErrorsTable.js';
import { ErrorDetailSheet } from '../components/ErrorDetailSheet.js';
import type { ErrorLog } from '../hooks/useErrorLogs.js';
import ErrorListPage from './ErrorListPage.js';
import HealthStatusPage from './HealthStatusPage.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { EmptyState } from '../../../components/EmptyState.js';

export default function MonitoringPage() {
  const [tab, setTab] = useState('overview');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: statsRefetch,
  } = useMonitoringStats(24);

  return (
    <div className="space-y-6">
      <PageHeader title="Monitoring" description="Real-time error tracking and system health" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        {/* ---- Overview Tab ---- */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {statsError && <QueryErrorBanner onRetry={() => statsRefetch()} />}

          {/* Empty State */}
          {!statsLoading && !statsError && !stats && (
            <EmptyState
              icon={Activity}
              title="No monitoring data"
              description="Monitoring metrics will populate once the system starts tracking."
            />
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Errors"
              value={stats?.totalErrors ?? 0}
              icon={<Bug className="h-5 w-5" />}
              variant="default"
            />
            <StatCard
              title="Unresolved"
              value={stats?.unresolvedCount ?? 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              variant={(stats?.unresolvedCount ?? 0) > 0 ? 'error' : 'success'}
              onClick={() => setTab('errors')}
            />
            <StatCard
              title="Last 24h"
              value={stats?.totalErrors ?? 0}
              icon={<Clock className="h-5 w-5" />}
              variant="default"
            />
            <StatCard
              title="Resolved"
              value={(stats?.totalErrors ?? 0) - (stats?.unresolvedCount ?? 0)}
              icon={<CheckCircle className="h-5 w-5" />}
              variant="success"
            />
          </div>

          {/* Error Timeline Chart */}
          <ErrorTimelineChart data={stats?.timeline ?? []} isLoading={statsLoading} />

          {/* Recent Errors Table */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Recent Errors</h3>
            <RecentErrorsTable filters={{ limit: 10 }} onSelectError={setSelectedError} />
          </div>
        </TabsContent>

        {/* ---- Errors Tab ---- */}
        <TabsContent value="errors" className="mt-6">
          <ErrorListPage onSelectError={setSelectedError} />
        </TabsContent>

        {/* ---- Health Tab ---- */}
        <TabsContent value="health" className="mt-6">
          <HealthStatusPage />
        </TabsContent>
      </Tabs>

      {/* Error Detail Sheet */}
      <ErrorDetailSheet
        error={selectedError}
        open={!!selectedError}
        onOpenChange={(open) => !open && setSelectedError(null)}
      />
    </div>
  );
}
