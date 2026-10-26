import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
} from '@dento/ui';
import { useCreateTicket, type TicketCategory, type TicketPriority } from '../hooks/useSupport.js';
import { TenantCombobox } from './TenantCombobox.js';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'billing', label: 'Billing' },
  { value: 'access', label: 'Access Issue' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  {
    value: 'low',
    label: 'Low',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'high',
    label: 'High',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
];

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const [tenantId, setTenantId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('bug');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [linkedModule, setLinkedModule] = useState('');
  const [tags, setTags] = useState('');

  const createTicket = useCreateTicket();

  function reset() {
    setTenantId('');
    setSubject('');
    setDescription('');
    setCategory('bug');
    setPriority('medium');
    setLinkedModule('');
    setTags('');
  }

  async function handleCreate() {
    if (!tenantId.trim() || !subject.trim() || description.trim().length < 10) return;

    try {
      await createTicket.mutateAsync({
        tenantId: tenantId.trim(),
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        linkedModule: linkedModule.trim() || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      reset();
      onOpenChange(false);
    } catch {
      // toast handled by hook
    }
  }

  const isValid = tenantId.trim() && subject.trim().length >= 3 && description.trim().length >= 10;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Open a new ticket on behalf of a tenant. SLA timers start immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tenant */}
          <div className="space-y-1.5">
            <Label>Tenant *</Label>
            <TenantCombobox value={tenantId} onValueChange={setTenantId} mode="slug" />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">Subject * (min 3 chars)</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-desc">Description * (min 10 chars)</Label>
            <Textarea
              id="ticket-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the issue, steps to reproduce, etc."
              rows={4}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Button
                  key={c.value}
                  type="button"
                  variant={category === c.value ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setCategory(c.value)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={priority === p.value ? 'default' : 'outline'}
                  size="sm"
                  className={`text-xs ${priority === p.value ? '' : p.color}`}
                  onClick={() => setPriority(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Linked Module */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-module">Linked Module (optional)</Label>
            <Input
              id="ticket-module"
              value={linkedModule}
              onChange={(e) => setLinkedModule(e.target.value)}
              placeholder="e.g. dental_charting"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-tags">Tags (comma-separated, optional)</Label>
            <Input
              id="ticket-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. chart, save-error, urgent"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!isValid || createTicket.isPending}>
            {createTicket.isPending ? 'Creating…' : 'Create Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
