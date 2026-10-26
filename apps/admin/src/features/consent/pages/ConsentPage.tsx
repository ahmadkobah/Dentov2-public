/**
 * ConsentPage — Consent Templates (CRUD) + Signed Forms (list).
 *
 * Per ADMIN_PORTAL_SCREENS.md §24 Consent Forms:
 * - Two-tab layout: Templates | Signed Forms
 * - Templates: DataTable with create/edit/deactivate
 * - Signed Forms: Read-only list with view/print actions
 *
 * Route: /consent (sidebar-config.ts already registered)
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Button,
  Badge,
  DataTable,
  PageHeader,
  Input,
  EmptyState,
  ConfirmDialog,
  type ColumnDef,
} from '@dento/ui';
import { Plus, Search, Pencil, Trash2, Eye, Printer, FileSignature } from 'lucide-react';
import { useThemeStore } from '@/stores/theme.store.js';
import {
  useConsentTemplateList,
  useCreateConsentTemplate,
  useUpdateConsentTemplate,
  useDeleteConsentTemplate,
  useConsentFormList,
} from '../hooks/useConsent.js';
import type {
  ConsentTemplate,
  ConsentForm,
  CreateConsentTemplateInput,
  ConsentTemplateFilters,
  ConsentFormFilters,
} from '../hooks/useConsent.js';
import { ConsentTemplateForm } from '../components/ConsentTemplateForm.js';
import { SignConsentFormModal } from '../components/SignConsentFormModal.js';
import { ViewConsentFormModal } from '../components/ViewConsentFormModal.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate, formatDateTime } from '@/lib/date.js';

type Tab = 'templates' | 'forms';

export interface ConsentPageProps {
  patientId?: string;
}

export default function ConsentPage({ patientId }: ConsentPageProps = {}) {
  const { t } = useTranslation();
  const locale = useThemeStore((s) => s.locale);
  const lang = locale === 'ar' ? 'ar' : 'en';
  const [activeTab, setActiveTab] = useState<Tab>(patientId ? 'forms' : 'templates');

  return (
    <div className="space-y-6">
      <PageHeader title={t('consent.title')} description={t('consent.subtitle')} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          {t('consent.tab.templates')}
        </button>
        <button
          onClick={() => setActiveTab('forms')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'forms'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          {t('consent.tab.signedForms')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' ? (
        <TemplatesTab lang={lang} />
      ) : (
        <FormsTab patientId={patientId} />
      )}
    </div>
  );
}

// ── Templates Tab ──────────────────────────────────────────

function TemplatesTab({ lang }: { lang: 'en' | 'ar' }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ConsentTemplateFilters>({ page: 1, limit: 20 });
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<ConsentTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConsentTemplate | null>(null);

  const queryFilters = useMemo(
    () => ({ ...filters, search: search || undefined }),
    [filters, search],
  );

  const { data, isLoading, isError } = useConsentTemplateList(queryFilters);
  const createMutation = useCreateConsentTemplate();
  const updateMutation = useUpdateConsentTemplate(editTarget?._id ?? '');
  const deleteMutation = useDeleteConsentTemplate();

  const handleCreate = useCallback(() => {
    setEditTarget(null);
    setShowDialog(true);
  }, []);

  const handleEdit = useCallback((t: ConsentTemplate) => {
    setEditTarget(t);
    setShowDialog(true);
  }, []);

  const handleSubmit = useCallback(
    (formData: CreateConsentTemplateInput) => {
      if (editTarget) {
        updateMutation.mutate(formData, {
          onSuccess: () => setShowDialog(false),
        });
      } else {
        createMutation.mutate(formData, {
          onSuccess: () => setShowDialog(false),
        });
      }
    },
    [editTarget, createMutation, updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

  const columns: ColumnDef<ConsentTemplate>[] = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('consent.templates.col.name'),
        cell: (_v: unknown, row: ConsentTemplate) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.name[lang] || row.name.en}</span>
            {row.isDefault && (
              <Badge variant="outline" className="text-xs">
                {t('consent.templates.badge.default')}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'procedureType',
        accessorKey: 'procedureType',
        header: t('consent.templates.col.procedureType'),
        cell: (_v: unknown, row: ConsentTemplate) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.procedureType}
          </Badge>
        ),
      },
      {
        id: 'isActive',
        accessorKey: 'isActive',
        header: t('consent.templates.col.status'),
        cell: (_v: unknown, row: ConsentTemplate) => (
          <Badge variant={row.isActive ? 'default' : 'secondary'}>
            {row.isActive
              ? t('consent.templates.badge.active')
              : t('consent.templates.badge.inactive')}
          </Badge>
        ),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('consent.templates.col.created'),
        cell: (_v: unknown, row: ConsentTemplate) => formatDate(row.createdAt),
      },
      {
        id: 'actions',
        header: '',
        cell: (_v: unknown, row: ConsentTemplate) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEdit(row)}
              aria-label="Edit template"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {!row.isDefault && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-error-600 hover:text-error-700"
                onClick={() => setDeleteTarget(row)}
                aria-label="Delete template"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [lang, handleEdit],
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('consent.templates.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="me-2 h-4 w-4" />
          {t('consent.templates.newBtn')}
        </Button>
      </div>

      {/* Table */}
      {isError ? (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-8 text-center text-sm text-error-600 dark:border-error-800 dark:bg-error-950 dark:text-error-400">
          {t('consent.templates.error.load')}. Please try again.
        </div>
      ) : data && data.items.length > 0 ? (
        <DataTable
          columns={columns}
          data={data.items}
          isLoading={isLoading}
          totalItems={data.meta.total}
          currentPage={data.meta.page}
          pageSize={data.meta.limit}
          onPageChange={(page) => setFilters((p) => ({ ...p, page }))}
        />
      ) : !isLoading ? (
        <EmptyState
          icon={<FileSignature className="h-6 w-6" />}
          title={t('consent.templates.empty.title')}
          description={t('consent.templates.empty.desc')}
          action={{ label: 'New Template', onClick: handleCreate }}
        />
      ) : null}

      {/* Create/Edit Dialog */}
      <ConsentTemplateForm
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        template={editTarget}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('consent.templates.confirm.deactivateTitle')}
        description={`Are you sure you want to deactivate "${
          deleteTarget?.name[lang] || deleteTarget?.name.en || ''
        }"? It will no longer be available for new consent forms.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}

// ── Signed Forms Tab ───────────────────────────────────────

function FormsTab({ patientId }: { patientId?: string }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ConsentFormFilters>({
    page: 1,
    limit: 20,
    ...(patientId ? { patientId } : {}),
  });
  const [search, setSearch] = useState('');
  const [showSign, setShowSign] = useState(false);
  const [viewForm, setViewForm] = useState<ConsentForm | null>(null);
  const effectiveFilters = useMemo(
    () => ({ ...filters, search: search || undefined }),
    [filters, search],
  );
  const { data, isLoading, isError } = useConsentFormList(effectiveFilters);

  const columns: ColumnDef<ConsentForm>[] = useMemo(
    () => [
      {
        id: 'template',
        accessorKey: 'templateId',
        header: t('consent.forms.col.template'),
        cell: (_v: unknown, row: ConsentForm) => (
          <span className="font-medium">{row.template?.name?.en ?? row.templateId}</span>
        ),
      },
      {
        id: 'patient',
        accessorKey: 'patientId',
        header: t('consent.forms.col.patient'),
        cell: (_v: unknown, row: ConsentForm) =>
          row.patient ? `${row.patient.firstName.en} ${row.patient.lastName.en}` : row.patientId,
      },
      {
        id: 'doctor',
        accessorKey: 'doctorId',
        header: t('consent.forms.col.doctor'),
        cell: (_v: unknown, row: ConsentForm) =>
          row.doctor ? `${row.doctor.firstName} ${row.doctor.lastName}` : row.doctorId,
      },
      {
        id: 'signedAt',
        accessorKey: 'signedAt',
        header: t('consent.forms.col.signedAt'),
        cell: (_v: unknown, row: ConsentForm) => formatDateTime(row.signedAt),
      },
      {
        id: 'signature',
        header: t('consent.forms.col.signature'),
        cell: (_v: unknown, row: ConsentForm) => (
          <Badge variant={row.patientSignature ? 'default' : 'secondary'}>
            {row.patientSignature
              ? t('consent.forms.badge.signed')
              : t('consent.forms.badge.pending')}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: (_v: unknown, row: ConsentForm) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="View"
              aria-label="View form"
              onClick={() => setViewForm(row)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Print"
              aria-label="Print form"
              onClick={() => setViewForm(row)}
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {!patientId ? (
          <div className="relative max-w-xs flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('consent.forms.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFilters((p) => ({ ...p, page: 1 }));
              }}
              className="ps-9"
            />
          </div>
        ) : (
          <div />
        )}
        <Button onClick={() => setShowSign(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('consent.forms.signBtn')}
        </Button>
      </div>

      {isError ? (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-8 text-center text-sm text-error-600 dark:border-error-800 dark:bg-error-950 dark:text-error-400">
          {t('consent.forms.error.load')}. Please try again.
        </div>
      ) : data && data.items.length > 0 ? (
        <DataTable
          columns={columns}
          data={data.items}
          isLoading={isLoading}
          totalItems={data.meta.total}
          currentPage={data.meta.page}
          pageSize={data.meta.limit}
          onPageChange={(page) => setFilters((p) => ({ ...p, page }))}
        />
      ) : !isLoading ? (
        <EmptyState
          icon={<FileSignature className="h-6 w-6" />}
          title={t('consent.forms.empty.title')}
          description={t('consent.forms.empty.desc')}
          action={{ label: 'Sign Consent Form', onClick: () => setShowSign(true) }}
        />
      ) : null}

      <SignConsentFormModal open={showSign} onClose={() => setShowSign(false)} />
      <ViewConsentFormModal open={!!viewForm} onClose={() => setViewForm(null)} form={viewForm} />
    </>
  );
}
