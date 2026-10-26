/**
 * Procedure Notes Page — list & manage procedure notes + templates.
 * Per DENTO_V2_MASTER_PLAN.md §12 — Procedure Notes Module
 * Per BUILD_RULES §8.1, §15.2 — Phase 3 Week 10.
 *
 * Features:
 * - Tabs: Notes / Templates
 * - DataTable per tab
 * - Search + filters
 * - Template CRUD
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useProcedureNoteList,
  useDeleteProcedureNote,
  useProcedureNoteTemplateList,
  useCreateProcedureNoteTemplate,
  useUpdateProcedureNoteTemplate,
  useDeleteProcedureNoteTemplate,
  type ProcedureNote,
  type ProcedureNoteTemplate,
} from '../hooks/useProcedureNotes.js';
import { ProcedureNoteTemplateForm } from '../components/ProcedureNoteTemplateForm.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import type { CreateProcedureNoteTemplateInput } from '@dento/shared';
import {
  PageHeader,
  Button,
  Badge,
  DataTable,
  type ColumnDef,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  ConfirmDialog,
  EmptyState,
  toast,
} from '@dento/ui';
import { FileText, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Component ───────────────────────────────────────────────

export interface ProcedureNotesPageProps {
  patientId?: string;
}

export default function ProcedureNotesPage({ patientId }: ProcedureNotesPageProps = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Notes state
  const [notePage, setNotePage] = useState(1);
  const [noteSearch, setNoteSearch] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // Template state
  const [tmplPage, setTmplPage] = useState(1);
  const [tmplSearch, setTmplSearch] = useState('');
  const [deleteTmplId, setDeleteTmplId] = useState<string | null>(null);
  const [showCreateTmplDialog, setShowCreateTmplDialog] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState<ProcedureNoteTemplate | null>(null);

  // Queries
  const noteQuery = useMemo(
    () => ({
      page: notePage,
      limit: 20,
      ...(noteSearch ? { search: noteSearch } : {}),
      ...(patientId ? { patientId } : {}),
    }),
    [notePage, noteSearch, patientId],
  );
  const tmplQuery = useMemo(
    () => ({ page: tmplPage, limit: 20, ...(tmplSearch ? { search: tmplSearch } : {}) }),
    [tmplPage, tmplSearch],
  );

  const {
    data: noteData,
    isLoading: notesLoading,
    isError: notesError,
    error: notesErr,
  } = useProcedureNoteList(noteQuery);
  const {
    data: tmplData,
    isLoading: tmplLoading,
    isError: tmplError,
    error: tmplErr,
  } = useProcedureNoteTemplateList(tmplQuery);

  const deleteNoteMutation = useDeleteProcedureNote();
  const deleteTmplMutation = useDeleteProcedureNoteTemplate();
  const createTmplMutation = useCreateProcedureNoteTemplate();
  const updateTmplMutation = useUpdateProcedureNoteTemplate();

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;
    try {
      await deleteNoteMutation.mutateAsync(deleteNoteId);
      toast.success(t('procedureNotes.toast.noteDeleted'));
      setDeleteNoteId(null);
    } catch {
      toast.error(t('procedureNotes.toast.noteDeleteFailed'));
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTmplId) return;
    try {
      await deleteTmplMutation.mutateAsync(deleteTmplId);
      toast.success(t('procedureNotes.toast.templateDeleted'));
      setDeleteTmplId(null);
    } catch {
      toast.error(t('procedureNotes.toast.templateDeleteFailed'));
    }
  };

  const handleCreateTemplate = async (formData: CreateProcedureNoteTemplateInput) => {
    try {
      await createTmplMutation.mutateAsync(formData as Record<string, unknown>);
      setShowCreateTmplDialog(false);
      toast.success(t('procedureNotes.toast.templateCreated'));
    } catch {
      toast.error(t('procedureNotes.toast.templateCreateFailed'));
    }
  };

  const handleEditTemplate = async (formData: CreateProcedureNoteTemplateInput) => {
    if (!editingTmpl) return;
    try {
      await updateTmplMutation.mutateAsync({
        id: editingTmpl._id,
        data: formData as Record<string, unknown>,
      });
      setEditingTmpl(null);
      toast.success(t('procedureNotes.toast.templateUpdated'));
    } catch {
      toast.error(t('procedureNotes.toast.templateUpdateFailed'));
    }
  };

  // ── Note columns ──────────────────────────────────────────

  const noteColumns: ColumnDef<ProcedureNote>[] = useMemo(
    () => [
      {
        id: 'procedureName',
        accessorKey: 'procedureName' as const,
        header: t('procedureNotes.col.procedure'),
        cell: (value: unknown) => <span className="font-medium">{value as string}</span>,
      },
      {
        id: 'teethInvolved',
        accessorKey: 'teethInvolved' as const,
        header: t('procedureNotes.col.teeth'),
        cell: (value: unknown) => ((value as string) ? (value as string) : '\u2014'),
      },
      {
        id: 'followUpRequired',
        accessorKey: 'followUpRequired' as const,
        header: t('procedureNotes.col.followUp'),
        cell: (value: unknown) =>
          value ? (
            <Badge variant="default">{t('procedureNotes.badge.yes')}</Badge>
          ) : (
            <Badge variant="secondary">{t('procedureNotes.badge.no')}</Badge>
          ),
      },
      {
        id: 'materialsUsed',
        accessorKey: 'materialsUsed' as const,
        header: t('procedureNotes.col.materials'),
        cell: (value: unknown) => ((value as string) ? (value as string) : '\u2014'),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt' as const,
        header: t('procedureNotes.col.date'),
      },
      {
        id: 'actions',
        header: '',
        cell: (_: unknown, row: ProcedureNote) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/procedure-notes/${row._id}`)}
              aria-label={t('procedureNotes.action.viewNote')}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/procedure-notes/${row._id}/edit`)}
              aria-label={t('procedureNotes.action.editNote')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteNoteId(row._id)}
              aria-label={t('procedureNotes.action.deleteNote')}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  // ── Template columns ──────────────────────────────────────

  const tmplColumns: ColumnDef<ProcedureNoteTemplate>[] = useMemo(
    () => [
      {
        id: 'name',
        header: t('procedureNotes.template.col.name'),
        accessorFn: (row: ProcedureNoteTemplate) => row.name.en,
        cell: (_: unknown, row: ProcedureNoteTemplate) => (
          <div>
            <span className="font-medium">{row.name.en}</span>
            {row.name.ar && (
              <span className="ms-2 text-muted-foreground text-sm">({row.name.ar})</span>
            )}
          </div>
        ),
      },
      {
        id: 'procedureType',
        accessorKey: 'procedureType' as const,
        header: t('procedureNotes.template.col.type'),
        cell: (value: unknown) => <Badge variant="outline">{value as string}</Badge>,
      },
      {
        id: 'isActive',
        accessorKey: 'isActive' as const,
        header: t('procedureNotes.template.col.active'),
        cell: (value: unknown) =>
          value ? (
            <Badge variant="default">{t('procedureNotes.badge.active')}</Badge>
          ) : (
            <Badge variant="secondary">{t('procedureNotes.badge.inactive')}</Badge>
          ),
      },
      {
        id: 'sortOrder',
        accessorKey: 'sortOrder' as const,
        header: t('procedureNotes.template.col.order'),
      },
      {
        id: 'tmpl-actions',
        header: '',
        cell: (_: unknown, row: ProcedureNoteTemplate) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingTmpl(row)}
              aria-label={t('procedureNotes.action.editTemplate')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTmplId(row._id)}
              aria-label={t('procedureNotes.action.deleteTemplate')}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={t('procedureNotes.title')} description={t('procedureNotes.subtitle')}>
        <Button size="sm" onClick={() => navigate('/procedure-notes/new')}>
          <Plus className="me-2 h-4 w-4" />
          {t('procedureNotes.newNote')}
        </Button>
      </PageHeader>

      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">
            <FileText className="me-1 h-4 w-4" />
            {t('procedureNotes.tab.notes')} ({noteData?.pagination.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="templates">
            {t('procedureNotes.tab.templates')} ({tmplData?.pagination.total ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ── Notes Tab ── */}
        <TabsContent value="notes" className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder={t('procedureNotes.searchNotes')}
              value={noteSearch}
              onChange={(e) => {
                setNoteSearch(e.target.value);
                setNotePage(1);
              }}
              className="max-w-xs"
            />
          </div>

          {notesLoading ? (
            <TableSkeleton />
          ) : notesError ? (
            <ErrorState
              message={(notesErr as Error)?.message ?? t('procedureNotes.error.loadNotes')}
            />
          ) : (noteData?.notes.length ?? 0) === 0 ? (
            <EmptyState
              title={t('procedureNotes.empty.notes')}
              description={t('procedureNotes.empty.notesDesc')}
            />
          ) : (
            <DataTable columns={noteColumns} data={noteData?.notes ?? []} />
          )}

          {noteData?.pagination && noteData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={notePage <= 1}
                onClick={() => setNotePage((p) => p - 1)}
              >
                {t('procedureNotes.pagination.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {notePage} of {noteData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={notePage >= noteData.pagination.totalPages}
                onClick={() => setNotePage((p) => p + 1)}
              >
                {t('procedureNotes.pagination.next')}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder={t('procedureNotes.template.searchPlaceholder')}
              value={tmplSearch}
              onChange={(e) => {
                setTmplSearch(e.target.value);
                setTmplPage(1);
              }}
              className="max-w-xs"
            />
            <Button size="sm" variant="outline" onClick={() => setShowCreateTmplDialog(true)}>
              <Plus className="me-2 h-4 w-4" />
              {t('procedureNotes.template.new')}
            </Button>
          </div>

          {tmplLoading ? (
            <TableSkeleton />
          ) : tmplError ? (
            <ErrorState
              message={(tmplErr as Error)?.message ?? t('procedureNotes.error.loadTemplates')}
            />
          ) : (tmplData?.templates.length ?? 0) === 0 ? (
            <EmptyState
              title={t('procedureNotes.empty.templates')}
              description={t('procedureNotes.empty.templatesDesc')}
            />
          ) : (
            <DataTable columns={tmplColumns} data={tmplData?.templates ?? []} />
          )}

          {tmplData?.pagination && tmplData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={tmplPage <= 1}
                onClick={() => setTmplPage((p) => p - 1)}
              >
                {t('procedureNotes.pagination.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {tmplPage} of {tmplData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={tmplPage >= tmplData.pagination.totalPages}
                onClick={() => setTmplPage((p) => p + 1)}
              >
                {t('procedureNotes.pagination.next')}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Delete Note Confirm ── */}
      <ConfirmDialog
        open={!!deleteNoteId}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
        title={t('procedureNotes.confirm.deleteNoteTitle')}
        description={t('procedureNotes.confirm.deleteNoteDesc')}
        onConfirm={handleDeleteNote}
        variant="destructive"
      />

      {/* ── Delete Template Confirm ── */}
      <ConfirmDialog
        open={!!deleteTmplId}
        onOpenChange={(open) => !open && setDeleteTmplId(null)}
        title={t('procedureNotes.confirm.deleteTemplateTitle')}
        description={t('procedureNotes.confirm.deleteTemplateDesc')}
        onConfirm={handleDeleteTemplate}
        variant="destructive"
      />

      {/* ── Create Note Dialog ── removed — now uses full page at /procedure-notes/new */}

      {/* ── Create Template Dialog ── */}
      <Dialog open={showCreateTmplDialog} onOpenChange={setShowCreateTmplDialog}>
        <DialogContent className="max-w-lg">
          <ProcedureNoteTemplateForm
            onSubmit={handleCreateTemplate}
            isPending={createTmplMutation.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Template Dialog ── */}
      <Dialog open={!!editingTmpl} onOpenChange={(open) => !open && setEditingTmpl(null)}>
        <DialogContent className="max-w-lg">
          {editingTmpl && (
            <ProcedureNoteTemplateForm
              defaultValues={{
                name: editingTmpl.name,
                procedureType: editingTmpl.procedureType,
                templateContent: editingTmpl.templateContent,
                isActive: editingTmpl.isActive,
                sortOrder: editingTmpl.sortOrder,
              }}
              onSubmit={handleEditTemplate}
              isPending={updateTmplMutation.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
