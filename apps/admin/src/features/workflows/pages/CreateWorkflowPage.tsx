/**
 * CreateWorkflowPage — Phase 5.2
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@dento/ui';
import { ArrowLeft } from 'lucide-react';
import { WorkflowForm } from '../components/WorkflowForm.js';
import { useCreateWorkflow, type CreateWorkflowInput } from '../hooks/useWorkflows.js';

export default function CreateWorkflowPage() {
  const navigate = useNavigate();
  const create = useCreateWorkflow();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreateWorkflowInput) {
    setError(null);
    try {
      await create.mutateAsync(data);
      toast.success('Workflow created');
      navigate('/workflows');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create workflow';
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
        <h1 className="text-2xl font-bold">New workflow</h1>
      </div>
      <WorkflowForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/workflows')}
        submitting={create.isPending}
        error={error}
      />
    </div>
  );
}
