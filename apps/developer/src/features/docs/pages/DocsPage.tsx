import { useState, useMemo, useRef } from 'react';
import {
  PageHeader,
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@dento/ui';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  BookOpen,
  Settings,
  Upload,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from '@dento/ui';
import {
  usePlatformDocs,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
  type PlatformDoc,
  type CreateDocInput,
} from '../hooks/useDocs.js';
import { useBranding, useUpdateBranding } from '../../settings/hooks/useSystemSettings.js';
import { useBrandingUpload } from '../../settings/hooks/useBrandingUpload.js';

// ── Helpers ─────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Default Form State ──────────────────────────────────────

const defaultForm: CreateDocInput = {
  title: '',
  slug: '',
  content: '',
  category: 'General',
  order: 0,
  isPublished: false,
};

// ── Component ───────────────────────────────────────────────

export default function DocsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<PlatformDoc | null>(null);
  const [form, setForm] = useState<CreateDocInput>(defaultForm);
  const [autoSlug, setAutoSlug] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<PlatformDoc | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [configForm, setConfigForm] = useState({
    headerLogo: '',
    headerTitle: '',
    footerSupportEmail: '',
    footerSupportPhone: '',
    footerCopyrightText: '',
    footerPlatformVersion: '',
  });

  const { data: branding } = useBranding();
  const updateBranding = useUpdateBranding();
  const { upload: uploadLogo, isUploading: isLogoUploading } = useBrandingUpload();
  const { data, isLoading } = usePlatformDocs();
  const createDoc = useCreateDoc();
  const updateDoc = useUpdateDoc();
  const deleteDoc = useDeleteDoc();

  const docs = useMemo(() => data?.docs ?? [], [data]);

  // ── Derived ───────────────────────────────────────────
  const categories = useMemo(() => [...new Set(docs.map((d) => d.category))].sort(), [docs]);

  const filtered = useMemo(() => {
    let result = docs;
    if (categoryFilter) result = result.filter((d) => d.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.slug.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q),
      );
    }
    return result;
  }, [docs, categoryFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlatformDoc[]>();
    for (const doc of filtered) {
      const list = map.get(doc.category) || [];
      list.push(doc);
      map.set(doc.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // ── Handlers ──────────────────────────────────────────

  function openCreate() {
    setEditingDoc(null);
    setForm(defaultForm);
    setAutoSlug(true);
    setDialogOpen(true);
  }

  function openCreateForCategory(category: string) {
    setEditingDoc(null);
    setForm({ ...defaultForm, category });
    setAutoSlug(true);
    setDialogOpen(true);
  }

  async function handleTogglePublish(doc: PlatformDoc) {
    await updateDoc.mutateAsync({ id: doc._id, isPublished: !doc.isPublished });
    toast.success(doc.isPublished ? 'Article unpublished' : 'Article published');
  }

  function openEdit(doc: PlatformDoc) {
    setEditingDoc(doc);
    setForm({
      title: doc.title,
      slug: doc.slug,
      content: doc.content,
      category: doc.category,
      order: doc.order,
      isPublished: doc.isPublished,
    });
    setAutoSlug(false);
    setDialogOpen(true);
  }

  function handleTitleChange(title: string) {
    setForm((prev) => ({
      ...prev,
      title,
      ...(autoSlug ? { slug: slugify(title) } : {}),
    }));
  }

  async function handleSave() {
    if (editingDoc) {
      await updateDoc.mutateAsync({ id: editingDoc._id, ...form });
    } else {
      await createDoc.mutateAsync(form);
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    await deleteDoc.mutateAsync(id);
    setDeleteConfirm(null);
  }

  function openConfig() {
    const cfg = branding?.docsConfig;
    setConfigForm({
      headerLogo: cfg?.headerLogo ?? branding?.logoUrl ?? '',
      headerTitle: cfg?.headerTitle ?? `${branding?.platformName || 'Dento'} Docs`,
      footerSupportEmail: cfg?.footerSupportEmail ?? '',
      footerSupportPhone: cfg?.footerSupportPhone ?? '',
      footerCopyrightText: cfg?.footerCopyrightText ?? '',
      footerPlatformVersion: cfg?.footerPlatformVersion ?? '',
    });
    setLogoPreview('');
    setConfigOpen(true);
  }

  async function handleLogoFile(file: File) {
    try {
      const result = await uploadLogo(file);
      setConfigForm((p) => ({ ...p, headerLogo: result.key }));
      setLogoPreview(result.url);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  async function handleSaveConfig() {
    await updateBranding.mutateAsync({ docsConfig: configForm });
    setConfigOpen(false);
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Branding Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white overflow-hidden">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.platformName || 'Dento'}
              className="h-full w-full object-contain"
            />
          ) : (
            <BookOpen className="h-5 w-5" />
          )}
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {branding?.platformName || 'Dento'}
          </span>
          <span className="ml-1 text-xs text-gray-400">Docs</span>
        </div>
      </div>

      <PageHeader
        title="Documentation"
        description="Manage help articles and guides visible to all tenants"
      >
        <Button variant="outline" onClick={openConfig}>
          <Settings className="mr-2 h-4 w-4" /> Template Settings
        </Button>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Article
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-50 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>{docs.length} total articles</span>
        <span>·</span>
        <span>{docs.filter((d) => d.isPublished).length} published</span>
        <span>·</span>
        <span>{categories.length} categories</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : grouped.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                    No articles found
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map(([category, catDocs]) => (
                  <>
                    {/* Category Header */}
                    <TableRow key={`cat-${category}`} className="bg-gray-50 dark:bg-gray-800/50">
                      <TableCell colSpan={5} className="py-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {category}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {catDocs.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCreateForCategory(category)}
                          className="text-primary"
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add
                        </Button>
                      </TableCell>
                    </TableRow>
                    {/* Docs in category */}
                    {catDocs.map((doc) => (
                      <TableRow key={doc._id} className="group">
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.category}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {doc.slug}
                        </TableCell>
                        <TableCell>
                          {doc.isPublished ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <Eye className="mr-1 h-3 w-3" /> Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <EyeOff className="mr-1 h-3 w-3" /> Draft
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {timeAgo(doc.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Preview"
                              onClick={() => setViewingDoc(doc)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={doc.isPublished ? 'Unpublish' : 'Publish'}
                              onClick={() => handleTogglePublish(doc)}
                            >
                              {doc.isPublished ? (
                                <EyeOff className="h-4 w-4 text-amber-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit"
                              onClick={() => openEdit(doc)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => setDeleteConfirm(doc._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Edit Article' : 'New Article'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Getting Started with Dento"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="mb-1 block text-sm font-medium">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setForm((p) => ({ ...p, slug: e.target.value }));
                }}
                placeholder="getting-started"
                className="font-mono text-sm"
              />
            </div>

            {/* Category + Order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="General"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Order</label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="mb-1 block text-sm font-medium">Content (Markdown)</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Write your documentation here using Markdown..."
                rows={16}
                className="font-mono text-sm"
              />
            </div>

            {/* Published toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              Publish immediately (visible to all tenants)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.title ||
                !form.slug ||
                !form.content ||
                createDoc.isPending ||
                updateDoc.isPending
              }
            >
              {createDoc.isPending || updateDoc.isPending
                ? 'Saving...'
                : editingDoc
                  ? 'Update'
                  : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This will permanently delete this article. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleteDoc.isPending}
            >
              {deleteDoc.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingDoc?.title}
              {viewingDoc?.isPublished ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Published
                </Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 text-xs text-gray-500">
            <span>
              Category: <strong>{viewingDoc?.category}</strong>
            </span>
            <span>
              Slug:{' '}
              <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{viewingDoc?.slug}</code>
            </span>
            <span>Order: {viewingDoc?.order}</span>
          </div>
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
            {viewingDoc?.content}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDoc(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewingDoc) openEdit(viewingDoc);
                setViewingDoc(null);
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Settings Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Docs Template Settings</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">
            Configure how the documentation page looks for tenants in the admin portal.
          </p>

          <div className="space-y-4 py-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Header</h4>
            <div>
              <label className="mb-1 block text-sm font-medium">Logo</label>
              <div
                className="relative flex items-center gap-4 rounded-lg border-2 border-dashed border-gray-200 p-4 transition-colors hover:border-brand-300 dark:border-gray-700 dark:hover:border-brand-600"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) void handleLogoFile(file);
                }}
              >
                {logoPreview || configForm.headerLogo ? (
                  <div className="relative">
                    <img
                      src={logoPreview || configForm.headerLogo}
                      alt="Docs logo preview"
                      className="h-14 w-14 rounded-lg border object-contain bg-white dark:bg-gray-900 dark:border-gray-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                        (e.target as HTMLImageElement).alt = 'Invalid image';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setConfigForm((p) => ({ ...p, headerLogo: '' }));
                        setLogoPreview('');
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white shadow-sm hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <Upload className="h-5 w-5 text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLogoUploading}
                      onClick={() => logoFileRef.current?.click()}
                    >
                      {isLogoUploading ? (
                        <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="me-1.5 h-3.5 w-3.5" />
                      )}
                      {isLogoUploading ? 'Uploading…' : 'Upload Logo'}
                    </Button>
                    <span className="text-xs text-gray-400">or drag & drop</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    PNG, JPG, WebP, SVG — max 5 MB. Leave empty to use platform logo.
                  </p>
                </div>

                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Header Title</label>
              <Input
                value={configForm.headerTitle}
                onChange={(e) => setConfigForm((p) => ({ ...p, headerTitle: e.target.value }))}
                placeholder="Dento Docs"
              />
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Footer</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Support Email</label>
                <Input
                  value={configForm.footerSupportEmail}
                  onChange={(e) =>
                    setConfigForm((p) => ({ ...p, footerSupportEmail: e.target.value }))
                  }
                  placeholder="support@dento.app"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Support Phone</label>
                <Input
                  value={configForm.footerSupportPhone}
                  onChange={(e) =>
                    setConfigForm((p) => ({ ...p, footerSupportPhone: e.target.value }))
                  }
                  placeholder="+966 ..."
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Copyright Text</label>
              <Input
                value={configForm.footerCopyrightText}
                onChange={(e) =>
                  setConfigForm((p) => ({ ...p, footerCopyrightText: e.target.value }))
                }
                placeholder="© 2026 Dento. All rights reserved."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Platform Version</label>
              <Input
                value={configForm.footerPlatformVersion}
                onChange={(e) =>
                  setConfigForm((p) => ({ ...p, footerPlatformVersion: e.target.value }))
                }
                placeholder="v2.0.0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={updateBranding.isPending}>
              {updateBranding.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
