/**
 * WorkflowsPage — Phase 5.1
 * List + toggle + delete + view executions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@dento/ui';
import { Plus, Power, Pencil, Trash2, Activity } from 'lucide-react';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { useTranslation } from '@/stores/locale.store.js';
import {
  useWorkflowList,
  useToggleWorkflow,
  useDeleteWorkflow,
  useWorkflowExecutions,
  type Workflow,
} from '../hooks/useWorkflows.js';

function StatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();

  return (
    <Badge variant={active ? 'default' : 'secondary'} className="capitalize">
      {active ? t('workflows.status.active', 'Active') : t('workflows.status.disabled', 'Disabled')}
    </Badge>
  );
}

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useWorkflowList({ limit: 100 });
  const toggle = useToggleWorkflow();
  const del = useDeleteWorkflow();

  async function handleToggle(w: Workflow) {
    try {
      await toggle.mutateAsync({ id: w._id, isActive: !w.isActive });
      toast.success(
        w.isActive
          ? t('workflows.disabledToast', 'Workflow disabled')
          : t('workflows.enabledToast', 'Workflow enabled'),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('workflows.failed', 'Failed'));
    }
  }

  async function handleDelete(w: Workflow) {
    const message = t(
      'workflows.deleteConfirm',
      'Delete workflow "{{name}}"? This cannot be undone.',
    ).replace('{{name}}', w.name.en);
    if (!confirm(message)) return;
    try {
      await del.mutateAsync(w._id);
      toast.success(t('workflows.deletedToast', 'Workflow deleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('workflows.failed', 'Failed'));
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('workflows.title', 'Workflows')}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              'workflows.subtitle',
              'Event-driven automation rules. Trigger → Conditions → Actions.',
            )}
          </p>
        </div>
        <Button onClick={() => navigate('/workflows/new')}>
          <Plus className="me-2 h-4 w-4" /> {t('workflows.new', 'New workflow')}
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">{t('workflows.rules', 'Rules')}</TabsTrigger>
          <TabsTrigger value="executions">{t('workflows.executions', 'Executions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          {isLoading && <TableSkeleton columns={5} rows={6} />}
          {isError && (
            <ErrorState
              title={t('workflows.failedLoad', 'Failed to load workflows')}
              message={error?.message}
              onRetry={refetch}
            />
          )}
          {!isLoading && !isError && (data?.workflows.length ?? 0) === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t(
                'workflows.empty',
                'No workflows yet. Create your first one to automate your clinic.',
              )}
            </div>
          )}
          {!isLoading && !isError && (data?.workflows.length ?? 0) > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-start">
                  <tr>
                    <th className="px-3 py-2">{t('workflows.name', 'Name')}</th>
                    <th className="px-3 py-2">{t('workflows.trigger', 'Trigger')}</th>
                    <th className="px-3 py-2">{t('workflows.actions', 'Actions')}</th>
                    <th className="px-3 py-2">{t('workflows.priority', 'Priority')}</th>
                    <th className="px-3 py-2">{t('workflows.status', 'Status')}</th>
                    <th className="px-3 py-2 text-end">{t('workflows.manage', 'Manage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.workflows.map((w) => (
                    <tr key={w._id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{w.name.en}</div>
                        {w.description?.en && (
                          <div className="text-xs text-muted-foreground">{w.description.en}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{w.trigger}</code>
                      </td>
                      <td className="px-3 py-2">{w.actions.length}</td>
                      <td className="px-3 py-2">{w.priority}</td>
                      <td className="px-3 py-2">
                        <StatusBadge active={w.isActive} />
                      </td>
                      <td className="px-3 py-2 text-end">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggle(w)}
                            aria-label={
                              w.isActive
                                ? t('workflows.disable', 'Disable')
                                : t('workflows.enable', 'Enable')
                            }
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/workflows/${w._id}`)}
                            aria-label={t('workflows.edit', 'Edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(w)}
                            aria-label={t('workflows.delete', 'Delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="executions" className="mt-4">
          <ExecutionsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExecutionsList() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useWorkflowExecutions(undefined, page, 25);

  if (isLoading) return <TableSkeleton columns={5} rows={6} />;
  if (isError)
    return (
      <ErrorState
        title={t('workflows.failedLoadExecutions', 'Failed to load executions')}
        message={error?.message}
        onRetry={refetch}
      />
    );

  if ((data?.executions.length ?? 0) === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
        {t('workflows.emptyExecutions', 'No executions recorded yet.')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-start">
            <tr>
              <th className="px-3 py-2">{t('workflows.trigger', 'Trigger')}</th>
              <th className="px-3 py-2">{t('workflows.status', 'Status')}</th>
              <th className="px-3 py-2">{t('workflows.started', 'Started')}</th>
              <th className="px-3 py-2">{t('workflows.duration', 'Duration')}</th>
              <th className="px-3 py-2">{t('workflows.error', 'Error')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.executions.map((e) => (
              <tr key={e._id} className="border-t">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.trigger}</code>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={
                      e.status === 'success'
                        ? 'default'
                        : e.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {t(`workflows.execution.${e.status}`, e.status)}
                  </Badge>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {e.startedAt ? new Date(e.startedAt).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2">{e.durationMs ? `${e.durationMs} ms` : '—'}</td>
                <td className="px-3 py-2 text-destructive">{e.errorMessage ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('workflows.previous', 'Prev')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t('workflows.pageOf', 'Page {{page}} of {{total}}')
              .replace('{{page}}', String(page))
              .replace('{{total}}', String(data.pagination.totalPages))}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('workflows.next', 'Next')}
          </Button>
        </div>
      )}
    </div>
  );
}
