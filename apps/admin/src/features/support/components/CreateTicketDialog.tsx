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
import { useTranslation } from '@/stores/locale.store.js';
import { useCreateTicket, type TicketCategory, type TicketPriority } from '../hooks/useSupport.js';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'bug', label: 'support.create.categories.bug' },
  { value: 'feature', label: 'support.create.categories.featureRequest' },
  { value: 'billing', label: 'support.create.categories.billing' },
  { value: 'access', label: 'support.create.categories.accessIssue' },
  { value: 'other', label: 'support.create.categories.other' },
];

const PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  {
    value: 'low',
    label: 'support.priority.low',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  {
    value: 'medium',
    label: 'support.priority.medium',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'high',
    label: 'support.priority.high',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  {
    value: 'urgent',
    label: 'support.priority.urgent',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
];

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('bug');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [linkedModule, setLinkedModule] = useState('');
  const [tags, setTags] = useState('');

  const createTicket = useCreateTicket();

  function reset() {
    setSubject('');
    setDescription('');
    setCategory('bug');
    setPriority('medium');
    setLinkedModule('');
    setTags('');
  }

  async function handleCreate() {
    if (!subject.trim() || description.trim().length < 10) return;

    try {
      await createTicket.mutateAsync({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        linkedModule: linkedModule.trim() || null,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      reset();
      onOpenChange(false);
    } catch {
      // toast handled by hook
    }
  }

  const isValid = subject.trim().length >= 3 && description.trim().length >= 10;

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
          <DialogTitle>{t('support.create.title')}</DialogTitle>
          <DialogDescription>{t('support.create.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">{t('support.create.subjectLabel')}</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('support.create.subjectPlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-desc">{t('support.create.descriptionLabel')}</Label>
            <Textarea
              id="ticket-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('support.create.descriptionPlaceholder')}
              rows={4}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>{t('support.create.categoryLabel')}</Label>
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
                  {t(c.label)}
                </Button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>{t('support.create.priorityLabel')}</Label>
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
                  {t(p.label)}
                </Button>
              ))}
            </div>
          </div>

          {/* Linked Module */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-module">{t('support.create.linkedModule')}</Label>
            <Input
              id="ticket-module"
              value={linkedModule}
              onChange={(e) => setLinkedModule(e.target.value)}
              placeholder={t('support.create.linkedModulePlaceholder')}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-tags">{t('support.create.tags')}</Label>
            <Input
              id="ticket-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. urgent, login"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('support.create.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={!isValid || createTicket.isPending}>
            {createTicket.isPending
              ? t('support.create.creating')
              : t('support.create.createTicket')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
