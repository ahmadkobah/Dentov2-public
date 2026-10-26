/**
 * WorkflowForm — shared editor for create/edit workflow pages.
 * Phase 5.2
 */

import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@dento/ui';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import type {
  CreateWorkflowInput,
  WorkflowAction,
  WorkflowActionType,
  WorkflowCondition,
  WorkflowTrigger,
} from '../hooks/useWorkflows.js';

const TRIGGERS: WorkflowTrigger[] = [
  'appointment.created',
  'appointment.confirmed',
  'appointment.completed',
  'appointment.cancelled',
  'appointment.no_show',
  'patient.created',
  'patient.updated',
  'invoice.created',
  'invoice.overdue',
  'payment.received',
  'treatment_plan.accepted',
  'lab_order.delivered',
  'inventory.low_stock',
  'inventory.expiring',
  'schedule.slot_available',
  'custom',
];

const ACTION_TYPES: WorkflowActionType[] = [
  'send_notification',
  'send_email',
  'send_sms',
  'send_whatsapp',
  'update_status',
  'create_task',
  'trigger_webhook',
  'schedule_followup',
  'log_event',
];

const OPERATORS: WorkflowCondition['operator'][] = [
  'equals',
  'not_equals',
  'contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'exists',
  'not_exists',
];

export interface WorkflowFormProps {
  initial?: Partial<CreateWorkflowInput>;
  isEdit?: boolean; // hides trigger field
  submitting?: boolean;
  error?: string | null;
  onSubmit: (data: CreateWorkflowInput) => void;
  onCancel: () => void;
}

export function WorkflowForm({
  initial,
  isEdit,
  submitting,
  error,
  onSubmit,
  onCancel,
}: WorkflowFormProps) {
  const [nameEn, setNameEn] = useState(initial?.name?.en ?? '');
  const [nameAr, setNameAr] = useState(initial?.name?.ar ?? '');
  const [descEn, setDescEn] = useState(initial?.description?.en ?? '');
  const [trigger, setTrigger] = useState<WorkflowTrigger>(
    initial?.trigger ?? 'appointment.created',
  );
  const [conditions, setConditions] = useState<WorkflowCondition[]>(initial?.conditions ?? []);
  const [conditionLogic, setConditionLogic] = useState<'all' | 'any'>(
    initial?.conditionLogic ?? 'all',
  );
  const [actions, setActions] = useState<WorkflowAction[]>(
    initial?.actions ?? [{ type: 'send_notification', config: {}, delayMinutes: 0 }],
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [priority, setPriority] = useState(initial?.priority ?? 50);
  const [maxPerDay, setMaxPerDay] = useState(initial?.maxExecutionsPerDay ?? 0);
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    if (!nameEn.trim()) {
      setLocalError('Name (English) is required.');
      return;
    }
    if (actions.length === 0) {
      setLocalError('At least one action is required.');
      return;
    }
    setLocalError(null);

    onSubmit({
      name: { en: nameEn.trim(), ar: nameAr.trim() || undefined },
      description: descEn.trim() ? { en: descEn.trim() } : undefined,
      trigger,
      conditions,
      conditionLogic,
      actions: actions.map((a) => ({
        ...a,
        delayMinutes: Number(a.delayMinutes) || 0,
      })),
      isActive,
      priority: Number(priority) || 50,
      maxExecutionsPerDay: Number(maxPerDay) || 0,
    });
  }

  return (
    <div className="space-y-6">
      {/* Basic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wf-name-en">Name (EN)</Label>
              <Input
                id="wf-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="wf-name-ar">Name (AR)</Label>
              <Input
                id="wf-name-ar"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="wf-desc">Description</Label>
            <Input
              id="wf-desc"
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Trigger</Label>
              <Select
                value={trigger}
                onValueChange={(v) => setTrigger(v as WorkflowTrigger)}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEdit && (
                <p className="mt-1 text-xs text-muted-foreground">Trigger cannot be changed.</p>
              )}
            </div>
            <div>
              <Label htmlFor="wf-priority">Priority (1-100)</Label>
              <Input
                id="wf-priority"
                type="number"
                min={1}
                max={100}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) || 50)}
              />
            </div>
            <div>
              <Label htmlFor="wf-max">Max executions/day (0 = unlimited)</Label>
              <Input
                id="wf-max"
                type="number"
                min={0}
                max={10000}
                value={maxPerDay}
                onChange={(e) => setMaxPerDay(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Conditions</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="wf-logic" className="text-xs">
              Combine with
            </Label>
            <Select
              value={conditionLogic}
              onValueChange={(v) => setConditionLogic(v as 'all' | 'any')}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL (AND)</SelectItem>
                <SelectItem value="any">ANY (OR)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setConditions([...conditions, { field: '', operator: 'equals', value: '' }])
              }
            >
              <Plus className="me-1 h-3 w-3" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {conditions.length === 0 && (
            <p className="text-sm text-muted-foreground">No conditions — workflow always runs.</p>
          )}
          {conditions.map((c, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-4">
                <Label className="text-xs">Field</Label>
                <Input
                  value={c.field}
                  placeholder="e.g. patient.priority"
                  onChange={(e) => {
                    const copy = [...conditions];
                    copy[idx] = { ...c, field: e.target.value };
                    setConditions(copy);
                  }}
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Operator</Label>
                <Select
                  value={c.operator}
                  onValueChange={(v) => {
                    const copy = [...conditions];
                    copy[idx] = { ...c, operator: v as WorkflowCondition['operator'] };
                    setConditions(copy);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Label className="text-xs">Value</Label>
                <Input
                  value={typeof c.value === 'string' ? c.value : JSON.stringify(c.value)}
                  onChange={(e) => {
                    const copy = [...conditions];
                    copy[idx] = { ...c, value: e.target.value };
                    setConditions(copy);
                  }}
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Actions</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setActions([...actions, { type: 'send_notification', config: {}, delayMinutes: 0 }])
            }
          >
            <Plus className="me-1 h-3 w-3" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.map((a, idx) => (
            <div key={idx} className="rounded border p-3">
              <div className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-4">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={a.type}
                    onValueChange={(v) => {
                      const copy = [...actions];
                      copy[idx] = { ...a, type: v as WorkflowActionType };
                      setActions(copy);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Delay (minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={43200}
                    value={a.delayMinutes}
                    onChange={(e) => {
                      const copy = [...actions];
                      copy[idx] = { ...a, delayMinutes: Number(e.target.value) || 0 };
                      setActions(copy);
                    }}
                  />
                </div>
                <div className="col-span-4">
                  <Badge variant="secondary" className="capitalize">
                    {a.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="col-span-1 text-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                    disabled={actions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-xs">Config (JSON)</Label>
                <textarea
                  className="w-full rounded border px-2 py-1 font-mono text-xs"
                  rows={3}
                  value={JSON.stringify(a.config, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value || '{}');
                      const copy = [...actions];
                      copy[idx] = { ...a, config: parsed };
                      setActions(copy);
                    } catch {
                      // ignore parse errors while typing
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {(localError || error) && (
        <div className="flex items-center gap-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {localError || error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create workflow'}
        </Button>
      </div>
    </div>
  );
}
