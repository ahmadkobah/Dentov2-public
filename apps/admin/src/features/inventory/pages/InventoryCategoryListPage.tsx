/**
 * InventoryCategoryListPage — Tree / flat list of categories with inline create/edit.
 */

import { useState } from 'react';
import {
  PageHeader,
  Button,
  Input,
  Label,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  ConfirmDialog,
  toast,
  Badge,
  EmptyState,
} from '@dento/ui';
import { Plus, Pencil, Trash2, Loader2, FolderTree, Search } from 'lucide-react';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  useInventoryCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type InventoryCategory,
} from '../hooks/useInventoryItems.js';
import { useTranslation } from '../../../stores/locale.store.js';

export default function InventoryCategoryListPage() {
  const { t } = useTranslation();
  const { isMultiLang } = useSupportedLanguages();
  const { data: categories, isLoading, isError, error, refetch } = useInventoryCategories();
  const createMutation = useCreateCategory();
  const [editId, setEditId] = useState<string | null>(null);
  const updateMutation = useUpdateCategory(editId || '');
  const deleteMutation = useDeleteCategory();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<InventoryCategory>>({});
  const [deleteTarget, setDeleteTarget] = useState<InventoryCategory | null>(null);
  const [search, setSearch] = useState('');

  const openCreate = () => {
    setEditId(null);
    setFormData({ isActive: true });
    setShowForm(true);
  };

  const openEdit = (cat: InventoryCategory) => {
    setEditId(cat._id);
    setFormData(cat);
    setShowForm(true);
  };

  const handleSave = () => {
    const mutation = editId ? updateMutation : createMutation;
    mutation.mutate(formData as any, {
      onSuccess: () => {
        toast.success(
          editId
            ? t('inventory.categories.toast.updated')
            : t('inventory.categories.toast.created'),
        );
        setShowForm(false);
      },
      onError: (err: any) =>
        toast.error(err?.message || t('inventory.categories.toast.saveFailed')),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, {
      onSuccess: () => {
        toast.success(t('inventory.categories.toast.deleted'));
        setDeleteTarget(null);
      },
      onError: (err: any) =>
        toast.error(err?.message || t('inventory.categories.toast.deleteFailed')),
    });
  };

  // Group categories by parent (with optional client-side name filter)
  const q = search.trim().toLowerCase();
  const matches = (c: InventoryCategory) =>
    c.name.en.toLowerCase().includes(q) || (c.name.ar ?? '').toLowerCase().includes(q);
  const childrenOf = (parentId: string) => categories?.filter((c) => c.parentId === parentId) || [];
  const visibleChildrenOf = (cat: InventoryCategory) =>
    q && !matches(cat) ? childrenOf(cat._id).filter(matches) : childrenOf(cat._id);
  const roots = (categories?.filter((c) => !c.parentId) || []).filter(
    (r) => !q || matches(r) || childrenOf(r._id).some(matches),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.categories.page.title')}
        description={t('inventory.categories.page.description')}
      >
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t('inventory.categories.actions.newCategory')}
        </Button>
      </PageHeader>

      {!!categories?.length && (
        <div className="relative w-full md:w-65">
          <Search className="text-muted-foreground absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('inventory.categories.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={refetch} />
      ) : !categories?.length ? (
        <EmptyState
          icon={<FolderTree className="h-7 w-7" />}
          title={t('inventory.categories.empty.title')}
          description={t('inventory.categories.empty.description')}
          action={{ label: t('inventory.categories.actions.addCategory'), onClick: openCreate }}
        />
      ) : (
        <div className="space-y-2">
          {roots
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((cat) => (
              <Card key={cat._id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderTree className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{cat.name.en}</span>
                      {isMultiLang && cat.name.ar && (
                        <span className="text-sm text-muted-foreground" dir="rtl">
                          {cat.name.ar}
                        </span>
                      )}
                      {!cat.isActive && (
                        <Badge variant="outline">{t('inventory.categories.status.inactive')}</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(cat)}
                        aria-label="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(cat)}
                        className="text-destructive"
                        aria-label="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Children */}
                  {visibleChildrenOf(cat).length > 0 && (
                    <div className="ms-8 mt-2 space-y-1">
                      {visibleChildrenOf(cat)
                        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                        .map((child) => (
                          <div
                            key={child._id}
                            className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted/50"
                          >
                            <span className="text-sm">{child.name.en}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(child)}
                                aria-label="Edit subcategory"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(child)}
                                className="text-destructive"
                                aria-label="Delete subcategory"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editId
                ? t('inventory.categories.dialog.editTitle')
                : t('inventory.categories.dialog.newTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t('inventory.categories.labels.nameEn')}</Label>
              <Input
                value={formData.name?.en || ''}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    name: { ...f.name, en: e.target.value, ar: f.name?.ar },
                  }))
                }
              />
            </div>
            {isMultiLang && (
              <div className="space-y-1">
                <Label>{t('inventory.categories.labels.nameAr')}</Label>
                <Input
                  dir="rtl"
                  value={formData.name?.ar || ''}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      name: { ...f.name, en: f.name?.en || '', ar: e.target.value },
                    }))
                  }
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>{t('inventory.categories.labels.sortOrder')}</Label>
              <Input
                type="number"
                value={formData.sortOrder ?? 0}
                onChange={(e) => setFormData((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData((f) => ({ ...f, isActive: e.target.checked }))}
                className="accent-primary"
              />
              {t('inventory.categories.labels.active')}
            </label>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editId
                ? t('inventory.categories.formActions.save')
                : t('inventory.categories.formActions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('inventory.categories.dialog.deleteTitle')}
        description={`Delete "${deleteTarget?.name.en}"? Items in this category will become uncategorized.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
