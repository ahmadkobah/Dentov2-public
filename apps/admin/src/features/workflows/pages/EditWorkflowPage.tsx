/**
 * EditWorkflowPage — Phase 5.2
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@dento/ui';
import { ArrowLeft } from 'lucide-react';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { WorkflowForm } from '../components/WorkflowForm.js';
import { useWorkflow, useUpdateWorkflow, type CreateWorkflowInput } from '../hooks/useWorkflows.js';

export default function EditWorkflowPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: workflow, isLoading, isError, error: loadError, refetch } = useWorkflow(id);
  const update = useUpdateWorkflow();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreateWorkflowInput) {
    if (!id) return;
    setError(null);
    try {
      // Trigger is immutable on update; strip it.
      const { trigger: _trigger, ...rest } = data;
      void _trigger;
      await update.mutateAsync({ id, data: rest });
      toast.success('Workflow updated');
      navigate('/workflows');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update workflow';
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
          <ArrowLeft className="me-1 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Edit workflow</h1>
      </div>

      {isLoading && <TableSkeleton columns={3} rows={6} />}
      {isError && (
        <ErrorState
          title="Failed to load workflow"
          message={loadError?.message}
          onRetry={refetch}
        />
      )}
      {workflow && (
        <WorkflowForm
          isEdit
          initial={{
            name: workflow.name,
            description: workflow.description,
            trigger: workflow.trigger,
            conditions: workflow.conditions,
            conditionLogic: workflow.conditionLogic,
            actions: workflow.actions,
            isActive: workflow.isActive,
            priority: workflow.priority,
            maxExecutionsPerDay: workflow.maxExecutionsPerDay,
          }}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/workflows')}
          submitting={update.isPending}
          error={error}
        />
      )}
    </div>
  );
}
